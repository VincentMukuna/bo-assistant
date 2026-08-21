import {
  PromptInjectionDetector,
  RegexFilterProcessor,
  TokenLimiterProcessor,
  UnicodeNormalizer,
} from "@mastra/core/processors";

const guardrailModel = "openai/gpt-5-nano";
const fastOpenAiOptions = {
  openai: {
    reasoningEffort: "minimal" as const,
  },
};

export function createCustomerInputGuardrails() {
  return [
    new UnicodeNormalizer({
      stripControlChars: true,
      preserveEmojis: true,
    }),
    new RegexFilterProcessor({
      presets: ["pii", "secrets"],
      strategy: "redact",
      phase: "input",
    }),
    new PromptInjectionDetector({
      model: guardrailModel,
      strategy: "block",
      lastMessageOnly: true,
      providerOptions: fastOpenAiOptions,
    }),
    new TokenLimiterProcessor({
      limit: 20_000,
      strategy: "truncate",
      trimMode: "contiguous",
    }),
  ];
}

export function createCustomerOutputGuardrails() {
  return [
    new TokenLimiterProcessor({
      limit: 800,
      strategy: "truncate",
    }),
  ];
}
