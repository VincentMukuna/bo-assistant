import verifyCustomerEmail from "#actions/verify-customer-email";
import { verifyCustomerEmailValidator } from "#validators/customer_account";
import type { HttpContext } from "@adonisjs/core/http";

export default class CustomerEmailVerificationsController {
  async store({ request, response, session }: HttpContext) {
    const { code } = await request.validateUsing(verifyCustomerEmailValidator);
    const verificationId = session.get("customerEmailVerificationId");
    if (typeof verificationId !== "string") {
      return response.gone({ error: "Request a new verification code to continue." });
    }

    const result = await verifyCustomerEmail(verificationId, code);
    if (result.status === "expired") {
      session.forget("customerEmailVerificationId");
      return response.gone({ error: "That code has expired. Request a new one to continue." });
    }
    if (result.status === "locked") {
      session.forget("customerEmailVerificationId");
      return response.tooManyRequests({
        error: "Too many incorrect attempts. Request a new code to try again.",
      });
    }
    if (result.status === "invalid") {
      return response.unprocessableEntity({
        error: "That code is incorrect. Check it and try again.",
      });
    }

    session.forget("customerEmailVerificationId");
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
