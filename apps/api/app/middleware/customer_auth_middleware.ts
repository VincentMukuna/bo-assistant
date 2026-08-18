import Customer from "#models/customer";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class CustomerAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const customerId = ctx.session.get("customerId");
    if (!Number.isInteger(customerId)) {
      return ctx.response.unauthorized({ error: "A customer session is required." });
    }

    const customer = await Customer.find(customerId);
    if (!customer) {
      ctx.session.forget("customerId");
      return ctx.response.unauthorized({ error: "The customer session is no longer valid." });
    }

    ctx.customer = customer;
    return next();
  }
}
