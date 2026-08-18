import { PostgresStore } from "@mastra/pg";

export const postgresStore = new PostgresStore({
  id: "agent-postgres",
  connectionString:
    process.env.MASTRA_DATABASE_URL ?? "postgresql://mastra:mastra@127.0.0.1:5433/mastra",
});
