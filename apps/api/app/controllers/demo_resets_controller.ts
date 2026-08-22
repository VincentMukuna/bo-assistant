import { readDemoResetState } from "#services/demo_reset_state";
import type { HttpContext } from "@adonisjs/core/http";

export default class DemoResetsController {
  async show({ response }: HttpContext) {
    response.header("cache-control", "no-store");
    return { reset: await readDemoResetState() };
  }
}
