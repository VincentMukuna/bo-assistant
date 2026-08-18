import type Customer from "#models/customer";
import { issueBookingCapability } from "#services/booking_capability";
import env from "#start/env";
import { DateTime } from "luxon";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type ApprovalDecision = {
  runId: string;
  toolCallId: string;
  decision: "approve" | "decline";
  reason?: string;
};

const AGENT_ID = "business-support-agent";
const DEMO_TIMEZONE = "America/Los_Angeles";

function requestContext(customer: Customer) {
  return {
    bookingCapability: issueBookingCapability(customer.id),
    customerName: customer.name,
    timezone: DEMO_TIMEZONE,
    currentDate: DateTime.now().setZone(DEMO_TIMEZONE).toISODate(),
  };
}

async function stream(path: string, body: Record<string, unknown>) {
  const baseUrl = env.get("MASTRA_URL", "http://localhost:4111").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/agents/${AGENT_ID}/${path}`, {
    method: "POST",
    headers: {
      "accept": "text/event-stream",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Mastra rejected ${path} with status ${response.status}`);
  }

  return response;
}

export function chatWithBusinessSupportAgent(customer: Customer, messages: ChatMessage[]) {
  return stream("stream", {
    messages,
    maxSteps: 6,
    requestContext: requestContext(customer),
  });
}

export function decideBusinessSupportToolCall(customer: Customer, input: ApprovalDecision) {
  const path = input.decision === "approve" ? "approve-tool-call" : "decline-tool-call";

  return stream(path, {
    runId: input.runId,
    toolCallId: input.toolCallId,
    requestContext: requestContext(customer),
    ...(input.decision === "decline"
      ? { reason: input.reason || "The customer declined this booking change." }
      : {}),
  });
}
