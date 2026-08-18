import { createScorer } from "@mastra/core/evals";
import { getAssistantMessageFromRunOutput } from "@mastra/evals/scorers/utils";

type OutputRule = {
  description: string;
  includes?: readonly string[];
  excludes?: readonly string[];
  includesPattern?: RegExp;
  excludesPattern?: RegExp;
};

export function createOutputRulesScorer(id: string, rules: readonly OutputRule[]) {
  return createScorer({
    id,
    name: id,
    description: "Evaluates business-specific output invariants.",
    type: "agent",
  })
    .preprocess(({ run }) => {
      const output = getAssistantMessageFromRunOutput(run.output) ?? "";
      const failures = rules
        .filter((rule) => {
          const normalized = output.toLocaleLowerCase();
          const missingText = rule.includes?.some(
            (expected) => !normalized.includes(expected.toLocaleLowerCase())
          );
          const unwantedText = rule.excludes?.some((unwanted) =>
            normalized.includes(unwanted.toLocaleLowerCase())
          );
          const missingPattern = rule.includesPattern ? !rule.includesPattern.test(output) : false;
          const unwantedPattern = rule.excludesPattern ? rule.excludesPattern.test(output) : false;

          return missingText || unwantedText || missingPattern || unwantedPattern;
        })
        .map((rule) => rule.description);

      return { failures };
    })
    .generateScore(({ results }) => (results.preprocessStepResult?.failures.length === 0 ? 1 : 0))
    .generateReason(({ results }) => {
      const failures = results.preprocessStepResult?.failures ?? [];
      return failures.length === 0 ? "All output rules passed." : failures.join("; ");
    });
}
