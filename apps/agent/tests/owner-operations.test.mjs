import { expect, test } from "bun:test";
import { RequestContext } from "@mastra/core/request-context";
import { ownerOperationsAgent } from "@/agents/owner-operations.ts";

test("keeps owner guidance read-only and grounded in the workspace brief", async () => {
  const requestContext = new RequestContext();
  requestContext.set("ownerName", "Kim Lewis");
  requestContext.set("businessName", "Oak & Pine");
  requestContext.set("timezone", "America/Los_Angeles");
  requestContext.set("currentDate", "2026-08-21");
  requestContext.set(
    "briefJson",
    JSON.stringify({ attentionItems: [], todaySchedule: [], watchItems: [], recentWins: [] })
  );

  const instructions = await ownerOperationsAgent.getInstructions({ requestContext });

  expect(instructions).toContain("only factual source");
  expect(instructions).toContain("read-only snapshot");
  expect(instructions).toContain("Never claim you changed a booking");
  expect(instructions).toContain("Do not infer revenue, profit, payments");
});
