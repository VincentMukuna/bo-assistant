import Booking from "#models/booking";
import SupportConversation from "#models/support_conversation";
import {
  issueBookingReadCapability,
  issueBookingRescheduleCapability,
} from "#services/booking_capability";
import { businessSupportAgent } from "#services/business_support_agent";
import { createApprovalDecisionValidator } from "#validators/support";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

export default class ApprovalDecisionsController {
  async store({ customer, params, request, response, logger }: HttpContext) {
    const decision = await request.validateUsing(createApprovalDecisionValidator);
    const conversation = await SupportConversation.query()
      .where("id", params.id)
      .where("customerId", customer.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    try {
      const pending = await businessSupportAgent.listPendingReschedules(customer, conversation.id);
      if (pending.length !== 1) {
        return response.conflict({ error: "There is no single pending approval to decide." });
      }
      const call = pending[0];
      let bookingCapability = issueBookingReadCapability(customer.id);

      if (decision.decision === "approve") {
        const booking = await Booking.query()
          .where("id", call.bookingId)
          .where("customerId", customer.id)
          .first();
        const expected = DateTime.fromISO(call.expectedStartTime, { setZone: true });
        const proposed = DateTime.fromISO(call.proposedStartTime, { setZone: true });
        if (
          !booking ||
          !expected.isValid ||
          !proposed.isValid ||
          proposed <= DateTime.now() ||
          booking.scheduledAt.toUTC().toMillis() !== expected.toUTC().toMillis()
        ) {
          return response.conflict({
            error: "This approval is stale. Ask the assistant to propose the change again.",
          });
        }

        bookingCapability = issueBookingRescheduleCapability({
          customerId: customer.id,
          bookingId: booking.id,
          expectedStartTime: booking.scheduledAt.toUTC().toISO()!,
          proposedStartTime: proposed.toUTC().toISO()!,
          runId: call.runId,
          toolCallId: call.toolCallId,
        });
      }

      const agentStream = await businessSupportAgent.decideToolCall({
        customer,
        decision: decision.decision,
        runId: call.runId,
        toolCallId: call.toolCallId,
        bookingCapability,
        reason: decision.reason,
      });
      conversation.updatedAt = DateTime.now();
      await conversation.save();
      response.header("content-type", agentStream.contentType);
      response.header("cache-control", "no-cache, no-transform");
      response.header("x-accel-buffering", "no");
      return response.stream(agentStream.body);
    } catch (error) {
      logger.error({ err: error, conversationId: conversation.id }, "Unable to decide approval");
      return response.badGateway({ error: "The decision could not be processed right now." });
    }
  }
}
