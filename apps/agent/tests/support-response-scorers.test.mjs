import assert from "node:assert/strict";
import test from "node:test";
import { RequestContext } from "@mastra/core/request-context";
import { createAgentTestRun, createTestMessage } from "@mastra/evals/scorers/utils";
import { compactChatFormatScorer, privateDataSafetyScorer } from "../scorers/support-responses.ts";
import { evaluationScorers } from "../scorers/evaluations.ts";
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

test("eval scenarios reference unique registered Mastra scorers", () => {
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, scenarios.length);
  const registeredIds = new Set(Object.values(evaluationScorers).map((scorer) => scorer.id));

  for (const scenario of scenarios) {
    const scorerIds = [...scenario.requiredScorerIds, ...(scenario.signalScorerIds ?? [])];
    assert.equal(
      new Set(scorerIds).size,
      scorerIds.length,
      `${scenario.id} contains duplicate scorer IDs`
    );
    assert.ok(
      scorerIds.every((scorerId) => registeredIds.has(scorerId)),
      `${scenario.id} references an unregistered scorer`
    );
  }
});

test("scenario scorer composes Mastra Quick Checks", async () => {
  const result = await evaluationScorers.publicFactsScorer.run(
    runWithOutput(
      "We offer home cleaning, repairs, and whole‑home care. Support is open Monday through Saturday, 8 AM to 6 PM, at (415) 555-0140."
    )
  );

  assert.equal(result.score, 1);
  assert.equal(result.reason, "All Mastra Quick Checks passed.");
});
