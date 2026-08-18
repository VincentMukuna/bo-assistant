import { jsonSchema, parseJsonEventStream } from "ai";
import { Result, TaggedError, type Result as ResultType } from "better-result";
import { z } from "zod";

export type ConversationSummary = {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  status: "open" | "closed";
  updatedAt: string;
};

export type SupportMessage = {
  id: string;
  sender: "customer" | "business";
  body: string;
  createdAt: string | null;
};

export type SupportConversation = ConversationSummary & {
  messages: SupportMessage[];
};

export type ApprovalRequest = {
  id: string;
  type: "booking_reschedule";
  service: string;
  staff: string;
  currentStartTime: string;
  proposedStartTime: string;
  status: "pending" | "stale";
  canApprove: boolean;
};

type StreamChunk = {
  type?: unknown;
  payload?: unknown;
};

export class SupportApiUnavailable extends TaggedError("SupportApiUnavailable")<{
  operation: string;
  cause: unknown;
  message: string;
}> {}

export class SupportApiRejected extends TaggedError("SupportApiRejected")<{
  operation: string;
  status: number;
  message: string;
}> {}

export class InvalidSupportApiResponse extends TaggedError("InvalidSupportApiResponse")<{
  operation: string;
  cause: unknown;
  message: string;
}> {}

export class InvalidSupportStream extends TaggedError("InvalidSupportStream")<{
  reason: "empty" | "invalid-event" | "interrupted" | "read-failed";
  cause?: unknown;
  message: string;
}> {}

export type SupportClientError =
  SupportApiUnavailable | SupportApiRejected | InvalidSupportApiResponse | InvalidSupportStream;

const conversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  lastMessagePreview: z.string().nullable(),
  status: z.enum(["open", "closed"]),
  updatedAt: z.string(),
});
const supportMessageSchema = z.object({
  id: z.string(),
  sender: z.enum(["customer", "business"]),
  body: z.string(),
  createdAt: z.string().nullable(),
});
const supportConversationSchema = conversationSummarySchema.extend({
  messages: z.array(supportMessageSchema),
});
const approvalRequestSchema = z.object({
  id: z.string(),
  type: z.literal("booking_reschedule"),
  service: z.string(),
  staff: z.string(),
  currentStartTime: z.string(),
  proposedStartTime: z.string(),
  status: z.enum(["pending", "stale"]),
  canApprove: z.boolean(),
});

async function request(path: string, init: RequestInit, fallback: string) {
  const response = await Result.tryPromise({
    try: () =>
      fetch(path, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers },
      }),
    catch: (cause) =>
      new SupportApiUnavailable({
        operation: path,
        cause,
        message: fallback,
      }),
  });
  if (response.status === "error") return Result.err(response.error);
  if (!response.value.ok) {
    const body = await Result.tryPromise(() => response.value.json());
    const payload = body.status === "ok" ? body.value : null;
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : fallback;
    return Result.err(
      new SupportApiRejected({
        operation: path,
        status: response.value.status,
        message,
      })
    );
  }
  return Result.ok(response.value);
}

async function json<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {},
  fallback = "Request failed"
): Promise<ResultType<T, SupportClientError>> {
  const response = await request(path, init, fallback);
  if (response.status === "error") return Result.err(response.error);
  const payload = await Result.tryPromise({
    try: () => response.value.json(),
    catch: (cause) =>
      new InvalidSupportApiResponse({
        operation: path,
        cause,
        message: `${fallback} The response was not valid JSON.`,
      }),
  });
  if (payload.status === "error") return Result.err(payload.error);
  const parsed = schema.safeParse(payload.value);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.err(
        new InvalidSupportApiResponse({
          operation: path,
          cause: parsed.error,
          message: `${fallback} The response did not match the expected contract.`,
        })
      );
}

export function bootstrapCustomerSession() {
  return json(
    "/api/v1/demo/session",
    z.object({ customer: z.object({ name: z.string() }) }),
    { method: "POST", body: "{}" },
    "Could not start the demo session."
  );
}

export async function listConversations() {
  const result = await json(
    "/api/v1/support/conversations",
    z.object({ conversations: z.array(conversationSummarySchema) }),
    {},
    "Could not load conversations."
  );
  return result.map((payload) => payload.conversations);
}

export async function createConversation() {
  const result = await json(
    "/api/v1/support/conversations",
    z.object({ conversation: conversationSummarySchema }),
    { method: "POST", body: "{}" },
    "Could not create a conversation."
  );
  return result.map((payload) => payload.conversation);
}

export async function readConversation(id: string) {
  const result = await json(
    `/api/v1/support/conversations/${encodeURIComponent(id)}`,
    z.object({ conversation: supportConversationSchema }),
    {},
    "Could not load the conversation."
  );
  return result.map((payload) => payload.conversation);
}

export async function readApprovalRequest(conversationId: string) {
  const result = await json(
    `/api/v1/support/conversations/${encodeURIComponent(conversationId)}/approval-request`,
    z.object({ approvalRequest: approvalRequestSchema.nullable() }),
    {},
    "Could not load the approval request."
  );
  return result.map((payload) => payload.approvalRequest);
}

export function sendConversationMessage(conversationId: string, message: string) {
  return request(
    `/api/v1/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ message }) },
    "The assistant is unavailable."
  );
}

export function sendCustomerReply(
  conversationId: string,
  message: string,
  hasPendingApproval: boolean
) {
  return hasPendingApproval
    ? decideApproval(conversationId, "decline", message)
    : sendConversationMessage(conversationId, message);
}

export function decideApproval(
  conversationId: string,
  decision: "approve" | "decline",
  reason?: string
) {
  return request(
    `/api/v1/support/conversations/${encodeURIComponent(conversationId)}/approval-decisions`,
    {
      method: "POST",
      body: JSON.stringify({ decision, ...(decision === "decline" && reason ? { reason } : {}) }),
    },
    "The decision could not be processed."
  );
}

export async function readBusinessSupportStream(
  response: Response,
  onText: (text: string) => void
): Promise<ResultType<void, InvalidSupportStream>> {
  if (!response.body) {
    return Result.err(
      new InvalidSupportStream({
        reason: "empty",
        message: "The assistant returned an empty response.",
      })
    );
  }
  const reader = parseJsonEventStream({
    stream: response.body,
    schema: jsonSchema<StreamChunk>({}),
  }).getReader();

  const consumed = await Result.tryPromise({
    try: async () => {
      while (true) {
        const { done, value: event } = await reader.read();
        if (done) break;
        if (!event.success) {
          return Result.err(
            new InvalidSupportStream({
              reason: "invalid-event",
              message: "The assistant returned an invalid stream event.",
            })
          );
        }
        const chunk = event.value;
        if (
          chunk.type === "text-delta" &&
          chunk.payload &&
          typeof chunk.payload === "object" &&
          "text" in chunk.payload &&
          typeof chunk.payload.text === "string"
        ) {
          onText(chunk.payload.text);
        }
        if (chunk.type === "error" || chunk.type === "abort") {
          return Result.err(
            new InvalidSupportStream({
              reason: "interrupted",
              message: "The assistant response was interrupted.",
            })
          );
        }
      }
      return Result.ok(undefined);
    },
    catch: (cause) =>
      new InvalidSupportStream({
        reason: "read-failed",
        cause,
        message: "The assistant response stream could not be read.",
      }),
  });
  try {
    return Result.flatten(consumed);
  } finally {
    reader.releaseLock();
  }
}
