import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import confirmPendingBooking from "#actions/confirm-pending-booking";
import { businessSupportAgent } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";
import { createAttentionDecisionValidator } from "#validators/inbox";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

async function drain(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  try {
    let result = await reader.read();
    while (!result.done) {
      // Mastra persists the generated customer follow-up while the stream is consumed.
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }
}

export default class AttentionDecisionsController {
  async store({ auth, params, request, response, logger }: HttpContext) {
    const decision = await request.validateUsing(createAttentionDecisionValidator);
    const item = await InboxAttentionItem.query()
      .where("id", params.attentionId)
      .where("conversationId", params.conversationId)
      .preload("conversation", (query) => query.preload("customer"))
      .first();
    if (!item) return response.notFound({ error: "Attention item not found." });
    if (item.actionType === "booking_confirmation") {
      if (decision.decision !== "approve") {
        return response.unprocessableEntity({
          error: "Pending bookings can be confirmed from this notification.",
        });
      }
      const confirmed = await confirmPendingBooking({
        attentionId: item.id,
        conversationId: params.conversationId,
        ownerId: auth.user!.id,
      });
      if (confirmed.status === "error") {
        return confirmed.error.match({
          BookingConfirmationNotFound: () =>
            response.notFound({ error: "Booking confirmation notification not found." }),
          BookingConfirmationConflict: (failure) => response.conflict({ error: failure.message }),
          BookingConfirmationNotificationFailed: (failure) => {
            logger.error(
              { err: failure, attentionId: item.id },
              "Unable to notify customer of confirmed booking"
            );
            return response.badGateway({ error: failure.message });
          },
          BookingConfirmationStoreUnavailable: (failure) => {
            logger.error({ err: failure, attentionId: item.id }, "Unable to confirm booking");
            return response.serviceUnavailable({ error: failure.message });
          },
        });
      }
      return {
        attention: {
          id: confirmed.value.id,
          status: confirmed.value.status,
          outcomeSummary: confirmed.value.outcomeSummary,
        },
      };
    }
    if (item.status !== "pending") {
      return response.conflict({ error: "This attention item has already been decided." });
    }

    const conversation = item.conversation;
    const context = item.context;
    if (
      item.actionType !== "booking_reschedule" ||
      typeof context.runId !== "string" ||
      typeof context.toolCallId !== "string"
    ) {
      return response.unprocessableEntity({ error: "This action cannot be decided yet." });
    }

    item.status = decision.decision === "approve" ? "approved" : "declined";
    item.decidedByUserId = auth.user!.id;
    item.decidedAt = DateTime.now();
    item.outcomeSummary =
      decision.decision === "approve"
        ? "Business authority granted. Waiting for the customer’s final consent."
        : "The owner declined the proposed booking change.";
    await item.save();

    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "decision",
      summary:
        decision.decision === "approve"
          ? "Owner authorized the change"
          : "Owner declined the change",
      detail: item.outcomeSummary,
    });

    if (decision.decision === "approve") {
      conversation.nextStepOwner = "customer";
      conversation.outcomeStatus = "active";
      conversation.outcomeSummary = item.outcomeSummary;
      await conversation.save();
    } else {
      try {
        const stream = await businessSupportAgent.decideToolCall({
          customer: conversation.customer,
          threadId: conversation.id,
          decision: "decline",
          runId: context.runId,
          toolCallId: context.toolCallId,
          reason: decision.reason || "The business owner declined this booking change.",
        });
        await drain(stream.body);
        conversation.nextStepOwner = "none";
        conversation.outcomeStatus = "completed";
        conversation.outcomeSummary = item.outcomeSummary;
        await conversation.save();
      } catch (error) {
        item.status = "failed";
        item.outcomeSummary = "The decision was recorded, but the customer follow-up failed.";
        await item.save();
        conversation.nextStepOwner = "owner";
        conversation.outcomeStatus = "failed";
        conversation.outcomeSummary = item.outcomeSummary;
        await conversation.save();
        logger.error({ err: error, attentionId: item.id }, "Unable to complete declined action");
        inboxEventStream.publish(conversation.id);
        return response.badGateway({ error: item.outcomeSummary });
      }
    }

    inboxEventStream.publish(conversation.id);
    return { attention: { id: item.id, status: item.status, outcomeSummary: item.outcomeSummary } };
  }
}
