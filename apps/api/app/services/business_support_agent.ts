import type Customer from "#models/customer";
import { issueBookingReadCapability } from "#services/booking_capability";
import env from "#start/env";
import app from "@adonisjs/core/services/app";
import { DateTime } from "luxon";

const AGENT_ID = "business-support-agent";
const TITLE_AGENT_ID = "conversation-title-agent";
const CUSTOMER_TIMEZONE = "America/Los_Angeles";
const TITLE_TIMEOUT_MS = 3_000;

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

function resourceId(customerId: number) {
  return `customer:${customerId}`;
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

  private context(customer: Customer, conversationId: string, bookingCapability?: string) {
    const isVerified = Boolean(customer.emailVerifiedAt);
    return {
      bookingCapability:
        bookingCapability ??
        (isVerified ? issueBookingReadCapability(customer.id, conversationId) : null),
      customerName: customer.name || "Guest",
      customerVerified: isVerified,
      timezone: CUSTOMER_TIMEZONE,
      currentDate: DateTime.now().setZone(CUSTOMER_TIMEZONE).toISODate(),
    };
  }

  private async request(path: string, init: RequestInit = {}, timeoutMs = 45_000) {
    const response = await fetch(`${this.baseUrl}/api${path}`, {
      ...init,
      headers: { ...this.headers(), ...init.headers },
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });

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

  streamMessage(customer: Customer, threadId: string, message: string) {
    return this.stream(`/agents/${AGENT_ID}/stream`, {
      messages: [{ role: "user", content: message }],
      memory: { thread: threadId, resource: resourceId(customer.id) },
      maxSteps: 6,
      requestContext: this.context(customer, threadId),
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

  async createThread(customer: Customer, threadId: string, title: string) {
    await this.request(`/memory/threads?agentId=${encodeURIComponent(AGENT_ID)}`, {
      method: "POST",
      body: JSON.stringify({
        threadId,
        resourceId: resourceId(customer.id),
        title,
      }),
    });
  }

  async deleteThread(customer: Customer, threadId: string) {
    const query = new URLSearchParams({
      agentId: AGENT_ID,
      resourceId: resourceId(customer.id),
    });
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

  async updateThreadTitle(customer: Customer, threadId: string, title: string) {
    const query = new URLSearchParams({ agentId: AGENT_ID });
    await this.request(`/memory/threads/${encodeURIComponent(threadId)}?${query}`, {
      method: "PUT",
      body: JSON.stringify({
        resourceId: resourceId(customer.id),
        title,
      }),
    });
  }

  async listMessages(customer: Customer, threadId: string) {
    const query = new URLSearchParams({
      agentId: AGENT_ID,
      resourceId: resourceId(customer.id),
      perPage: "100",
      orderBy: JSON.stringify({ field: "createdAt", direction: "ASC" }),
    });
    const response = await this.request(
      `/memory/threads/${encodeURIComponent(threadId)}/messages?${query}`
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
    customer: Customer,
    threadId: string,
    message: string,
    messageId: string = crypto.randomUUID()
  ) {
    await this.request(`/memory/save-messages?agentId=${encodeURIComponent(AGENT_ID)}`, {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            id: messageId,
            threadId,
            resourceId: resourceId(customer.id),
            role: "assistant",
            content: message,
            createdAt: new Date().toISOString(),
            metadata: { author: "owner" },
          },
        ],
      }),
    });
  }

  async listPendingReschedules(customer: Customer, threadId: string) {
    const query = new URLSearchParams({
      threadId,
      resourceId: resourceId(customer.id),
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
    threadId: string;
    decision: "approve" | "decline";
    runId: string;
    toolCallId: string;
    reason?: string;
  }) {
    return this.stream(`/agents/${AGENT_ID}/resume-stream`, {
      runId: input.runId,
      toolCallId: input.toolCallId,
      requestContext: this.context(input.customer, input.threadId),
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
