import env from "#start/env";
import app from "@adonisjs/core/services/app";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class CustomerOriginMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    const origin = request.header("origin");
    if (!origin || app.inDev) return next();

    const allowed = new Set([
      new URL(env.get("APP_URL")).origin,
      ...(env.get("CUSTOMER_APP_ORIGIN") ? [new URL(env.get("CUSTOMER_APP_ORIGIN")!).origin] : []),
    ]);
    if (!allowed.has(origin)) {
      return response.forbidden({ error: "This origin cannot use the customer session." });
    }

    return next();
  }
}
