import { expect, test } from "bun:test";
import { RequestContext } from "@mastra/core/request-context";
import { ownerOperationsAgent } from "@/agents/owner-operations.ts";
import { getBooking, getConversation } from "@/tools/operations-records.ts";

test("keeps operations guidance read-only and grounded in server-built context", async () => {
  const requestContext = new RequestContext();
  requestContext.set("ownerName", "Kim Lewis");
  requestContext.set("businessName", "Oak & Pine");
  requestContext.set("timezone", "America/Los_Angeles");
  requestContext.set("currentDate", "2026-08-21");
  requestContext.set(
    "briefJson",
    JSON.stringify({ attentionItems: [], todaySchedule: [], watchItems: [], recentWins: [] })
  );
  requestContext.set("pageContextJson", JSON.stringify({ surface: "bookings", bookings: [] }));
  requestContext.set("operationsCapability", "operations-capability");

  const instructions = await ownerOperationsAgent.getInstructions({ requestContext });

  expect(instructions).toContain("only factual sources");
  expect(instructions).toContain("server-built, read-only snapshots");
  expect(instructions).toContain("stay focused on that selected conversation or customer");
  expect(instructions).toContain("never show a raw timestamp");
  expect(instructions).toContain('Speak to Kim Lewis as "you."');
  expect(instructions).toContain('Never call them "the owner,"');
  expect(instructions).toContain("Keep the useful operational detail");
  expect(instructions).toContain("do not replace that useful context with tool calls");
  expect(instructions).toContain("A get_booking result is authoritative");
  expect(instructions).toContain("you must call get_booking before answering");
  expect(instructions).toContain("Do not add unrelated context, draft replies");
  expect(instructions).toContain("omit the blocker line instead of saying that none exists");
  expect(instructions).toContain("needs-approval booking status");
  expect(instructions).toContain('say "confirm," not "approve."');
  expect(instructions).toContain("not clinical, cute, overly casual, or patronizing");
  expect(instructions).toContain('Avoid filler such as "quick heads-up"');
  expect(instructions).toContain("Do not put names, services, dates");
  expect(instructions).toContain("Never claim you changed a booking");
  expect(instructions).toContain("Do not infer revenue, profit, payments");
});

test("reads one authoritative booking through the scoped operations tool", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe("http://localhost:3333/api/v1/agent/operations/bookings/3");
    expect(init.headers.authorization).toBe("Bearer operations-capability");
    return Response.json({
      booking: {
        id: 3,
        customer: "Alice Morgan",
        service: "Deep home clean",
        staff: "Jamie + Rosa",
        scheduledAtDisplay: "Tue, Aug 18 at 2:30 PM PDT",
        durationMinutes: 180,
        status: "needs_approval",
        serviceAddress: "1842 Pine Street",
        href: "/bookings?view=agenda&booking=3",
      },
    });
  };

  try {
    const result = await getBooking.execute(
      { booking_id: 3 },
      { requestContext: { all: { operationsCapability: "operations-capability" } } }
    );
    expect(result.booking.staff).toBe("Jamie + Rosa");
    expect(result.booking.scheduledAtDisplay).toBe("Tue, Aug 18 at 2:30 PM PDT");
    expect(result.booking.serviceAddress).toBeNull();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reads one conversation through the scoped operations tool", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe(
      "http://localhost:3333/api/v1/agent/operations/conversations/conversation-1"
    );
    expect(init.headers.authorization).toBe("Bearer operations-capability");
    return Response.json({
      conversation: {
        id: "conversation-1",
        title: "Confirm Tuesday's deep clean",
        contact: "Alice Morgan",
        status: "open",
        nextStep: "Needs your response",
        handling: "Oak is handling this conversation",
        outcome: "In progress",
        outcomeSummary: null,
        attentionItems: [],
        annotations: [],
        messages: [],
        href: "/inbox?conversation=conversation-1",
      },
    });
  };

  try {
    const result = await getConversation.execute(
      { conversation_id: "conversation-1" },
      { requestContext: { all: { operationsCapability: "operations-capability" } } }
    );
    expect(result.conversation.contact).toBe("Alice Morgan");
    expect(result.conversation.nextStep).toBe("Needs your response");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps the two operations tools narrow", () => {
  expect(getConversation.description).toMatch(/one specific workspace conversation/i);
  expect(getConversation.description).toMatch(/do not call this merely to repeat/i);
  expect(getBooking.description).toMatch(/one authoritative booking record/i);
  expect(getBooking.description).toMatch(/override copied booking details/i);
});
