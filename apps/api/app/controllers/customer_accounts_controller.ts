import requestCustomerEmailVerification from "#actions/request-customer-email-verification";
import { requestCustomerEmailVerificationValidator } from "#validators/customer_account";
import type { HttpContext } from "@adonisjs/core/http";

export default class CustomerAccountsController {
  async store({ customer, request, response, logger, session }: HttpContext) {
    const input = await request.validateUsing(requestCustomerEmailVerificationValidator);

    try {
      const result = await requestCustomerEmailVerification({ customer, ...input });
      if (result.alreadyVerified) {
        session.forget("customerEmailVerificationId");
        return {
          customer: {
            name: result.customer.name || null,
            email: result.customer.email,
            isVerified: true,
          },
        };
      }
      session.put("customerEmailVerificationId", result.verificationId);
      return { sent: true };
    } catch (error) {
      logger.error({ err: error, customerId: customer.id }, "Unable to send verification email");
      return response.serviceUnavailable({
        error: "We could not send the confirmation email. Please try again.",
      });
    }
  }
}
