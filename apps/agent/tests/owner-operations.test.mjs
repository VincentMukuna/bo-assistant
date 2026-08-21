import { expect, test } from "bun:test";
import { RequestContext } from "@mastra/core/request-context";
import { ownerOperationsAgent } from "@/agents/owner-operations.ts";

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

  const instructions = await ownerOperationsAgent.getInstructions({ requestContext });

  expect(instructions).toContain("only factual sources");
  expect(instructions).toContain("server-built, read-only snapshots");
  expect(instructions).toContain("stay focused on that selected conversation or customer");
  expect(instructions).toContain("never show a raw timestamp");
  expect(instructions).toContain('Speak to Kim Lewis as "you."');
  expect(instructions).toContain('Never call them "the owner,"');
  expect(instructions).toContain("Keep the useful operational detail");
  expect(instructions).toContain("not clinical, cute, overly casual, or patronizing");
  expect(instructions).toContain('Avoid filler such as "quick heads-up"');
  expect(instructions).toContain("Do not put names, services, dates");
  expect(instructions).toContain("Never claim you changed a booking");
  expect(instructions).toContain("Do not infer revenue, profit, payments");
});
