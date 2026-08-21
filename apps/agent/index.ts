import { Mastra } from "@mastra/core/mastra";
import { SimpleAuth } from "@mastra/core/server";
import { PinoLogger } from "@mastra/loggers";
import { businessSupportAgent } from "@/agents/business-support";
import { conversationTitleAgent } from "@/agents/conversation-title";
import { postgresStore } from "@/storage";

const logLevel =
  process.env.MASTRA_LOG_LEVEL === "error" ||
  process.env.MASTRA_LOG_LEVEL === "warn" ||
  process.env.MASTRA_LOG_LEVEL === "info" ||
  process.env.MASTRA_LOG_LEVEL === "debug"
    ? process.env.MASTRA_LOG_LEVEL
    : "debug";

export const mastra = new Mastra({
  agents: { businessSupportAgent, conversationTitleAgent },
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  logger: new PinoLogger({
    name: "business-support-agent",
    level: logLevel,
  }),
  storage: postgresStore,
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
