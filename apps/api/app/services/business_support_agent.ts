import type Customer from "#models/customer";
import { issueBookingReadCapability } from "#services/booking_capability";
import env from "#start/env";
import app from "@adonisjs/core/services/app";
import { Result, TaggedError, panic, type Result as ResultType } from "better-result";
import { DateTime } from "luxon";
import { z } from "zod";

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

export class AgentUnavailable extends TaggedError("AgentUnavailable")<{
  operation: string;
  cause: unknown;
  message: string;
}> {}

export class AgentRequestRejected extends TaggedError("AgentRequestRejected")<{
  operation: string;
  status: number;
  message: string;
}> {}

export class InvalidAgentResponse extends TaggedError("InvalidAgentResponse")<{
  operation: string;
  cause: unknown;
  message: string;
}> {}

export class EmptyAgentStream extends TaggedError("EmptyAgentStream")<{
  operation: string;
  message: string;
}> {}

export type BusinessSupportAgentError =
  AgentUnavailable | AgentRequestRejected | InvalidAgentResponse | EmptyAgentStream;

const titleResponseSchema = z.object({ text: z.unknown() });
const messagesResponseSchema = z.object({
  messages: z.array(z.unknown()).optional(),
  uiMessages: z.array(z.unknown()).nullable().optional(),
});
const suspendedRunsResponseSchema = z.object({
  runs: z
    .array(
      z.object({
        runId: z.unknown().optional(),
        toolCalls: z
          .array(
            z.object({
              toolCallId: z.unknown().optional(),
              toolName: z.unknown().optional(),
              args: z.unknown().optional(),
              requiresApproval: z.unknown().optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

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
      return panic("MASTRA_INTERNAL_TOKEN is required in production before calling Mastra");
    }
    const token = configuredToken ?? "development-internal-token";
    return {
      "accept": accept,
      "authorization": `Bearer ${token}`,
      "content-type": "application/json",
    };
  }

  private context(
    customer: Customer,
    bookingCapability: string = issueBookingReadCapability(customer.id)
  ) {
    return {
      bookingCapability,
      customerName: customer.name,
      timezone: CUSTOMER_TIMEZONE,
      currentDate: DateTime.now().setZone(CUSTOMER_TIMEZONE).toISODate(),
    };
  }

  private async request(
    path: string,
    init: RequestInit = {},
    timeoutMs = 45_000
  ): Promise<ResultType<Response, AgentUnavailable | AgentRequestRejected>> {
    const response = await Result.tryPromise({
      try: () =>
        fetch(`${this.baseUrl}/api${path}`, {
          ...init,
          headers: { ...this.headers(), ...init.headers },
          signal: init.signal ?? AbortSignal.timeout(timeoutMs),
        }),
      catch: (cause) =>
        new AgentUnavailable({
          operation: path,
          cause,
          message: `The Mastra operation ${path} did not complete.`,
        }),
    });
    if (response.status === "error") return Result.err(response.error);

    if (!response.value.ok) {
      // Drain the body without retaining or logging potentially sensitive upstream content.
      await Result.tryPromise(() => response.value.arrayBuffer());
      return Result.err(
        new AgentRequestRejected({
          operation: path,
          status: response.value.status,
          message: `Mastra rejected ${path} with status ${response.value.status}.`,
        })
      );
    }
    return response;
  }

  private async json<T>(
    response: Response,
    operation: string,
    schema: z.ZodType<T>
  ): Promise<ResultType<T, InvalidAgentResponse>> {
    const payload = await Result.tryPromise({
      try: () => response.json(),
      catch: (cause) =>
        new InvalidAgentResponse({
          operation,
          cause,
          message: `Mastra returned non-JSON data for ${operation}.`,
        }),
    });
    if (payload.status === "error") return Result.err(payload.error);

    const parsed = schema.safeParse(payload.value);
    return parsed.success
      ? Result.ok(parsed.data)
      : Result.err(
          new InvalidAgentResponse({
            operation,
            cause: parsed.error,
            message: `Mastra returned an invalid payload for ${operation}.`,
          })
        );
  }

  private async stream(
    path: string,
    body: Record<string, unknown>
  ): Promise<ResultType<AgentStream, BusinessSupportAgentError>> {
    return Result.gen(
      async function* (this: BusinessSupportAgentClient) {
        const response = yield* Result.await(
          this.request(path, {
            method: "POST",
            headers: this.headers("text/event-stream"),
            body: JSON.stringify(body),
          })
        );
        if (!response.body) {
          return Result.err(
            new EmptyAgentStream({
              operation: path,
              message: `Mastra returned an empty stream for ${path}.`,
            })
          );
        }

        return Result.ok({
          body: response.body,
          contentType: response.headers.get("content-type") ?? "text/event-stream; charset=utf-8",
        });
      }.bind(this)
    );
  }

  streamMessage(customer: Customer, threadId: string, message: string) {
    return this.stream(`/agents/${AGENT_ID}/stream`, {
      messages: [{ role: "user", content: message }],
      memory: { thread: threadId, resource: resourceId(customer.id) },
      maxSteps: 6,
      requestContext: this.context(customer),
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
    if (response.status === "error") return Result.err(response.error);
    const result = await this.json(
      response.value,
      "generate-conversation-title",
      titleResponseSchema
    );
    return result.map((payload) => presentTitle(payload.text));
  }

  async createThread(customer: Customer, threadId: string, title: string) {
    const response = await this.request(`/memory/threads?agentId=${encodeURIComponent(AGENT_ID)}`, {
      method: "POST",
      body: JSON.stringify({
        threadId,
        resourceId: resourceId(customer.id),
        title,
      }),
    });
    return response.map(() => undefined);
  }

  async deleteThread(customer: Customer, threadId: string) {
    const query = new URLSearchParams({
      agentId: AGENT_ID,
      resourceId: resourceId(customer.id),
    });
    const response = await this.request(
      `/memory/threads/${encodeURIComponent(threadId)}?${query}`,
      {
        method: "DELETE",
      }
    );
    return response.map(() => undefined);
  }

  async updateThreadTitle(customer: Customer, threadId: string, title: string) {
    const query = new URLSearchParams({ agentId: AGENT_ID });
    const response = await this.request(
      `/memory/threads/${encodeURIComponent(threadId)}?${query}`,
      {
        method: "PUT",
        body: JSON.stringify({
          resourceId: resourceId(customer.id),
          title,
        }),
      }
    );
    return response.map(() => undefined);
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
    if (response.status === "error") return Result.err(response.error);
    const result = await this.json(response.value, "list-messages", messagesResponseSchema);
    return result.map((payload) => {
      const source = payload.uiMessages ?? payload.messages ?? [];
      return source
        .map(presentMessage)
        .filter((message): message is AgentMessage => Boolean(message));
    });
  }

  async appendOwnerMessage(customer: Customer, threadId: string, message: string) {
    const response = await this.request(
      `/memory/save-messages?agentId=${encodeURIComponent(AGENT_ID)}`,
      {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              id: crypto.randomUUID(),
              threadId,
              resourceId: resourceId(customer.id),
              role: "assistant",
              content: message,
              createdAt: new Date().toISOString(),
              metadata: { author: "owner" },
            },
          ],
        }),
      }
    );
    return response.map(() => undefined);
  }

  async listPendingReschedules(customer: Customer, threadId: string) {
    const query = new URLSearchParams({
      threadId,
      resourceId: resourceId(customer.id),
      perPage: "20",
    });
    const response = await this.request(`/agents/${AGENT_ID}/suspended-runs?${query}`);
    if (response.status === "error") return Result.err(response.error);
    const result = await this.json(
      response.value,
      "list-pending-reschedules",
      suspendedRunsResponseSchema
    );
    if (result.status === "error") return Result.err(result.error);
    const pending: PendingRescheduleCall[] = [];

    for (const run of result.value.runs ?? []) {
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
    return Result.ok(pending);
  }

  decideToolCall(input: {
    customer: Customer;
    decision: "approve" | "decline";
    runId: string;
    toolCallId: string;
    reason?: string;
  }) {
    return this.stream(`/agents/${AGENT_ID}/resume-stream`, {
      runId: input.runId,
      toolCallId: input.toolCallId,
      requestContext: this.context(input.customer),
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
