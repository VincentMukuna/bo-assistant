import Booking from "#models/booking";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import { inboxEventStream } from "#services/inbox_event_stream";
import db from "@adonisjs/lucid/services/db";
import { Result, TaggedError, isPanic, type Result as ResultType } from "better-result";
import { DateTime } from "luxon";

const DATABASE_TIMESTAMP_FORMAT = "yyyy-LL-dd HH:mm:ss";
const ACTIVE_BOOKING_STATUSES = ["confirmed", "needs_approval", "in_progress"];

export class InvalidBookingTime extends TaggedError("InvalidBookingTime")<{
  scheduledAt: string;
  message: string;
}> {}

export class BookingConversationNotFound extends TaggedError("BookingConversationNotFound")<{
  conversationId: string;
  customerId: number;
  message: string;
}> {}

export class BookingStaffUnavailable extends TaggedError("BookingStaffUnavailable")<{
  staff: string;
  scheduledAt: string;
  message: string;
}> {}

export class PendingBookingStoreUnavailable extends TaggedError("PendingBookingStoreUnavailable")<{
  operation: string;
  cause: unknown;
  message: string;
}> {}

export type CreatePendingBookingInput = {
  customerId: number;
  conversationId: string;
  toolCallId: string;
  service: string;
  staff: string;
  scheduledAt: DateTime;
  durationMinutes: number;
};

type CreatePendingBookingError =
  | InvalidBookingTime
  | BookingConversationNotFound
  | BookingStaffUnavailable
  | PendingBookingStoreUnavailable;

function storeFailure(operation: string, cause: unknown) {
  return new PendingBookingStoreUnavailable({
    operation,
    cause,
    message: `Unable to ${operation.replaceAll("-", " ")} for the pending booking.`,
  });
}

export default async function createPendingBooking(
  input: CreatePendingBookingInput
): Promise<ResultType<Booking, CreatePendingBookingError>> {
  if (!input.scheduledAt.isValid || input.scheduledAt <= DateTime.now()) {
    return Result.err(
      new InvalidBookingTime({
        scheduledAt: input.scheduledAt.toISO() ?? "invalid",
        message: "The appointment time must be in the future.",
      })
    );
  }

  const externalKey = `booking-creation:${input.toolCallId}`;
  const transaction = await Result.tryPromise({
    try: () =>
      db.transaction((trx) =>
        Result.gen(async function* () {
          const existingAttention = yield* Result.await(
            Result.tryPromise({
              try: () =>
                InboxAttentionItem.query({ client: trx })
                  .where("externalKey", externalKey)
                  .forUpdate()
                  .first(),
              catch: (cause) => storeFailure("check-booking-retry", cause),
            })
          );
          if (existingAttention) {
            const bookingId = Number(existingAttention.context.bookingId);
            const existingBooking = yield* Result.await(
              Result.tryPromise({
                try: () =>
                  Booking.query({ client: trx })
                    .where("id", bookingId)
                    .where("customerId", input.customerId)
                    .first(),
                catch: (cause) => storeFailure("load-existing-booking", cause),
              })
            );
            if (existingBooking) return Result.ok(existingBooking);
            yield* storeFailure(
              "reconcile-booking-retry",
              new Error(`Attention item ${existingAttention.id} has no matching booking.`)
            );
          }

          const conversation = yield* Result.await(
            Result.tryPromise({
              try: () =>
                SupportConversation.query({ client: trx })
                  .where("id", input.conversationId)
                  .where("customerId", input.customerId)
                  .preload("customer")
                  .forUpdate()
                  .first(),
              catch: (cause) => storeFailure("load-conversation", cause),
            })
          );
          if (!conversation) {
            return Result.err(
              new BookingConversationNotFound({
                conversationId: input.conversationId,
                customerId: input.customerId,
                message: "The booking conversation could not be found for this customer.",
              })
            );
          }

          const proposedEnd = input.scheduledAt.plus({ minutes: input.durationMinutes });
          const staffBookings = yield* Result.await(
            Result.tryPromise({
              try: () =>
                Booking.query({ client: trx })
                  .where("staff", input.staff)
                  .whereIn("status", ACTIVE_BOOKING_STATUSES)
                  .where(
                    "scheduledAt",
                    "<",
                    proposedEnd.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT)
                  )
                  .forUpdate(),
              catch: (cause) => storeFailure("load-staff-bookings", cause),
            })
          );
          const overlaps = staffBookings.some(
            (booking) =>
              booking.scheduledAt.plus({ minutes: booking.durationMinutes }) > input.scheduledAt
          );
          if (overlaps) {
            yield* new BookingStaffUnavailable({
              staff: input.staff,
              scheduledAt: input.scheduledAt.toISO() ?? "invalid",
              message: `${input.staff} is already booked at that time.`,
            });
          }

          const booking = yield* Result.await(
            Result.tryPromise({
              try: () =>
                Booking.create(
                  {
                    customerId: input.customerId,
                    service: input.service,
                    staff: input.staff,
                    scheduledAt: input.scheduledAt.toUTC(),
                    durationMinutes: input.durationMinutes,
                    status: "needs_approval",
                    serviceAddress: conversation.customer.address,
                  },
                  { client: trx }
                ),
              catch: (cause) => storeFailure("create-booking", cause),
            })
          );

          yield* Result.await(
            Result.tryPromise({
              try: async () => {
                await InboxAttentionItem.create(
                  {
                    id: crypto.randomUUID(),
                    conversationId: conversation.id,
                    cause: "authority",
                    actionType: "booking_confirmation",
                    status: "pending",
                    externalKey,
                    summary: `${conversation.customer.name} created a new ${booking.service} booking`,
                    contextJson: JSON.stringify({
                      bookingId: booking.id,
                      service: booking.service,
                      staff: booking.staff,
                      scheduledAt: booking.scheduledAt.toISO(),
                      durationMinutes: booking.durationMinutes,
                    }),
                  },
                  { client: trx }
                );
                await InboxAnnotation.create(
                  {
                    id: crypto.randomUUID(),
                    conversationId: conversation.id,
                    kind: "attention",
                    summary: "New booking needs confirmation",
                    detail:
                      "The booking is pending and the customer will be notified when it is confirmed.",
                  },
                  { client: trx }
                );
                conversation.useTransaction(trx);
                conversation.nextStepOwner = "owner";
                conversation.outcomeStatus = "active";
                conversation.outcomeSummary = null;
                await conversation.save();
              },
              catch: (cause) => storeFailure("create-owner-notification", cause),
            })
          );

          return Result.ok(booking);
        })
      ),
    catch: (cause) => {
      if (isPanic(cause)) throw cause;
      return storeFailure("transaction", cause);
    },
  });

  const result = Result.flatten(transaction);
  if (result.status === "ok") inboxEventStream.publish(input.conversationId);
  return result;
}
