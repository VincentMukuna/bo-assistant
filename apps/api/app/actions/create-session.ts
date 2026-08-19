import User from "#models/user";
import { errors as authErrors } from "@adonisjs/auth";
import type { HttpContext } from "@adonisjs/core/http";
import { Result, TaggedError } from "better-result";

export class InvalidCredentials extends TaggedError("InvalidCredentials")<{
  message: string;
}> {}

export class AuthenticationUnavailable extends TaggedError("AuthenticationUnavailable")<{
  operation: "verify-credentials" | "start-session";
  cause: unknown;
  message: string;
}> {}

export default async function createSession(
  auth: HttpContext["auth"],
  email: string,
  password: string
) {
  return Result.gen(async function* () {
    const user = yield* Result.await(
      Result.tryPromise({
        try: () => User.verifyCredentials(email, password),
        catch: (cause) =>
          cause instanceof authErrors.E_INVALID_CREDENTIALS
            ? new InvalidCredentials({ message: "The email or password is incorrect." })
            : new AuthenticationUnavailable({
                operation: "verify-credentials",
                cause,
                message: "Unable to verify credentials because the authentication store failed.",
              }),
      })
    );
    yield* Result.await(
      Result.tryPromise({
        try: () => auth.use("web").login(user),
        catch: (cause) =>
          new AuthenticationUnavailable({
            operation: "start-session",
            cause,
            message: `Credentials were valid for user ${user.id}, but the session could not be started.`,
          }),
      })
    );
    return Result.ok(user);
  });
}
