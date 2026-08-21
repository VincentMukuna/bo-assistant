import verifyCustomerEmail from "#actions/verify-customer-email";
import type { HttpContext } from "@adonisjs/core/http";

export default class CustomerEmailVerificationsController {
  async store({ params, response, session }: HttpContext) {
    const token = typeof params.token === "string" ? params.token : "";
    const customer = token ? await verifyCustomerEmail(token) : null;
    if (!customer) {
      return response.gone({ error: "This confirmation link is invalid or has expired." });
    }

    session.put("customerId", customer.id);
    return {
      customer: {
        name: customer.name || null,
        email: customer.email,
        isVerified: true,
      },
    };
  }
}
