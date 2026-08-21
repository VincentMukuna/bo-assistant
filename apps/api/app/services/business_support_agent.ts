import type Customer from "#models/customer";
import type SupportConversation from "#models/support_conversation";
import { issueBookingReadCapability } from "#services/booking_capability";
import env from "#start/env";
import app from "@adonisjs/core/services/app";
import { DateTime } from "luxon";

const AGENT_ID = "business-support-agent";
const TITLE_AGENT_ID = "conversation-title-agent";
const CUSTOMER_TIMEZONE = "America/Los_Angeles";
const TITLE_TIMEOUT_MS = 3_000;
const CONNECTION_RETRY_DELAY_MS = 250;

export type AgentStream = {
  body: ReadableStream<Uint8Array>;
  contentType: string;
};

export type AgentMessage = {
  id: string;
  sender: "customer" | "business";
  body: string;
  createdAt: string | null;
  author: "agent" | "owner" | null;
};

export type SeedAgentMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

type AgentThread = {
  id: string;
  resourceId: string;
};

type AgentThreadsResponse = {
  threads?: AgentThread[];
  hasMore?: boolean;
};

export type PendingRescheduleCall = {
  runId: string;
  toolCallId: string;
  bookingId: number;
  expectedStartTime: string;
  proposedStartTime: string;
};

type SuspendedRunsResponse = {
  runs?: Array<{
    runId?: unknown;
    toolCalls?: Array<{
      toolCallId?: unknown;
      toolName?: unknown;
      args?: unknown;
      requiresApproval?: unknown;
    }>;
  }>;
};

function isConnectionRefused(error: unknown) {
  return (
    error instanceof Error && (error as Error & { code?: string }).code === "ConnectionRefused"
  );
}

function textFromParts(value: unknown) {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";

  return value
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") return record.text;
      return "";
    })
    .join("");
}

function presentMessage(value: unknown): AgentMessage | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (message.role !== "user" && message.role !== "assistant") return null;

  const content = message.content;
  const metadata =
    message.metadata && typeof message.metadata === "object"
      ? (message.metadata as Record<string, unknown>)
      : null;
  const contentRecord =
    content && typeof content === "object" ? (content as Record<string, unknown>) : null;
  const body = textFromParts(message.parts ?? contentRecord?.parts ?? content).trim();
  if (!body) return null;

  return {
    id: typeof message.id === "string" ? message.id : crypto.randomUUID(),
    sender: message.role === "user" ? "customer" : "business",
    body,
    createdAt:
      typeof message.createdAt === "string"
        ? message.createdAt
        : typeof message.created_at === "string"
          ? message.created_at
          : null,
    author:
      message.role === "assistant" ? (metadata?.author === "owner" ? "owner" : "agent") : null,
  };
}

function presentTitle(value: unknown) {
  if (typeof value !== "string") return null;
  const title = value
    .trim()
    .split(/\r?\n/, 1)[0]
    .replace(/^title\s*:\s*/i, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trimEnd();
  return title || null;
}

export class BusinessSupportAgentClient {
  private get baseUrl() {
    return env.get("MASTRA_URL", "http://localhost:4111").replace(/\/$/, "");
  }

  private headers(accept = "application/json") {
    const configuredToken = env.get("MASTRA_INTERNAL_TOKEN");
    if (!configuredToken && app.inProduction) {
      throw new Error("MASTRA_INTERNAL_TOKEN is required in production");
    }
    const token = configuredToken ?? "development-internal-token";
    return {
      "accept": accept,
      "authorization": `Bearer ${token}`,
      "content-type": "application/json",
    };
  }

  private context(customer: Customer | null, conversationId: string, bookingCapability?: string) {
    const isVerified = Boolean(customer?.emailVerifiedAt);
    return {
      bookingCapability:
        bookingCapability ??
        (isVerified && customer ? issueBookingReadCapability(customer.id, conversationId) : null),
      customerName: customer?.name || "Website visitor",
      customerVerified: isVerified,
      timezone: CUSTOMER_TIMEZONE,
      currentDate: DateTime.now().setZone(CUSTOMER_TIMEZONE).toISODate(),
    };
  }

  private async request(path: string, init: RequestInit = {}, timeoutMs = 45_000) {
    const url = `${this.baseUrl}/api${path}`;
    const requestInit = {
      ...init,
      headers: { ...this.headers(), ...init.headers },
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    };
    let response: Response;
    try {
      response = await fetch(url, requestInit);
    } catch (error) {
      if (!isConnectionRefused(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, CONNECTION_RETRY_DELAY_MS));
      response = await fetch(url, requestInit);
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Mastra rejected ${path} with status ${response.status}: ${detail}`);
    }
    return response;
  }

  private async stream(path: string, body: Record<string, unknown>): Promise<AgentStream> {
    const response = await this.request(path, {
      method: "POST",
      headers: this.headers("text/event-stream"),
      body: JSON.stringify(body),
    });
    if (!response.body) throw new Error(`Mastra returned an empty stream for ${path}`);

    return {
      body: response.body,
      contentType: response.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
    };
  }

  streamMessage(customer: Customer | null, conversation: SupportConversation, message: string) {
    return this.stream(`/agents/${AGENT_ID}/stream`, {
      messages: [{ role: "user", content: message }],
      memory: { thread: conversation.id, resource: conversation.memoryResourceId },
      maxSteps: 6,
      requestContext: this.context(customer, conversation.id),
    });
  }

  async generateConversationTitle(message: string) {
    const response = await this.request(
      `/agents/${TITLE_AGENT_ID}/generate`,
      {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
      },
      TITLE_TIMEOUT_MS
    );
    const result = (await response.json()) as { text?: unknown };
    return presentTitle(result.text);
  }

  async createThread(threadId: string, memoryResourceId: string, title: string) {
    await this.request(`/memory/threads?agentId=${encodeURIComponent(AGENT_ID)}`, {
      method: "POST",
      body: JSON.stringify({
        threadId,
        resourceId: memoryResourceId,
        title,
      }),
    });
  }

  async deleteThread(threadId: string, memoryResourceId?: string) {
    const query = new URLSearchParams({ agentId: AGENT_ID });
    if (memoryResourceId) query.set("resourceId", memoryResourceId);
    const path = `/memory/threads/${encodeURIComponent(threadId)}?${query}`;
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      method: "DELETE",
      headers: this.headers(),
      signal: AbortSignal.timeout(45_000),
    });
    if (response.ok || response.status === 404) return;
    const detail = await response.text().catch(() => "");
    throw new Error(`Mastra rejected ${path} with status ${response.status}: ${detail}`);
  }

  async deleteAllThreads() {
    const threads: AgentThread[] = [];
    let page = 0;

    while (true) {
      const query = new URLSearchParams({
        agentId: AGENT_ID,
        page: String(page),
        perPage: "100",
      });
      const response = await this.request(`/memory/threads?${query}`);
      const result = (await response.json()) as AgentThreadsResponse;
      threads.push(...(result.threads ?? []));
      if (!result.hasMore) break;
      page += 1;
    }

    for (const thread of threads) {
      await this.deleteThread(thread.id, thread.resourceId);
    }

    return threads.length;
  }

  async seedThread(input: {
    id: string;
    resourceId: string;
    title: string;
    messages: SeedAgentMessage[];
  }) {
    await this.createThread(input.id, input.resourceId, input.title);
    if (!input.messages.length) return;

    await this.request(`/memory/save-messages?agentId=${encodeURIComponent(AGENT_ID)}`, {
      method: "POST",
      body: JSON.stringify({
        messages: input.messages.map((message) => ({
          ...message,
          threadId: input.id,
          resourceId: input.resourceId,
        })),
      }),
    });
  }

  async updateThreadTitle(conversation: SupportConversation, title: string) {
    const query = new URLSearchParams({ agentId: AGENT_ID });
    await this.request(`/memory/threads/${encodeURIComponent(conversation.id)}?${query}`, {
      method: "PUT",
      body: JSON.stringify({
        resourceId: conversation.memoryResourceId,
        title,
      }),
    });
  }

  async listMessages(conversation: SupportConversation) {
    const query = new URLSearchParams({
      agentId: AGENT_ID,
      resourceId: conversation.memoryResourceId,
      perPage: "100",
      orderBy: JSON.stringify({ field: "createdAt", direction: "ASC" }),
    });
    const response = await this.request(
      `/memory/threads/${encodeURIComponent(conversation.id)}/messages?${query}`
    );
    const result = (await response.json()) as {
      messages?: unknown[];
      uiMessages?: unknown[] | null;
    };
    const source = result.uiMessages ?? result.messages ?? [];
    return source
      .map(presentMessage)
      .filter((message): message is AgentMessage => Boolean(message));
  }

  async appendOwnerMessage(
    conversation: SupportConversation,
    message: string,
    messageId: string = crypto.randomUUID()
  ) {
    await this.request(`/memory/save-messages?agentId=${encodeURIComponent(AGENT_ID)}`, {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            id: messageId,
            threadId: conversation.id,
            resourceId: conversation.memoryResourceId,
            role: "assistant",
            content: message,
            createdAt: new Date().toISOString(),
            metadata: { author: "owner" },
          },
        ],
      }),
    });
  }

  async listPendingReschedules(conversation: SupportConversation) {
    const query = new URLSearchParams({
      threadId: conversation.id,
      resourceId: conversation.memoryResourceId,
      perPage: "20",
    });
    const response = await this.request(`/agents/${AGENT_ID}/suspended-runs?${query}`);
    const result = (await response.json()) as SuspendedRunsResponse;
    const pending: PendingRescheduleCall[] = [];

    for (const run of result.runs ?? []) {
      if (typeof run.runId !== "string") continue;
      for (const toolCall of run.toolCalls ?? []) {
        const isReschedule =
          toolCall.toolName === "rescheduleBooking" || toolCall.toolName === "reschedule_booking";
        if (!isReschedule || toolCall.requiresApproval !== true || !toolCall.args) continue;
        const args = toolCall.args as Record<string, unknown>;
        if (
          typeof toolCall.toolCallId === "string" &&
          Number.isInteger(args.booking_id) &&
          typeof args.expected_start_time === "string" &&
          typeof args.new_start_time === "string"
        ) {
          pending.push({
            runId: run.runId,
            toolCallId: toolCall.toolCallId,
            bookingId: args.booking_id as number,
            expectedStartTime: args.expected_start_time,
            proposedStartTime: args.new_start_time,
          });
        }
      }
    }
    return pending;
  }

  decideToolCall(input: {
    customer: Customer;
    conversation: SupportConversation;
    decision: "approve" | "decline";
    runId: string;
    toolCallId: string;
    reason?: string;
  }) {
    return this.stream(`/agents/${AGENT_ID}/resume-stream`, {
      runId: input.runId,
      toolCallId: input.toolCallId,
      requestContext: this.context(input.customer, input.conversation.id),
      resumeData:
        input.decision === "approve"
          ? { approved: true }
          : {
              approved: false,
              reason: input.reason || "The customer declined this booking change.",
            },
    });
  }
}

export const businessSupportAgent = new BusinessSupportAgentClient();
