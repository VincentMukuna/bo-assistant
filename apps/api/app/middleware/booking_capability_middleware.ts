import { readBookingCapability, type BookingCapabilityScope } from "#services/booking_capability";
import Customer from "#models/customer";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class BookingCapabilityMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { scope: BookingCapabilityScope }) {
    const capability = readBookingCapability(ctx.request.header("authorization"));
    if (!capability || !capability.scopes.includes(options.scope)) {
      return ctx.response.unauthorized({ error: "Invalid booking capability." });
    }

    const customer = await Customer.find(capability.customerId);
    if (!customer?.emailVerifiedAt) {
      return ctx.response.unauthorized({
        error: {
          code: "EMAIL_VERIFICATION_REQUIRED",
          message: "Please verify your email before managing appointments.",
          retryable: false,
        },
      });
    }

    ctx.bookingCapability = capability;
    return next();
  }
}
