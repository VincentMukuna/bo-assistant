import { readDemoResetState } from "#services/demo_reset_state";
import type { HttpContext } from "@adonisjs/core/http";
import type { NextFn } from "@adonisjs/core/types/http";
import app from "@adonisjs/core/services/app";

const sessionGenerationKey = "demoResetGeneration";

export default class DemoResetMiddleware {
  async handle({ request, response, session }: HttpContext, next: NextFn) {
    const reset = await readDemoResetState();
    const sessionGeneration = session.get(sessionGenerationKey);
    const syntheticTestSession = app.inTest && sessionGeneration === undefined;
    const sessionReset = !syntheticTestSession && sessionGeneration !== reset.generation;

    if (syntheticTestSession) session.put(sessionGenerationKey, reset.generation);

    if (sessionReset) {
      const hadIdentity =
        session.has("auth_web") || session.has("customerId") || session.has("visitorId");
      session.clear();
      if (hadIdentity) response.header("x-demo-session-reset", "true");
    }

    const path = request.url().split("?", 1)[0];
    const resetStatusRequest = request.method() === "GET" && path === "/api/v1/demo/reset";
    const healthcheck = request.method() === "GET" && path === "/";

    if (reset.status !== "ready" && !resetStatusRequest && !healthcheck) {
      session.put(sessionGenerationKey, reset.generation);
      response.header("retry-after", "1");
      return response.serviceUnavailable({
        error: reset.status === "failed" ? "Demo reset needs attention" : "Demo reset in progress",
        reset,
      });
    }

    try {
      return await next();
    } finally {
      // Authentication regenerates the session during login, so persist the reset
      // generation after downstream middleware and handlers have finished.
      session.put(sessionGenerationKey, reset.generation);
    }
  }
}
