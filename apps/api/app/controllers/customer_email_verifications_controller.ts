import verifyCustomerEmail from "#actions/verify-customer-email";
import { verifyCustomerEmailValidator } from "#validators/customer_account";
import type { HttpContext } from "@adonisjs/core/http";

export default class CustomerEmailVerificationsController {
  async store({ request, response, session }: HttpContext) {
    const { email, code } = await request.validateUsing(verifyCustomerEmailValidator);
    const result = await verifyCustomerEmail(email, code);
    if (result.status === "expired") {
      return response.gone({ error: "That code has expired. Request a new one to continue." });
    }
    if (result.status === "locked") {
      return response.tooManyRequests({
        error: "Too many incorrect attempts. Request a new code to try again.",
      });
    }
    if (result.status === "invalid") {
      return response.unprocessableEntity({
        error: "That code is incorrect. Check it and try again.",
      });
    }

    session.put("customerId", result.customer.id);
    return {
      customer: {
        name: result.customer.name || null,
        email: result.customer.email,
        isVerified: true,
      },
    };
  }
}
