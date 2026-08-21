import Customer from "#models/customer";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class SupportIdentityMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const customerId = ctx.session.get("customerId");
    const customer = Number.isInteger(customerId) ? await Customer.find(customerId) : null;
    if (customerId && !customer) ctx.session.forget("customerId");

    const storedVisitorId = ctx.session.get("visitorId");
    const visitorId = typeof storedVisitorId === "string" ? storedVisitorId : crypto.randomUUID();
    if (storedVisitorId !== visitorId) ctx.session.put("visitorId", visitorId);

    ctx.customer = customer;
    ctx.visitorId = visitorId;
    return next();
  }
}
