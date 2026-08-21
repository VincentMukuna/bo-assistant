import { Mastra } from "@mastra/core/mastra";
import { MastraCompositeStore } from "@mastra/core/storage";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { resolve, sep } from "node:path";
import { businessSupportAgent } from "@/agents/business-support";
import { evaluationScorers } from "@/scorers/evaluations";
import { postgresStore } from "@/storage";

const initialDirectory = process.env.INIT_CWD ?? process.cwd();
const agentDirectory = initialDirectory.endsWith(`${sep}apps${sep}agent`)
  ? initialDirectory
  : resolve(initialDirectory, "apps/agent");
const evaluationDatabaseUrl =
  process.env.MASTRA_EVALUATION_DATABASE_URL ??
  `file:${resolve(agentDirectory, ".data/evaluations.db")}`;

const evaluationStore = new LibSQLStore({
  id: "agent-evaluations",
  url: evaluationDatabaseUrl,
});

export const evaluationMastra = new Mastra({
  agents: { businessSupportAgent },
  scorers: evaluationScorers,
  environment: "test",
  logger: new PinoLogger({
    name: "business-support-evaluations",
    level: process.env.MASTRA_LOG_LEVEL === "debug" ? "debug" : "warn",
  }),
  storage: new MastraCompositeStore({
    id: "agent-evaluation-storage",
    default: postgresStore,
    domains: {
      datasets: evaluationStore.stores.datasets,
      experiments: evaluationStore.stores.experiments,
      scores: evaluationStore.stores.scores,
      observability: false,
    },
  }),
});
