import SupportConversation from "#models/support_conversation";
import { businessSupportAgent, type AgentStream } from "#services/business_support_agent";
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
  customer: Customer,
  conversationId: string,
  message: string,
  logger: HttpContext["logger"]
) {
  const title = await businessSupportAgent.generateConversationTitle(message);
  if (!title) return;

  await SupportConversation.query().where("id", conversationId).update({ title });
  void businessSupportAgent.updateThreadTitle(customer, conversationId, title).catch((error) => {
    logger.warn({ err: error, conversationId }, "Unable to synchronize conversation title");
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
  logger: HttpContext["logger"]
): AgentStream {
  const [clientBody, observerBody] = agentStream.body.tee();
  const previewTask = textFromAgentStream(observerBody).then(async (text) => {
    const preview = conversationPreview(text);
    if (!preview) return;
    await SupportConversation.query().where("id", conversationId).update({
      lastMessagePreview: preview,
    });
  });

  const completion = Promise.allSettled([previewTask, ...tasks]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        logger.warn(
          { err: result.reason, conversationId },
          "Unable to update conversation summary"
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
        async flush() {
          await completion;
        },
      })
    ),
  };
}

export default async function sendConversationMessage(input: {
  customer: Customer;
  conversation: SupportConversation;
  message: string;
  logger: HttpContext["logger"];
}) {
  const agentStream = await businessSupportAgent.streamMessage(
    input.customer,
    input.conversation.id,
    input.message
  );
  const isFirstMessage = await claimFirstMessage(input.conversation.id, input.message);
  const tasks = isFirstMessage
    ? [generateAndStoreTitle(input.customer, input.conversation.id, input.message, input.logger)]
    : [];

  return trackConversationStream(agentStream, input.conversation.id, tasks, input.logger);
}
