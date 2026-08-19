import { mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { Mastra } from "@mastra/core/mastra";
import type { AnySpan, SpanOutputProcessor } from "@mastra/core/observability";
import { SimpleAuth } from "@mastra/core/server";
import { MastraCompositeStore } from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";
import { PinoLogger } from "@mastra/loggers";
import { MastraStorageExporter, Observability } from "@mastra/observability";
import { panic } from "better-result";
import { businessSupportAgent } from "./agents/business-support-agent";
import { conversationTitleAgent } from "./agents/conversation-title-agent";
import { postgresStore } from "./storage";

const initialDirectory = process.env.INIT_CWD ?? process.cwd();
const agentDirectory = initialDirectory.endsWith(`${sep}apps${sep}agent`)
  ? initialDirectory
  : resolve(initialDirectory, "apps/agent");
const observabilityDatabasePath =
  process.env.MASTRA_OBSERVABILITY_DATABASE_PATH ??
  resolve(agentDirectory, ".data/observability.duckdb");

mkdirSync(dirname(observabilityDatabasePath), { recursive: true });

const observabilityStore = new DuckDBStore({
  id: "agent-observability",
  path: observabilityDatabasePath,
  memoryLimit: "512MB",
  threads: 2,
});

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
  environment: "development",
  logger: new PinoLogger({
    name: "business-support-agent",
    level: "debug",
  }),
  storage: new MastraCompositeStore({
    id: "agent-storage",
    default: postgresStore,
    domains: {
      observability: observabilityStore.observability,
    },
  }),
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
    return panic("MASTRA_INTERNAL_TOKEN is required in production");
  }
  return token ?? "development-internal-token";
}
