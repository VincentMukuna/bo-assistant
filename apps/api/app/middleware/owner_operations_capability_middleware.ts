import {
  readOwnerOperationsCapability,
  type OwnerOperationsCapabilityScope,
} from "#services/owner_operations_capability";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";

export default class OwnerOperationsCapabilityMiddleware {
  async handle(ctx: HttpContext, next: NextFn, options: { scope: OwnerOperationsCapabilityScope }) {
    const capability = readOwnerOperationsCapability(ctx.request.header("authorization"));
    if (!capability || !capability.scopes.includes(options.scope)) {
      return ctx.response.unauthorized({ error: "Invalid operations capability." });
    }

    ctx.ownerOperationsCapability = capability;
    return next();
  }
}
