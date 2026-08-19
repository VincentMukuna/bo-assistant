import Booking from "#models/booking";
import { BookingStoreUnavailable } from "#actions/booking_failures";
import db from "@adonisjs/lucid/services/db";
import { Result, TaggedError, isPanic, type Result as ResultType } from "better-result";
import { DateTime } from "luxon";

const RESCHEDULABLE_STATUSES = new Set(["confirmed", "needs_approval"]);
const DATABASE_TIMESTAMP_FORMAT = "yyyy-LL-dd HH:mm:ss";

export class InvalidRescheduleTime extends TaggedError("InvalidRescheduleTime")<{
  proposedStartTime: string;
  message: string;
}> {}

export class BookingNotFound extends TaggedError("BookingNotFound")<{
  bookingId: number;
  customerId: number;
  message: string;
}> {}

export class BookingNotReschedulable extends TaggedError("BookingNotReschedulable")<{
  bookingId: number;
  status: string;
  message: string;
}> {}

export class BookingChangedSinceApproval extends TaggedError("BookingChangedSinceApproval")<{
  bookingId: number;
  expectedStartTime: string;
  actualStartTime: string;
  message: string;
}> {}

export class StaffUnavailable extends TaggedError("StaffUnavailable")<{
  bookingId: number;
  staff: string;
  proposedStartTime: string;
  message: string;
}> {}

export { BookingStoreUnavailable } from "#actions/booking_failures";

export type RescheduleBookingError =
  | InvalidRescheduleTime
  | BookingNotFound
  | BookingNotReschedulable
  | BookingChangedSinceApproval
  | StaffUnavailable
  | BookingStoreUnavailable;

export type RescheduleBookingInput = {
  customerId: number;
  bookingId: number;
  expectedStartTime: DateTime;
  proposedStartTime: DateTime;
};

function storeFailure(
  operation: BookingStoreUnavailable["operation"],
  input: RescheduleBookingInput,
  cause: unknown
) {
  return new BookingStoreUnavailable({
    operation,
    bookingId: input.bookingId,
    cause,
    message: `Unable to ${operation.replaceAll("-", " ")} for booking ${input.bookingId}. The booking was not rescheduled.`,
  });
}

export default async function rescheduleBooking(
  input: RescheduleBookingInput
): Promise<ResultType<Booking, RescheduleBookingError>> {
  if (input.proposedStartTime <= DateTime.now()) {
    return Result.err(
      new InvalidRescheduleTime({
        proposedStartTime: input.proposedStartTime.toISO() ?? "invalid",
        message: "The new appointment time must be in the future.",
      })
    );
  }

  const transaction = await Result.tryPromise({
    try: () =>
      db.transaction((trx) =>
        Result.gen(async function* () {
          const booking = yield* Result.await(
            Result.tryPromise({
              try: () =>
                Booking.query({ client: trx })
                  .where("id", input.bookingId)
                  .where("customerId", input.customerId)
                  .forUpdate()
                  .first(),
              catch: (cause) => storeFailure("load-booking", input, cause),
            })
          );

          if (!booking) {
            return Result.err(
              new BookingNotFound({
                bookingId: input.bookingId,
                customerId: input.customerId,
                message: `Booking ${input.bookingId} was not found for customer ${input.customerId}.`,
              })
            );
          }
          if (!RESCHEDULABLE_STATUSES.has(booking.status)) {
            yield* new BookingNotReschedulable({
              bookingId: booking.id,
              status: booking.status,
              message: `Booking ${booking.id} is ${booking.status} and cannot be rescheduled.`,
            });
          }
          if (
            booking.scheduledAt.toUTC().toMillis() === input.proposedStartTime.toUTC().toMillis()
          ) {
            return Result.ok(booking);
          }
          if (
            booking.scheduledAt.toUTC().toMillis() !== input.expectedStartTime.toUTC().toMillis()
          ) {
            yield* new BookingChangedSinceApproval({
              bookingId: booking.id,
              expectedStartTime: input.expectedStartTime.toISO() ?? "invalid",
              actualStartTime: booking.scheduledAt.toISO() ?? "invalid",
              message: `Booking ${booking.id} changed after the customer approved the request.`,
            });
          }

          const proposedEnd = input.proposedStartTime.plus({ minutes: booking.durationMinutes });
          const staffBookings = yield* Result.await(
            Result.tryPromise({
              try: () =>
                Booking.query({ client: trx })
                  .whereNot("id", booking.id)
                  .where("staff", booking.staff)
                  .whereIn("status", ["confirmed", "needs_approval", "in_progress"])
                  .where(
                    "scheduledAt",
                    "<",
                    proposedEnd.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT)
                  )
                  .forUpdate(),
              catch: (cause) => storeFailure("load-staff-bookings", input, cause),
            })
          );

          const hasOverlap = staffBookings.some(
            (candidate) =>
              candidate.scheduledAt.plus({ minutes: candidate.durationMinutes }) >
              input.proposedStartTime
          );
          if (hasOverlap) {
            yield* new StaffUnavailable({
              bookingId: booking.id,
              staff: booking.staff,
              proposedStartTime: input.proposedStartTime.toISO() ?? "invalid",
              message: `${booking.staff} is already booked at the proposed time for booking ${booking.id}.`,
            });
          }

          booking.useTransaction(trx);
          booking.scheduledAt = input.proposedStartTime.toUTC();
          yield* Result.await(
            Result.tryPromise({
              try: async () => {
                await booking.save();
                return booking;
              },
              catch: (cause) => storeFailure("save-booking", input, cause),
            })
          );
          return Result.ok(booking);
        })
      ),
    catch: (cause) => {
      if (isPanic(cause)) throw cause;
      return storeFailure("transaction", input, cause);
    },
  });

  return Result.flatten(transaction);
}
