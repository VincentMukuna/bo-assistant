import Booking from "#models/booking";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";
import db from "@adonisjs/lucid/services/db";
import { Result, TaggedError, type Result as ResultType } from "better-result";
import { DateTime } from "luxon";

const CUSTOMER_TIMEZONE = "America/Los_Angeles";

export class BookingConfirmationNotFound extends TaggedError("BookingConfirmationNotFound")<{
  attentionId: string;
  message: string;
}> {}

export class BookingConfirmationConflict extends TaggedError("BookingConfirmationConflict")<{
  attentionId: string;
  message: string;
}> {}

export class BookingConfirmationNotificationFailed extends TaggedError(
  "BookingConfirmationNotificationFailed"
)<{
  attentionId: string;
  cause: unknown;
  message: string;
}> {}

export class BookingConfirmationStoreUnavailable extends TaggedError(
  "BookingConfirmationStoreUnavailable"
)<{
  attentionId: string;
  operation: string;
  cause: unknown;
  message: string;
}> {}

type BookingConfirmationError =
  | BookingConfirmationNotFound
  | BookingConfirmationConflict
  | BookingConfirmationNotificationFailed
  | BookingConfirmationStoreUnavailable;

type Input = {
  attentionId: string;
  conversationId: string;
  ownerId: number;
};

function confirmationMessage(booking: Booking) {
  const appointment = booking.scheduledAt
    .setZone(CUSTOMER_TIMEZONE)
    .toFormat("cccc, LLLL d 'at' h:mm a");
  return `Your ${booking.service} booking for ${appointment} has been confirmed.`;
}

export default async function confirmPendingBooking(
  input: Input
): Promise<ResultType<InboxAttentionItem, BookingConfirmationError>> {
  let prepared: {
    item: InboxAttentionItem;
    booking: Booking;
    conversation: SupportConversation;
  };

  try {
    prepared = await db.transaction(async (trx) => {
      const item = await InboxAttentionItem.query({ client: trx })
        .where("id", input.attentionId)
        .where("conversationId", input.conversationId)
        .forUpdate()
        .first();
      if (!item) {
        throw new BookingConfirmationNotFound({
          attentionId: input.attentionId,
          message: "Booking confirmation notification not found.",
        });
      }
      if (
        item.actionType !== "booking_confirmation" ||
        !["pending", "approved"].includes(item.status)
      ) {
        throw new BookingConfirmationConflict({
          attentionId: item.id,
          message: "This booking confirmation has already been completed.",
        });
      }

      const bookingId = Number(item.context.bookingId);
      const conversation = await SupportConversation.query({ client: trx })
        .where("id", input.conversationId)
        .preload("customer")
        .forUpdate()
        .first();
      const booking = Number.isInteger(bookingId)
        ? await Booking.query({ client: trx })
            .where("id", bookingId)
            .where("customerId", conversation?.customerId ?? -1)
            .forUpdate()
            .first()
        : null;
      if (!conversation || !booking) {
        throw new BookingConfirmationConflict({
          attentionId: item.id,
          message: "The pending booking is no longer available.",
        });
      }
      if (!["needs_approval", "confirmed"].includes(booking.status)) {
        throw new BookingConfirmationConflict({
          attentionId: item.id,
          message: `A ${booking.status} booking cannot be confirmed.`,
        });
      }

      if (booking.status === "needs_approval") {
        booking.status = "confirmed";
        await booking.save();
      }
      if (item.status === "pending") {
        item.status = "approved";
        item.decidedByUserId = input.ownerId;
        item.decidedAt = DateTime.now();
        item.outcomeSummary = "Booking confirmed. Notifying the customer conversation.";
        await item.save();
        await InboxAnnotation.create(
          {
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            kind: "decision",
            summary: "Owner confirmed the booking",
            detail: item.outcomeSummary,
          },
          { client: trx }
        );
      }
      conversation.nextStepOwner = "owner";
      conversation.outcomeStatus = "active";
      conversation.outcomeSummary = item.outcomeSummary;
      await conversation.save();

      return { item, booking, conversation };
    });
  } catch (cause) {
    if (BookingConfirmationNotFound.is(cause) || BookingConfirmationConflict.is(cause)) {
      return Result.err(cause);
    }
    return Result.err(
      new BookingConfirmationStoreUnavailable({
        attentionId: input.attentionId,
        operation: "confirm-booking",
        cause,
        message: "The booking could not be confirmed right now.",
      })
    );
  }

  try {
    await businessSupportAgent.appendOwnerMessage(
      prepared.conversation,
      confirmationMessage(prepared.booking),
      prepared.item.id
    );
  } catch (cause) {
    const outcomeSummary =
      "The booking is confirmed, but the customer notification still needs to be sent.";
    await Promise.allSettled([
      InboxAttentionItem.query().where("id", prepared.item.id).update({ outcomeSummary }),
      SupportConversation.query().where("id", prepared.conversation.id).update({
        nextStepOwner: "owner",
        outcomeSummary,
      }),
    ]);
    inboxEventStream.publish(input.conversationId);
    return Result.err(
      new BookingConfirmationNotificationFailed({
        attentionId: prepared.item.id,
        cause,
        message: outcomeSummary,
      })
    );
  }

  try {
    const completed = await db.transaction(async (trx) => {
      const item = await InboxAttentionItem.query({ client: trx })
        .where("id", prepared.item.id)
        .where("status", "approved")
        .forUpdate()
        .firstOrFail();
      const conversation = await SupportConversation.query({ client: trx })
        .where("id", input.conversationId)
        .forUpdate()
        .firstOrFail();

      item.status = "completed";
      item.outcomeSummary = "Booking confirmed and the customer conversation was notified.";
      await item.save();
      conversation.nextStepOwner = "none";
      conversation.outcomeStatus = "completed";
      conversation.outcomeSummary = item.outcomeSummary;
      await conversation.save();
      await InboxAnnotation.create(
        {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          kind: "outcome",
          summary: "Booking confirmed",
          detail: item.outcomeSummary,
        },
        { client: trx }
      );
      return item;
    });
    inboxEventStream.publish(input.conversationId);
    return Result.ok(completed);
  } catch (cause) {
    inboxEventStream.publish(input.conversationId);
    return Result.err(
      new BookingConfirmationStoreUnavailable({
        attentionId: input.attentionId,
        operation: "complete-customer-notification",
        cause,
        message: "The customer was notified, but the notification state could not be completed.",
      })
    );
  }
}
