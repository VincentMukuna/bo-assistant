import SupportConversation from "#models/support_conversation";
import syncRescheduleAttention from "#actions/sync-reschedule-attention";
import InboxAnnotation from "#models/inbox_annotation";
import { businessSupportAgent, type AgentStream } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";
import type Customer from "#models/customer";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

const PREVIEW_LENGTH = 280;

export function conversationPreview(value: string) {
  const plainText = value
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[*_`~>#]/g, "")
    .replace(/(^|\n)\s*[-+]\s+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.slice(0, PREVIEW_LENGTH).trimEnd();
}

async function claimFirstMessage(conversationId: string, message: string) {
  const now = DateTime.now().toSQL();
  const preview = conversationPreview(message);
  const claimed = await SupportConversation.query()
    .where("id", conversationId)
    .whereNull("firstMessageAt")
    .update({
      firstMessageAt: now,
      lastMessagePreview: preview,
      updatedAt: now,
    });
  const isFirstMessage = Number(claimed) > 0;

  if (!isFirstMessage) {
    await SupportConversation.query().where("id", conversationId).update({
      lastMessagePreview: preview,
      updatedAt: now,
    });
  }

  return isFirstMessage;
}

async function generateAndStoreTitle(
  conversation: SupportConversation,
  message: string,
  logger: HttpContext["logger"]
) {
  const title = await businessSupportAgent.generateConversationTitle(message);
  if (!title) return;

  await SupportConversation.query().where("id", conversation.id).update({ title });
  void businessSupportAgent.updateThreadTitle(conversation, title).catch((error) => {
    logger.warn(
      { err: error, conversationId: conversation.id },
      "Unable to synchronize conversation title"
    );
  });
}

async function textFromAgentStream(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  let text = "";

  function consumeEvent(event: string) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;

    try {
      const chunk = JSON.parse(data) as { type?: unknown; payload?: unknown };
      if (
        chunk.type === "text-delta" &&
        chunk.payload &&
        typeof chunk.payload === "object" &&
        "text" in chunk.payload &&
        typeof chunk.payload.text === "string"
      ) {
        text += chunk.payload.text;
      }
    } catch {
      // Ignore non-JSON SSE events; the client still receives the original stream.
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const events = buffered.split(/\r?\n\r?\n/);
      buffered = events.pop() ?? "";
      events.forEach(consumeEvent);
    }
    buffered += decoder.decode();
    if (buffered) consumeEvent(buffered);
    return text;
  } finally {
    reader.releaseLock();
  }
}

export function trackConversationStream(
  agentStream: AgentStream,
  conversationId: string,
  tasks: Promise<unknown>[],
  logger: HttpContext["logger"],
  afterCompletion?: () => Promise<unknown>
): AgentStream {
  const [clientBody, observerBody] = agentStream.body.tee();
  const observedText = textFromAgentStream(observerBody);
  const previewTask = observedText.then(async (text) => {
    const preview = conversationPreview(text);
    if (!preview) return;
    await SupportConversation.query().where("id", conversationId).update({
      lastMessagePreview: preview,
    });
  });
  const afterCompletionTask = observedText.then(() => afterCompletion?.());

  const backgroundCompletion = Promise.allSettled([
    previewTask,
    ...tasks,
    afterCompletionTask,
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn(
          { err: result.reason, conversationId },
          "Unable to finish conversation background work"
        );
      }
    }
  });

  return {
    ...agentStream,
    body: clientBody.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          controller.enqueue(chunk);
        },
        flush() {
          // The answer is complete. Title, preview, and Inbox updates do not delay delivery.
          void backgroundCompletion;
        },
      })
    ),
  };
}

export default async function sendConversationMessage(input: {
  customer: Customer | null;
  conversation: SupportConversation;
  message: string;
  logger: HttpContext["logger"];
}) {
  const [agentStream, isFirstMessage] = await Promise.all([
    businessSupportAgent.streamMessage(input.customer, input.conversation, input.message),
    claimFirstMessage(input.conversation.id, input.message),
  ]);
  const tasks = isFirstMessage
    ? [generateAndStoreTitle(input.conversation, input.message, input.logger)]
    : [];

  return trackConversationStream(
    agentStream,
    input.conversation.id,
    tasks,
    input.logger,
    async () => {
      await input.conversation.refresh();
      await syncRescheduleAttention(input.conversation);
      if (input.conversation.nextStepOwner !== "owner") {
        await InboxAnnotation.create({
          id: crypto.randomUUID(),
          conversationId: input.conversation.id,
          kind: "milestone",
          summary: "Agent handled the latest customer request",
          detail: "No owner decision is currently required.",
        });
        input.conversation.nextStepOwner = "customer";
        await input.conversation.save();
        inboxEventStream.publish(input.conversation.id);
      }
    }
  );
}
