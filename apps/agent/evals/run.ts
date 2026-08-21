import type { ExperimentSummary, ItemWithScores } from "@mastra/core/datasets";
import { extractToolCalls, getAssistantMessageFromRunOutput } from "@mastra/evals/scorers/utils";
import { evaluationDatasetId, evaluationTargetId, syncEvaluationDataset } from "@/evals/dataset";
import { scenarios, type EvalScenario } from "@/evals/scenarios";

function loadEnvironment() {
  if (!Bun.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required. Add it to apps/agent/.env, then run bun run evals."
    );
  }

  process.env.MASTRA_LOG_LEVEL ??= "warn";
}

function currentAgentVersion() {
  try {
    const revision = gitOutput(["rev-parse", "--short", "HEAD"]);
    const dirty = gitOutput(["status", "--porcelain", "--untracked-files=no"]);
    return `${revision}${dirty ? "-dirty" : ""}`;
  } catch {
    return "unknown";
  }
}

function gitOutput(args: string[]) {
  const result = Bun.spawnSync(["git", ...args], {
    stdout: "pipe",
    stderr: "ignore",
  });
  if (!result.success) throw new Error(`git ${args.join(" ")} failed`);
  return result.stdout.toString().trim();
}

function scenarioFor(result: ItemWithScores): EvalScenario | undefined {
  return scenarios.find((scenario) => scenario.input === result.input);
}

function outputText(output: unknown) {
  if (!Array.isArray(output)) return typeof output === "string" ? output : "";
  return getAssistantMessageFromRunOutput(output) ?? "";
}

function toolNames(result: ItemWithScores) {
  const fromOutput = Array.isArray(result.output) ? extractToolCalls(result.output).tools : [];
  if (fromOutput.length > 0) return fromOutput;
  return result.toolMockReport?.served.map((mock) => mock.toolName) ?? [];
}

function printItem(result: ItemWithScores) {
  const scenario = scenarioFor(result);
  const requiredScorerIds = new Set(scenario?.requiredScorerIds ?? []);
  const signalScorerIds = new Set(scenario?.signalScorerIds ?? []);
  const failedRequiredScores = result.scores.filter(
    (score) => requiredScorerIds.has(score.scorerId) && (score.score !== 1 || score.error !== null)
  );
  const hasExecutionFailure = Boolean(result.error || result.toolMockReport?.failure);
  const failed = hasExecutionFailure || failedRequiredScores.length > 0;
  const signalMissed = result.scores.some(
    (score) => signalScorerIds.has(score.scorerId) && score.score !== 1
  );
  const status = failed ? "FAIL" : signalMissed ? "SIGNAL" : "PASS";
  const durationMs = result.completedAt.getTime() - result.startedAt.getTime();
  const tools = toolNames(result);

  console.log(`\n${status}  ${scenario?.name ?? String(result.input)}`);
  if (scenario) console.log(`      ${scenario.why}`);
  console.log(`      ${durationMs} ms`);
  if (tools.length > 0) console.log(`      tools: ${tools.join(" → ")}`);

  for (const score of result.scores) {
    const kind = signalScorerIds.has(score.scorerId) ? "signal" : "check";
    const value = score.score === null ? "error" : score.score.toFixed(2);
    console.log(`      ${kind}: ${score.scorerName} = ${value}`);
    if (score.reason && (score.score !== 1 || kind === "signal")) {
      console.log(`      reason: ${score.reason.replace(/\s+/g, " ").slice(0, 500)}`);
    }
    if (score.error) console.log(`      scorer error: ${score.error}`);
  }

  if (result.toolMockReport?.failure) {
    console.log(
      `      mock failure: ${result.toolMockReport.failure.code} (${result.toolMockReport.failure.toolName})`
    );
  }
  if (result.error) console.log(`      error: ${result.error.message}`);

  if (failed) {
    const output = outputText(result.output)
      .replaceAll("eval-secret-capability", "[REDACTED]")
      .slice(0, 500);
    if (output) console.log(`      output: ${output}`);
  }

  return { failed, signalMissed };
}

function printSummary(summary: ExperimentSummary, datasetVersion: number) {
  let hardFailures = 0;
  let signalsMissed = 0;
  for (const result of summary.results) {
    const outcome = printItem(result);
    if (outcome.failed) hardFailures += 1;
    if (outcome.signalMissed) signalsMissed += 1;
  }

  console.log(`\nExperiment: ${summary.experimentId}`);
  console.log(`Dataset: ${evaluationDatasetId} v${datasetVersion}`);
  console.log(
    `Summary: ${summary.totalItems - hardFailures}/${summary.totalItems} passed hard checks${signalsMissed === 0 ? "" : ` · ${signalsMissed} quality signal missed`}.`
  );
  console.log("Open Mastra Studio → Datasets → Business support regression to compare runs.");

  if (hardFailures > 0) process.exitCode = 1;
}

async function main() {
  loadEnvironment();
  const { evaluationMastra } = await import("@/evals/mastra");

  try {
    const synced = await syncEvaluationDataset(evaluationMastra);
    const changes = synced.changes;
    console.log(
      `Dataset ${evaluationDatasetId} v${synced.version}: ${synced.itemCount} items ` +
        `(added ${changes.added}, updated ${changes.updated}, removed ${changes.removed}).`
    );
    console.log(`Running ${scenarios.length} business-support evals...`);

    const agentVersion = currentAgentVersion();
    const summary = await synced.dataset.startExperiment({
      name: `Business support ${agentVersion}`,
      description: "Local regression run started by bun run evals.",
      targetType: "agent",
      targetId: evaluationTargetId,
      version: synced.version,
      maxConcurrency: 1,
      itemTimeout: 60_000,
      unmockedToolPolicy: "deny",
      metadata: {
        command: "bun run evals",
        datasetId: evaluationDatasetId,
        gitRevision: agentVersion,
      },
    });

    printSummary(summary, synced.version);
  } finally {
    await evaluationMastra.shutdown();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
