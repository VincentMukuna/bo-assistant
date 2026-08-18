import Customer from "#models/customer";
import type { HttpContext } from "@adonisjs/core/http";

const DEMO_CUSTOMER_EMAIL = "alice.morgan@example.com";

export default class DemoSessionsController {
  async store({ session }: HttpContext) {
    const customer = await Customer.findByOrFail("email", DEMO_CUSTOMER_EMAIL);
    session.put("customerId", customer.id);

    return { customer: { name: customer.name } };
  }
}
