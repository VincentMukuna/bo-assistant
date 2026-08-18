import BookingRescheduleGrant from "#models/booking_reschedule_grant";
import { DateTime } from "luxon";

const GRANT_LIFETIME_MINUTES = 5;

export default function createBookingRescheduleGrant(input: {
  toolCallId: string;
  runId: string;
  customerId: number;
  bookingId: number;
  expectedStartTime: DateTime;
  proposedStartTime: DateTime;
}) {
  return BookingRescheduleGrant.updateOrCreate(
    { toolCallId: input.toolCallId, customerId: input.customerId },
    {
      runId: input.runId,
      bookingId: input.bookingId,
      expectedStartTime: input.expectedStartTime.toUTC(),
      proposedStartTime: input.proposedStartTime.toUTC(),
      expiresAt: DateTime.now().plus({ minutes: GRANT_LIFETIME_MINUTES }),
    }
  );
}
