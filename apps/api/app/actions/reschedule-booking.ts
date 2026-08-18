import Booking from "#models/booking";
import db from "@adonisjs/lucid/services/db";
import { DateTime } from "luxon";

const RESCHEDULABLE_STATUSES = new Set(["confirmed", "needs_approval"]);
const DATABASE_TIMESTAMP_FORMAT = "yyyy-LL-dd HH:mm:ss";

export class BookingRescheduleError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404 | 409
  ) {
    super(message);
  }
}

export type RescheduleBookingInput = {
  customerId: number;
  bookingId: number;
  expectedStartTime: DateTime;
  proposedStartTime: DateTime;
};

export default async function rescheduleBooking(input: RescheduleBookingInput) {
  if (input.proposedStartTime <= DateTime.now()) {
    throw new BookingRescheduleError("The new appointment time must be in the future.", 400);
  }

  return db.transaction(async (trx) => {
    const booking = await Booking.query({ client: trx })
      .where("id", input.bookingId)
      .where("customerId", input.customerId)
      .forUpdate()
      .first();

    if (!booking) throw new BookingRescheduleError("Booking not found.", 404);
    if (!RESCHEDULABLE_STATUSES.has(booking.status)) {
      throw new BookingRescheduleError(`A ${booking.status} booking cannot be rescheduled.`, 409);
    }
    if (booking.scheduledAt.toUTC().toMillis() !== input.expectedStartTime.toUTC().toMillis()) {
      throw new BookingRescheduleError(
        "This booking changed after the customer approved the request.",
        409
      );
    }

    const proposedEnd = input.proposedStartTime.plus({ minutes: booking.durationMinutes });
    const staffBookings = await Booking.query({ client: trx })
      .whereNot("id", booking.id)
      .where("staff", booking.staff)
      .whereIn("status", ["confirmed", "needs_approval", "in_progress"])
      .where("scheduledAt", "<", proposedEnd.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT))
      .forUpdate();

    const hasOverlap = staffBookings.some(
      (candidate) =>
        candidate.scheduledAt.plus({ minutes: candidate.durationMinutes }) > input.proposedStartTime
    );
    if (hasOverlap) {
      throw new BookingRescheduleError("That staff member is already booked at this time.", 409);
    }

    booking.useTransaction(trx);
    booking.scheduledAt = input.proposedStartTime.toUTC();
    await booking.save();
    return booking;
  });
}
