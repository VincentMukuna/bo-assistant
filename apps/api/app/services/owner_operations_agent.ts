import type { OwnerBrief } from "#services/owner_brief";
import env from "#start/env";
import app from "@adonisjs/core/services/app";

const AGENT_ID = "owner-operations-agent";

export class OwnerOperationsAgentClient {
  private get baseUrl() {
    return env.get("MASTRA_URL", "http://localhost:4111").replace(/\/$/, "");
  }

  private headers() {
    const configuredToken = env.get("MASTRA_INTERNAL_TOKEN");
    if (!configuredToken && app.inProduction) {
      throw new Error("MASTRA_INTERNAL_TOKEN is required in production");
    }
    return {
      "accept": "application/json",
      "authorization": `Bearer ${configuredToken ?? "development-internal-token"}`,
      "content-type": "application/json",
    };
  }

  async answer(
    question: string,
    ownerName: string,
    brief: OwnerBrief,
    pageContext: Record<string, unknown>
  ) {
    const response = await fetch(`${this.baseUrl}/api/agents/${AGENT_ID}/generate`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        messages: [{ role: "user", content: question }],
        requestContext: {
          ownerName,
          businessName: "Oak & Pine",
          timezone: "America/Los_Angeles",
          currentDate: brief.businessDate,
          briefJson: JSON.stringify(brief),
          pageContextJson: JSON.stringify(pageContext),
        },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(
        `Mastra rejected the owner question with status ${response.status}: ${detail}`
      );
    }

    const result = (await response.json()) as { text?: unknown };
    if (typeof result.text !== "string" || !result.text.trim()) {
      throw new Error("Mastra returned an empty owner response");
    }
    return result.text.trim();
  }
}

export const ownerOperationsAgent = new OwnerOperationsAgentClient();
