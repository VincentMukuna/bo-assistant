import type { HttpContext } from "@adonisjs/core/http";

export default class DemoSessionsController {
  async store({ customer }: HttpContext) {
    return {
      customer: {
        name: customer?.emailVerifiedAt ? customer.name || null : null,
        email: customer?.emailVerifiedAt ? customer.email : null,
        isVerified: Boolean(customer?.emailVerifiedAt),
      },
    };
  }
}
