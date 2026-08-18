import { Mastra } from "@mastra/core/mastra";
import { businessSupportAgent } from "./agents/business-support-agent";

export const mastra = new Mastra({
  agents: { businessSupportAgent },
  server: {
    host: "0.0.0.0",
  },
});
