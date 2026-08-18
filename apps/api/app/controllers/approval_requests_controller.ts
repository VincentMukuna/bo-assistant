import Booking from "#models/booking";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";
import syncRescheduleAttention from "#actions/sync-reschedule-attention";

export default class ApprovalRequestsController {
  async show({ customer, params, response, logger }: HttpContext) {
    const conversation = await SupportConversation.query()
      .where("id", params.id)
      .where("customerId", customer.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    try {
      const pending = await businessSupportAgent.listPendingReschedules(customer, conversation.id);
      if (pending.length > 1) {
        return response.conflict({ error: "This conversation has multiple pending approvals." });
      }
      const call = pending[0];
      if (!call) return { approvalRequest: null };
      await syncRescheduleAttention(conversation);

      const expected = DateTime.fromISO(call.expectedStartTime, { setZone: true });
      const proposed = DateTime.fromISO(call.proposedStartTime, { setZone: true });
      if (!expected.isValid || !proposed.isValid) {
        return response.conflict({ error: "The pending approval contains invalid timestamps." });
      }

      const booking = await Booking.query()
        .where("id", call.bookingId)
        .where("customerId", customer.id)
        .first();
      if (!booking) {
        return {
          approvalRequest: {
            id: `missing:${call.bookingId}:${proposed.toUTC().toISO()}`,
            type: "booking_reschedule",
            service: "Booking no longer available",
            staff: "",
            currentStartTime: expected.toISO(),
            proposedStartTime: proposed.toISO(),
            status: "stale",
            canApprove: false,
          },
        };
      }

      const canApprove =
        proposed > DateTime.now() &&
        booking.scheduledAt.toUTC().toMillis() === expected.toUTC().toMillis();

      return {
        approvalRequest: {
          id: `${booking.id}:${proposed.toUTC().toISO()}`,
          type: "booking_reschedule",
          service: booking.service,
          staff: booking.staff,
          currentStartTime: booking.scheduledAt.toISO(),
          proposedStartTime: proposed.toISO(),
          status: canApprove ? "pending" : "stale",
          canApprove,
        },
      };
    } catch (error) {
      logger.error({ err: error, conversationId: conversation.id }, "Unable to load approval");
      return response.badGateway({ error: "The approval request could not be loaded." });
    }
  }
}
