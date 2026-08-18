import { jsonSchema, parseJsonEventStream } from "ai";

export type BusinessSupportMessage = {
  role: "user" | "assistant";
  content: string;
};

export type PendingApproval = {
  id: string;
  runId: string;
  toolCallId: string;
  toolName: "reschedule_booking";
  service: string;
  staff: string;
  currentStartTime: string;
  proposedStartTime: string;
  status: "pending" | "confirming" | "declining";
  error?: string;
};

type StreamChunk = {
  type?: unknown;
  runId?: unknown;
  payload?: unknown;
};

type StreamHandlers = {
  onText: (text: string) => void;
  onApproval: (approval: PendingApproval) => void;
};

export function parsePendingApproval(value: unknown): PendingApproval | null {
  if (!value || typeof value !== "object") return null;
  const approval = value as Record<string, unknown>;
  const strings = ["id", "runId", "toolCallId", "service", "staff"] as const;
  if (
    approval.toolName !== "reschedule_booking" ||
    !strings.every((key) => typeof approval[key] === "string") ||
    typeof approval.currentStartTime !== "string" ||
    Number.isNaN(Date.parse(approval.currentStartTime)) ||
    typeof approval.proposedStartTime !== "string" ||
    Number.isNaN(Date.parse(approval.proposedStartTime))
  ) {
    return null;
  }

  return {
    id: approval.id as string,
    runId: approval.runId as string,
    toolCallId: approval.toolCallId as string,
    toolName: "reschedule_booking",
    service: approval.service as string,
    staff: approval.staff as string,
    currentStartTime: approval.currentStartTime,
    proposedStartTime: approval.proposedStartTime,
    status: "pending",
  };
}

function approvalFromChunk(chunk: StreamChunk) {
  if (chunk.type !== "tool-call-approval" || typeof chunk.runId !== "string") return null;
  if (!chunk.payload || typeof chunk.payload !== "object") return null;

  const payload = chunk.payload as Record<string, unknown>;
  const input = payload.args;
  const isReschedule =
    payload.toolName === "rescheduleBooking" || payload.toolName === "reschedule_booking";
  if (
    typeof payload.toolCallId !== "string" ||
    !isReschedule ||
    !input ||
    typeof input !== "object"
  ) {
    return null;
  }

  const args = input as Record<string, unknown>;
  return parsePendingApproval({
    id: `${chunk.runId}:${payload.toolCallId}`,
    runId: chunk.runId,
    toolCallId: payload.toolCallId,
    toolName: "reschedule_booking",
    service: args.service,
    staff: args.staff,
    currentStartTime: args.current_start_time,
    proposedStartTime: args.new_start_time,
  });
}

async function errorMessage(response: Response, fallback: string) {
  const result = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return result && typeof result.error === "string" ? result.error : fallback;
}

async function post(path: string, body: Record<string, unknown>, fallback: string) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  return response;
}

export function createBusinessSupportChat(messages: BusinessSupportMessage[]) {
  return post("/api/v1/demo/chats", { messages }, "Assistant unavailable");
}

export function createApprovalDecision(
  approval: PendingApproval,
  decision: "approve" | "decline",
  reason?: string
) {
  return post(
    "/api/v1/demo/approvals",
    {
      runId: approval.runId,
      toolCallId: approval.toolCallId,
      decision,
      ...(decision === "decline" && reason ? { reason } : {}),
    },
    "The decision could not be processed."
  );
}

export async function readBusinessSupportStream(response: Response, handlers: StreamHandlers) {
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
        handlers.onText(chunk.payload.text);
      }

      const approval = approvalFromChunk(chunk);
      if (approval) handlers.onApproval(approval);
      if (chunk.type === "error" || chunk.type === "abort") {
        throw new Error("The assistant response was interrupted.");
      }
    }
  } finally {
    reader.releaseLock();
  }
}
