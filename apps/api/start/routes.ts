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

const DemoChatsController = () => import("#controllers/demo_chats_controller");
const DemoApprovalsController = () => import("#controllers/demo_approvals_controller");
const AgentBookingsController = () => import("#controllers/agent_bookings_controller");

router.get("/", () => {
  return { hello: "world" };
});

router.post("/api/v1/demo/chats", [DemoChatsController, "store"]);
router.post("/api/v1/demo/approvals", [DemoApprovalsController, "store"]);
router
  .group(() => {
    router.post("bookings/find", [AgentBookingsController, "find"]);
    router.post("bookings/reschedule", [AgentBookingsController, "reschedule"]);
  })
  .prefix("/api/v1/agent");

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
