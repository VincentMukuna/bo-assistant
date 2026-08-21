import Customer from "#models/customer";
import type { HttpContext } from "@adonisjs/core/http";

export default class DemoSessionsController {
  async store({ session }: HttpContext) {
    const customerId = session.get("customerId");
    const existing = Number.isInteger(customerId) ? await Customer.find(customerId) : null;
    const customer =
      existing ??
      (await Customer.create({
        name: "",
        email: `anonymous-${crypto.randomUUID()}@invalid.local`,
        phone: "",
        address: "",
        notes: "",
      }));
    session.put("customerId", customer.id);

    return {
      customer: {
        name: customer.emailVerifiedAt ? customer.name || null : null,
        email: customer.emailVerifiedAt ? customer.email : null,
        isVerified: Boolean(customer.emailVerifiedAt),
      },
    };
  }
}
