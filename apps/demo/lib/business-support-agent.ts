import { jsonSchema, parseJsonEventStream } from "ai";

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
  status: "awaiting_owner" | "awaiting_customer" | "stale";
};

type StreamChunk = {
  type?: unknown;
  payload?: unknown;
};

async function errorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return result && typeof result.error === "string" ? result.error : fallback;
}

async function request(path: string, init: RequestInit, fallback: string) {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  return response;
}

async function json<T>(path: string, init: RequestInit = {}, fallback = "Request failed") {
  const response = await request(path, init, fallback);
  return (await response.json()) as T;
}

export function bootstrapCustomerSession() {
  return json<{ customer: { name: string } }>(
    "/api/v1/demo/session",
    { method: "POST", body: "{}" },
    "Could not start the demo session."
  );
}

export async function listConversations() {
  const result = await json<{ conversations: ConversationSummary[] }>(
    "/api/v1/support/conversations",
    {},
    "Could not load conversations."
  );
  return result.conversations;
}

export async function createConversation() {
  const result = await json<{ conversation: ConversationSummary }>(
    "/api/v1/support/conversations",
    { method: "POST", body: "{}" },
    "Could not create a conversation."
  );
  return result.conversation;
}

export async function readConversation(id: string) {
  const result = await json<{ conversation: SupportConversation }>(
    `/api/v1/support/conversations/${encodeURIComponent(id)}`,
    {},
    "Could not load the conversation."
  );
  return result.conversation;
}

export async function readApprovalRequest(conversationId: string) {
  const result = await json<{ approvalRequest: ApprovalRequest | null }>(
    `/api/v1/support/conversations/${encodeURIComponent(conversationId)}/approval-request`,
    {},
    "Could not load the approval request."
  );
  return result.approvalRequest;
}

export function sendConversationMessage(conversationId: string, message: string) {
  return request(
    `/api/v1/support/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ message }) },
    "The assistant is unavailable."
  );
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
) {
  if (!response.body) throw new Error("The assistant returned an empty response.");
  const reader = parseJsonEventStream({
    stream: response.body,
    schema: jsonSchema<StreamChunk>({}),
  }).getReader();

  try {
    while (true) {
      const { done, value: event } = await reader.read();
      if (done) break;
      if (!event.success) throw new Error("The assistant returned an invalid stream.");
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
        throw new Error("The assistant response was interrupted.");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
