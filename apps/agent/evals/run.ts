import { runEvals, type RunEvalsResult } from "@mastra/core/evals";
import type { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
import { extractToolCalls } from "@mastra/evals/scorers/utils";
import { loadEnvFile } from "node:process";
import { businessSupportAgent } from "../src/mastra/agents/business-support-agent";
import { scenarios, type BookingFixture, type EvalScenario } from "./scenarios";

const realFetch = globalThis.fetch;
let activeBookings: BookingFixture[] = [];
// runEvals currently constrains request-context-aware agents to an invariant `unknown` context.
// The runtime preserves the production agent's request-context schema; this cast only bridges that type gap.
const evalTarget = businessSupportAgent as unknown as Agent<any, any, any, any, any>;

type ScenarioObservation = {
  durationMs: number;
  output?: string;
  totalTokens?: number;
  tools: string[];
  reasons: string[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function installBookingApiMock() {
  globalThis.fetch = async (input, init) => {
    const requestUrl =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(requestUrl);

    if (url.pathname === "/api/v1/agent/booking-searches") {
      const body = JSON.parse(String(init?.body ?? "{}")) as { from?: string; to?: string };
      const from = Date.parse(body.from ?? "");
      const to = Date.parse(body.to ?? "");
      const maxWindowMs = 90 * 24 * 60 * 60 * 1_000;

      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > maxWindowMs) {
        return jsonResponse(
          { error: "Search windows must be valid and no longer than 90 days." },
          400
        );
      }

      return jsonResponse({
        bookings: activeBookings.filter((booking) => {
          const start = Date.parse(booking.start_time);
          return start >= from && start < to;
        }),
      });
    }

    if (url.pathname === "/api/v1/agent/booking-reschedules") {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        booking_id?: number;
        new_start_time?: string;
      };
      const booking = activeBookings.find((candidate) => candidate.booking_id === body.booking_id);
      if (!booking || !body.new_start_time) {
        return jsonResponse({ error: "The requested booking could not be rescheduled." }, 404);
      }

      return jsonResponse({ booking: { ...booking, start_time: body.new_start_time } });
    }

    return realFetch(input, init);
  };
}

function requestContext(): RequestContext<any> {
  const context = new RequestContext<{
    bookingCapability: string;
    customerName: string;
    timezone: string;
    currentDate: string;
  }>();
  context.set("bookingCapability", "eval-secret-capability");
  context.set("customerName", "Alice Morgan");
  context.set("timezone", "America/Los_Angeles");
  context.set("currentDate", "2026-08-19");
  return context as RequestContext<any>;
}

function printScenarioResult(
  scenario: EvalScenario,
  result: RunEvalsResult,
  observation: ScenarioObservation
) {
  const hardChecks = result.gateResults ?? [];
  const failedChecks = hardChecks.filter((gate) => !gate.passed).map((gate) => gate.id);
  const status =
    result.verdict === "failed" ? "FAIL" : result.verdict === "scored" ? "SIGNAL" : "PASS";

  console.log(`\n${status}  ${scenario.name}`);
  console.log(`      ${scenario.why}`);
  console.log(
    `      ${observation.durationMs} ms${observation.totalTokens === undefined ? "" : ` · ${observation.totalTokens} tokens`}`
  );
  if (observation.tools.length > 0) console.log(`      tools: ${observation.tools.join(" → ")}`);
  console.log(`      scores: ${JSON.stringify(result.scores)}`);
  if (failedChecks.length > 0) console.log(`      failed: ${failedChecks.join(", ")}`);
  for (const threshold of result.thresholdResults ?? []) {
    console.log(
      `      ${threshold.id}: ${threshold.averageScore.toFixed(2)} (signal threshold ${JSON.stringify(threshold.threshold)})`
    );
  }
  for (const reason of observation.reasons) {
    console.log(`      reason: ${reason.replace(/\s+/g, " ").slice(0, 500)}`);
  }
  if (result.verdict === "failed" && observation.output) {
    const output = observation.output.replaceAll("eval-secret-capability", "[REDACTED]");
    console.log(`      output: ${output.slice(0, 500)}`);
  }
}

async function main() {
  try {
    loadEnvFile();
  } catch (error: unknown) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required. Add it to apps/agent/.env, then run npm run evals."
    );
  }

  installBookingApiMock();
  console.log(`Running ${scenarios.length} business-support evals...`);

  let hardFailures = 0;

  try {
    for (const scenario of scenarios) {
      activeBookings = scenario.bookings;
      const startedAt = performance.now();
      const observation: ScenarioObservation = { durationMs: 0, tools: [], reasons: [] };
      const result = await runEvals({
        target: evalTarget,
        data: [{ input: scenario.input, requestContext: requestContext() }],
        gates: scenario.gates,
        scorers: (scenario.scorers ?? []).map((scorer) => ({ scorer, threshold: 1 })),
        targetOptions: { maxSteps: 5 },
        concurrency: 1,
        onItemComplete: ({ targetResult, scorerResults }) => {
          observation.output = targetResult.text;
          observation.totalTokens = targetResult.usage?.totalTokens;
          observation.tools = extractToolCalls(targetResult.scoringData?.output ?? []).tools;
          observation.reasons = Object.values(scorerResults)
            .filter(
              (value): value is { reason: string } =>
                Boolean(value) && typeof value === "object" && typeof value.reason === "string"
            )
            .map((value) => value.reason);
        },
      });
      observation.durationMs = Math.round(performance.now() - startedAt);

      printScenarioResult(scenario, result, observation);
      if (result.verdict === "failed") hardFailures += 1;
    }
  } finally {
    globalThis.fetch = realFetch;
  }

  console.log(
    `\nSummary: ${scenarios.length - hardFailures}/${scenarios.length} passed hard checks.`
  );
  if (hardFailures > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
