import { BookingStoreUnavailable } from "#actions/booking_failures";
import rescheduleBooking from "#actions/reschedule-booking";
import BookingRescheduleGrant from "#models/booking_reschedule_grant";
import { Result, TaggedError } from "better-result";
import { DateTime } from "luxon";

export class RescheduleNotAuthorized extends TaggedError("RescheduleNotAuthorized")<{
  bookingId: number;
  customerId: number;
  toolCallId: string;
  reason: "missing" | "expired" | "mismatch";
  message: string;
}> {}

export default async function rescheduleBookingWithGrant(input: {
  customerId: number;
  bookingId: number;
  toolCallId: string;
  proposedStartTime: DateTime;
}) {
  return Result.gen(async function* () {
    const grant = yield* Result.await(
      Result.tryPromise({
        try: () =>
          BookingRescheduleGrant.query()
            .where("toolCallId", input.toolCallId)
            .where("customerId", input.customerId)
            .where("bookingId", input.bookingId)
            .first(),
        catch: (cause) =>
          new BookingStoreUnavailable({
            operation: "load-reschedule-grant",
            bookingId: input.bookingId,
            cause,
            message: `Unable to load the approval grant for booking ${input.bookingId}. The booking was not rescheduled.`,
          }),
      })
    );

    if (
      !grant ||
      grant.expiresAt <= DateTime.now() ||
      grant.proposedStartTime.toUTC().toMillis() !== input.proposedStartTime.toUTC().toMillis()
    ) {
      const reason = !grant
        ? "missing"
        : grant.expiresAt <= DateTime.now()
          ? "expired"
          : "mismatch";
      return Result.err(
        new RescheduleNotAuthorized({
          bookingId: input.bookingId,
          customerId: input.customerId,
          toolCallId: input.toolCallId,
          reason,
          message: `Booking ${input.bookingId} does not have a current approval grant for tool call ${input.toolCallId}; the grant was ${reason}.`,
        })
      );
    }

    const booking = yield* Result.await(
      rescheduleBooking({
        customerId: input.customerId,
        bookingId: input.bookingId,
        expectedStartTime: grant.expectedStartTime,
        proposedStartTime: grant.proposedStartTime,
      })
    );
    return Result.ok(booking);
  });
}
