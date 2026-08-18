import rescheduleBooking from "#actions/reschedule-booking";
import BookingRescheduleGrant from "#models/booking_reschedule_grant";
import { DateTime } from "luxon";

export class BookingRescheduleGrantError extends Error {}

export default async function rescheduleBookingWithGrant(input: {
  customerId: number;
  bookingId: number;
  toolCallId: string;
  proposedStartTime: DateTime;
}) {
  const grant = await BookingRescheduleGrant.query()
    .where("toolCallId", input.toolCallId)
    .where("customerId", input.customerId)
    .where("bookingId", input.bookingId)
    .first();

  if (
    !grant ||
    grant.expiresAt <= DateTime.now() ||
    grant.proposedStartTime.toUTC().toMillis() !== input.proposedStartTime.toUTC().toMillis()
  ) {
    throw new BookingRescheduleGrantError("The booking change has not been approved.");
  }

  return rescheduleBooking({
    customerId: input.customerId,
    bookingId: input.bookingId,
    expectedStartTime: grant.expectedStartTime,
    proposedStartTime: grant.proposedStartTime,
  });
}
