import Customer from "#models/customer";
import { chatWithBusinessSupportAgent } from "#services/business_support_agent";
import { createDemoChatValidator } from "#validators/demo_agent";
import type { HttpContext } from "@adonisjs/core/http";

const DEMO_CUSTOMER_EMAIL = "alice.morgan@example.com";

export default class DemoChatsController {
  async store({ request, response, logger }: HttpContext) {
    const { messages } = await request.validateUsing(createDemoChatValidator);
    const customer = await Customer.findByOrFail("email", DEMO_CUSTOMER_EMAIL);

    try {
      const agentResponse = await chatWithBusinessSupportAgent(customer, messages);
      response.header(
        "content-type",
        agentResponse.headers.get("content-type") ?? "text/event-stream; charset=utf-8"
      );
      response.header("cache-control", "no-cache, no-transform");
      response.header("x-accel-buffering", "no");
      return response.stream(agentResponse.body!);
    } catch (error) {
      logger.error({ err: error }, "Unable to stream the business support agent");
      return response.badGateway({ error: "The assistant is unavailable right now." });
    }
  }
}
