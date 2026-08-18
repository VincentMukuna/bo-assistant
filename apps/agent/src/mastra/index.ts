import { mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { Mastra } from "@mastra/core/mastra";
import type { AnySpan, SpanOutputProcessor } from "@mastra/core/observability";
import { MastraCompositeStore } from "@mastra/core/storage";
import { DuckDBStore } from "@mastra/duckdb";
import { PinoLogger } from "@mastra/loggers";
import { MastraStorageExporter, Observability } from "@mastra/observability";
import { PostgresStore } from "@mastra/pg";
import { businessSupportAgent } from "./agents/business-support-agent";

const initialDirectory = process.env.INIT_CWD ?? process.cwd();
const agentDirectory = initialDirectory.endsWith(`${sep}apps${sep}agent`)
  ? initialDirectory
  : resolve(initialDirectory, "apps/agent");
const observabilityDatabasePath =
  process.env.MASTRA_OBSERVABILITY_DATABASE_PATH ??
  resolve(agentDirectory, ".data/observability.duckdb");

mkdirSync(dirname(observabilityDatabasePath), { recursive: true });

const postgresStore = new PostgresStore({
  id: "agent-postgres",
  connectionString:
    process.env.MASTRA_DATABASE_URL ?? "postgresql://mastra:mastra@127.0.0.1:5433/mastra",
});

const observabilityStore = new DuckDBStore({
  id: "agent-observability",
  path: observabilityDatabasePath,
  memoryLimit: "512MB",
  threads: 2,
});

const bookingCapabilityRedactor: SpanOutputProcessor = {
  name: "booking-capability-redactor",
  process(span?: AnySpan) {
    if (span?.requestContext && "bookingCapability" in span.requestContext) {
      span.requestContext = {
        ...span.requestContext,
        bookingCapability: "[REDACTED]",
      };
    }

    return span;
  },
  async shutdown() {},
};

export const mastra = new Mastra({
  agents: { businessSupportAgent },
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
  },
});
