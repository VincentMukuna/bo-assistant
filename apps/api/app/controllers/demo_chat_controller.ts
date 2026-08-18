import { issueBookingCapability } from "#services/booking_capability";
import Customer from "#models/customer";
import env from "#start/env";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEMO_CUSTOMER_EMAIL = "alice.morgan@example.com";
const DEMO_TIMEZONE = "America/Los_Angeles";

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) return null;

  const messages: ChatMessage[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") return null;

    const role = "role" in entry ? entry.role : undefined;
    const content = "content" in entry ? entry.content : undefined;
    if (
      (role !== "user" && role !== "assistant") ||
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > 4_000
    ) {
      return null;
    }

    messages.push({ role, content: content.trim() });
  }

  return messages;
}

export default class DemoChatController {
  async handle({ request, response, logger }: HttpContext) {
    const messages = parseMessages(request.body()?.messages);
    if (!messages) {
      return response.badRequest({ error: "A valid message history is required." });
    }

    const customer = await Customer.findByOrFail("email", DEMO_CUSTOMER_EMAIL);
    const bookingCapability = issueBookingCapability(customer.id);
    const mastraUrl = env.get("MASTRA_URL", "http://localhost:4111").replace(/\/$/, "");

    try {
      const agentResponse = await fetch(`${mastraUrl}/api/agents/business-support-agent/stream`, {
        method: "POST",
        headers: {
          "accept": "text/event-stream",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages,
          maxSteps: 6,
          requestContext: {
            bookingCapability,
            customerName: customer.name,
            timezone: DEMO_TIMEZONE,
            currentDate: DateTime.now().setZone(DEMO_TIMEZONE).toISODate(),
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!agentResponse.ok) {
        logger.error({ status: agentResponse.status }, "Mastra rejected the demo chat request");
        return response.badGateway({ error: "The assistant is unavailable right now." });
      }

      if (!agentResponse.body) {
        logger.error("Mastra returned a demo chat response without a stream");
        return response.badGateway({ error: "The assistant returned an empty response." });
      }

      response.header(
        "content-type",
        agentResponse.headers.get("content-type") ?? "text/event-stream; charset=utf-8"
      );
      response.header("cache-control", "no-cache, no-transform");
      response.header("x-accel-buffering", "no");
      response.stream(agentResponse.body);
    } catch (error) {
      logger.error({ err: error }, "Unable to reach Mastra for demo chat");
      return response.badGateway({ error: "The assistant is unavailable right now." });
    }
  }
}
