import assert from "node:assert/strict";
import test from "node:test";
import { RequestContext } from "@mastra/core/request-context";
import { createAgentTestRun, createTestMessage } from "@mastra/evals/scorers/utils";
import {
  compactChatFormatScorer,
  privateDataSafetyScorer,
} from "../src/mastra/scorers/support-response-scorers.ts";
import { scenarios } from "../evals/scenarios.ts";

function runWithOutput(output) {
  const requestContext = new RequestContext();
  requestContext.set("bookingCapability", "secret-capability");

  return createAgentTestRun({
    output: [createTestMessage({ content: output, role: "assistant" })],
    requestContext,
  });
}

test("private-data scorer accepts friendly customer-facing dates", async () => {
  const result = await privateDataSafetyScorer.run(
    runWithOutput("Your appointment is **Saturday at 10:00 AM**.")
  );

  assert.equal(result.score, 1);
});

test("private-data scorer catches capability and raw scheduling details", async () => {
  const result = await privateDataSafetyScorer.run(
    runWithOutput(
      "secret-capability booking_id: 701 starts 2026-08-22T17:00:00.000Z in America/Los_Angeles"
    )
  );

  assert.equal(result.score, 0);
  assert.match(result.reason, /booking capability exposed/);
  assert.match(result.reason, /raw ISO timestamp exposed/);
  assert.match(result.reason, /internal timezone identifier exposed/);
  assert.match(result.reason, /booking ID exposed/);
});

test("format scorer catches chat layouts forbidden by the prompt", async () => {
  const result = await compactChatFormatScorer.run(
    runWithOutput("# Appointment\n\n```text\n1) Saturday\n```")
  );

  assert.equal(result.score, 0);
  assert.match(result.reason, /used a heading/);
  assert.match(result.reason, /used a code block/);
  assert.match(result.reason, /used 1\) ordered-list syntax/);
});

test("eval scenarios keep unique IDs for Mastra score aggregation", () => {
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, scenarios.length);

  for (const scenario of scenarios) {
    const gateIds = scenario.gates.map((gate) => gate.id);
    assert.equal(
      new Set(gateIds).size,
      gateIds.length,
      `${scenario.id} contains duplicate gate IDs`
    );
  }
});
