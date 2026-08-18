import type Booking from "#models/booking";
import { BookingStoreUnavailable } from "#actions/booking_failures";
import { Result } from "better-result";

export default async function deleteBooking(booking: Booking) {
  return Result.tryPromise({
    try: () => booking.delete(),
    catch: (cause) =>
      new BookingStoreUnavailable({
        operation: "delete",
        bookingId: booking.id,
        cause,
        message: `Unable to delete booking ${booking.id}.`,
      }),
  });
}
