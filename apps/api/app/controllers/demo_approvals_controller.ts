import Customer from "#models/customer";
import { decideBusinessSupportToolCall } from "#services/business_support_agent";
import { createDemoApprovalValidator } from "#validators/demo_agent";
import type { HttpContext } from "@adonisjs/core/http";

const DEMO_CUSTOMER_EMAIL = "alice.morgan@example.com";

export default class DemoApprovalsController {
  async store({ request, response, logger }: HttpContext) {
    const decision = await request.validateUsing(createDemoApprovalValidator);
    const customer = await Customer.findByOrFail("email", DEMO_CUSTOMER_EMAIL);

    try {
      const agentResponse = await decideBusinessSupportToolCall(customer, decision);
      response.header(
        "content-type",
        agentResponse.headers.get("content-type") ?? "text/event-stream; charset=utf-8"
      );
      response.header("cache-control", "no-cache, no-transform");
      response.header("x-accel-buffering", "no");
      return response.stream(agentResponse.body!);
    } catch (error) {
      logger.error({ err: error }, "Unable to process the business support approval");
      return response.badGateway({ error: "The decision could not be processed right now." });
    }
  }
}
