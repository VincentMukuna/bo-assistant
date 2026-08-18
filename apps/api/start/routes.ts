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

const DemoSessionsController = () => import("#controllers/demo_sessions_controller");
const SupportConversationsController = () =>
  import("#controllers/support_conversations_controller");
const ConversationMessagesController = () =>
  import("#controllers/conversation_messages_controller");
const ApprovalRequestsController = () => import("#controllers/approval_requests_controller");
const ApprovalDecisionsController = () => import("#controllers/approval_decisions_controller");
const AgentBookingSearchesController = () =>
  import("#controllers/agent_booking_searches_controller");
const AgentBookingReschedulesController = () =>
  import("#controllers/agent_booking_reschedules_controller");

router.get("/", () => {
  return { hello: "world" };
});

router
  .post("/api/v1/demo/session", [DemoSessionsController, "store"])
  .use(middleware.customerOrigin());
router
  .group(() => {
    router
      .resource("conversations", SupportConversationsController)
      .only(["index", "store", "show"]);
    router.post("conversations/:id/messages", [ConversationMessagesController, "store"]);
    router.get("conversations/:id/approval-request", [ApprovalRequestsController, "show"]);
    router.post("conversations/:id/approval-decisions", [ApprovalDecisionsController, "store"]);
  })
  .prefix("/api/v1/support")
  .use(middleware.customerOrigin())
  .use(middleware.customerAuth());
router
  .group(() => {
    router
      .post("booking-searches", [AgentBookingSearchesController, "store"])
      .use(middleware.bookingCapability({ scope: "find_bookings" }));
    router
      .post("booking-reschedules", [AgentBookingReschedulesController, "store"])
      .use(middleware.bookingCapability({ scope: "find_bookings" }));
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
