import createSession from "#actions/create-session";
import UserTransformer from "#transformers/user_transformer";
import { loginValidator } from "#validators/user";
import type { HttpContext } from "@adonisjs/core/http";

export default class SessionsController {
  async store({ auth, request, response, serialize, logger }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator);
    const session = await createSession(auth, email, password);
    if (session.status === "error") {
      return session.error.match({
        InvalidCredentials: (failure) => response.badRequest({ error: failure.message }),
        AuthenticationUnavailable: (failure) => {
          logger.error({ err: failure }, "Unable to create owner session");
          return response.serviceUnavailable({ error: "Sign in is unavailable right now." });
        },
      });
    }
    return serialize(UserTransformer.transform(session.value));
  }

  async destroy({ auth, response }: HttpContext) {
    await auth.use("web").logout();
    return response.noContent();
  }
}
