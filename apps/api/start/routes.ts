/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from "#start/kernel";
import router from "@adonisjs/core/services/router";
import { controllers } from "#generated/controllers";

router.get("/", () => {
  return { hello: "world" };
});

router
  .group(() => {
    router
      .group(() => {
        router.post("login", [controllers.Sessions, "store"]);
      })
      .prefix("auth")
      .as("auth");

    router
      .group(() => {
        router.get("profile", [controllers.Profile, "show"]);
        router.delete("session", [controllers.Sessions, "destroy"]);
        router.resource("customers", controllers.Customers).apiOnly();
        router.resource("bookings", controllers.Bookings).apiOnly();
      })
      .use(middleware.auth({ guards: ["web"] }));
  })
  .prefix("/api/v1");
