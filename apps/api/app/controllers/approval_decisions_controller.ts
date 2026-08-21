import { trackConversationStream } from "#actions/send-conversation-message";
import createBookingRescheduleGrant from "#actions/create-booking-reschedule-grant";
import Booking from "#models/booking";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { createApprovalDecisionValidator } from "#validators/support";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";
import InboxAttentionItem from "#models/inbox_attention_item";
import InboxAnnotation from "#models/inbox_annotation";
import syncRescheduleAttention from "#actions/sync-reschedule-attention";
import { inboxEventStream } from "#services/inbox_event_stream";

export default class ApprovalDecisionsController {
  async store({ customer, visitorId, params, request, response, logger }: HttpContext) {
    const decision = await request.validateUsing(createApprovalDecisionValidator);
    const conversation = await SupportConversation.forIdentity({ customer, visitorId })
      .where("id", params.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });
    if (!customer)
      return response.conflict({ error: "Verify your email before changing a booking." });

    try {
      const pending = await businessSupportAgent.listPendingReschedules(conversation);
      if (pending.length !== 1) {
        return response.conflict({ error: "There is no single pending approval to decide." });
      }
      const call = pending[0];

      if (decision.decision === "approve") {
        const attention =
          (await InboxAttentionItem.findBy("externalKey", call.toolCallId)) ??
          (await syncRescheduleAttention(conversation));
        if (!attention || attention.status !== "approved") {
          return response.conflict({
            error:
              "The business is reviewing this booking change. Your current booking is unchanged.",
          });
        }
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
          attention.status = "failed";
          attention.outcomeSummary =
            "The booking or proposed time changed before final customer consent.";
          await attention.save();
          conversation.nextStepOwner = "owner";
          conversation.outcomeStatus = "failed";
          conversation.outcomeSummary = attention.outcomeSummary;
          await conversation.save();
          await InboxAnnotation.create({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            kind: "failure",
            summary: "Booking change became stale",
            detail: attention.outcomeSummary,
          });
          inboxEventStream.publish(conversation.id);
          return response.conflict({
            error: "This approval is stale. Ask the assistant to propose the change again.",
          });
        }

        await createBookingRescheduleGrant({
          customerId: customer.id,
          bookingId: booking.id,
          expectedStartTime: booking.scheduledAt,
          proposedStartTime: proposed,
          runId: call.runId,
          toolCallId: call.toolCallId,
        });
      }

      const agentStream = await businessSupportAgent.decideToolCall({
        customer,
        conversation,
        decision: decision.decision,
        runId: call.runId,
        toolCallId: call.toolCallId,
        reason: decision.reason,
      });
      conversation.updatedAt = DateTime.now();
      await conversation.save();
      const trackedStream = trackConversationStream(
        agentStream,
        conversation.id,
        [],
        logger,
        async () => {
          const attention = await InboxAttentionItem.findBy("externalKey", call.toolCallId);
          if (!attention) return;
          const proposed = DateTime.fromISO(call.proposedStartTime, { setZone: true });
          const booking = await Booking.find(call.bookingId);
          const changed =
            decision.decision === "approve" &&
            proposed.isValid &&
            booking?.scheduledAt.toUTC().toMillis() === proposed.toUTC().toMillis();
          attention.status =
            decision.decision === "decline" ? "declined" : changed ? "completed" : "failed";
          attention.outcomeSummary =
            decision.decision === "decline"
              ? "The customer declined the proposed booking change."
              : changed
                ? "Booking rescheduled after owner authorization and customer consent."
                : "The agent finished, but the booking change was not recorded.";
          await attention.save();
          conversation.nextStepOwner = attention.status === "failed" ? "owner" : "none";
          conversation.outcomeStatus = attention.status === "failed" ? "failed" : "completed";
          conversation.outcomeSummary = attention.outcomeSummary;
          await conversation.save();
          await InboxAnnotation.create({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            kind: attention.status === "failed" ? "failure" : "outcome",
            summary:
              attention.status === "failed"
                ? "Booking change incomplete"
                : decision.decision === "approve"
                  ? "Booking change completed"
                  : "Booking change declined",
            detail: attention.outcomeSummary,
          });
          inboxEventStream.publish(conversation.id);
        }
      );
      response.header("content-type", trackedStream.contentType);
      response.header("cache-control", "no-cache, no-transform");
      response.header("x-accel-buffering", "no");
      return response.stream(trackedStream.body);
    } catch (error) {
      logger.error({ err: error, conversationId: conversation.id }, "Unable to decide approval");
      return response.badGateway({ error: "The decision could not be processed right now." });
    }
  }
}
