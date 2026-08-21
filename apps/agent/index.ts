import { Mastra } from "@mastra/core/mastra";
import type { AnySpan, SpanOutputProcessor } from "@mastra/core/observability";
import { SimpleAuth } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import { MastraStorageExporter, Observability } from "@mastra/observability";
import { businessSupportAgent } from "@/agents/business-support";
import { conversationTitleAgent } from "@/agents/conversation-title";
import { evaluationScorers } from "@/scorers/evaluations";
import { compactChatFormatScorer, privateDataSafetyScorer } from "@/scorers/support-responses";
import { postgresStore } from "@/storage";

const logLevel =
  process.env.MASTRA_LOG_LEVEL === "error" ||
  process.env.MASTRA_LOG_LEVEL === "warn" ||
  process.env.MASTRA_LOG_LEVEL === "info" ||
  process.env.MASTRA_LOG_LEVEL === "debug"
    ? process.env.MASTRA_LOG_LEVEL
    : "debug";

function redactBookingCapabilities(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactBookingCapabilities);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === "bookingCapability" ? "[REDACTED]" : redactBookingCapabilities(entry),
    ])
  );
}

const bookingCapabilityRedactor: SpanOutputProcessor = {
  name: "booking-capability-redactor",
  process(span?: AnySpan) {
    if (!span) return span;

    span.requestContext = redactBookingCapabilities(
      span.requestContext
    ) as typeof span.requestContext;
    span.input = redactBookingCapabilities(span.input) as typeof span.input;
    span.output = redactBookingCapabilities(span.output) as typeof span.output;
    span.attributes = redactBookingCapabilities(span.attributes) as typeof span.attributes;

    return span;
  },
  async shutdown() {},
};

export const mastra = new Mastra({
  agents: { businessSupportAgent, conversationTitleAgent },
  scorers: {
    privateDataSafetyScorer,
    compactChatFormatScorer,
    ...evaluationScorers,
  },
  environment: "development",
  logger: new PinoLogger({
    name: "business-support-agent",
    level: logLevel,
  }),
  storage: postgresStore,
  observability: new Observability({
    configs: {
      default: {
        serviceName: "business-support-agent",
        includeInternalSpans: true,
        spanOutputProcessors: [bookingCapabilityRedactor],
        logging: {
          enabled: true,
          level: "debug",
        },
        exporters: [new MastraStorageExporter({ maxBatchWaitMs: 250 })],
      },
    },
  }),
  server: {
    host: "0.0.0.0",
    auth: new SimpleAuth({
      tokens: {
        [internalToken()]: { id: "adonis-api", role: "internal" },
      },
    }),
  },
});

function internalToken() {
  const token = process.env.MASTRA_INTERNAL_TOKEN;
  if (!token && process.env.NODE_ENV === "production") {
    throw new Error("MASTRA_INTERNAL_TOKEN is required in production");
  }
  return token ?? "development-internal-token";
}
