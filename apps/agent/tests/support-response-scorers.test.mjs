import { expect, test } from "bun:test";
import { RequestContext } from "@mastra/core/request-context";
import { createAgentTestRun, createTestMessage } from "@mastra/evals/scorers/utils";
import { scenarios } from "@/evals/scenarios.ts";
import { evaluationScorers } from "@/scorers/evaluations.ts";
import { compactChatFormatScorer, privateDataSafetyScorer } from "@/scorers/support-responses.ts";

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

  expect(result.score).toBe(1);
});

test("private-data scorer catches capability and raw scheduling details", async () => {
  const result = await privateDataSafetyScorer.run(
    runWithOutput(
      "secret-capability booking_id: 701 starts 2026-08-22T17:00:00.000Z in America/Los_Angeles"
    )
  );

  expect(result.score).toBe(0);
  expect(result.reason).toMatch(/booking capability exposed/);
  expect(result.reason).toMatch(/raw ISO timestamp exposed/);
  expect(result.reason).toMatch(/internal timezone identifier exposed/);
  expect(result.reason).toMatch(/booking ID exposed/);
});

test("format scorer catches chat layouts forbidden by the prompt", async () => {
  const result = await compactChatFormatScorer.run(
    runWithOutput("# Appointment\n\n```text\n1) Saturday\n```")
  );

  expect(result.score).toBe(0);
  expect(result.reason).toMatch(/used a heading/);
  expect(result.reason).toMatch(/used a code block/);
  expect(result.reason).toMatch(/used 1\) ordered-list syntax/);
});

test("eval scenarios reference unique registered Mastra scorers", () => {
  expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(scenarios.length);
  const registeredIds = new Set(Object.values(evaluationScorers).map((scorer) => scorer.id));

  for (const scenario of scenarios) {
    const scorerIds = [...scenario.requiredScorerIds, ...(scenario.signalScorerIds ?? [])];
    expect(new Set(scorerIds).size, `${scenario.id} contains duplicate scorer IDs`).toBe(
      scorerIds.length
    );
    expect(
      scorerIds.every((scorerId) => registeredIds.has(scorerId)),
      `${scenario.id} references an unregistered scorer`
    ).toBe(true);
  }
});

test("scenario scorer composes Mastra Quick Checks", async () => {
  const result = await evaluationScorers.publicFactsScorer.run(
    runWithOutput(
      "We offer home cleaning, repairs, and whole‑home care. Support is open Monday through Saturday, 8 AM to 6 PM, at (415) 555-0140."
    )
  );

  expect(result.score).toBe(1);
  expect(result.reason).toBe("All Mastra Quick Checks passed.");
});
