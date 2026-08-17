import type Booking from "#models/booking";
import Customer from "#models/customer";
import type { UpdateBookingPayload } from "#validators/booking";

export default async function updateBooking(booking: Booking, input: UpdateBookingPayload) {
  if (input.customerId !== undefined) {
    await Customer.findOrFail(input.customerId);
  }

  booking.merge(input);
  await booking.save();
  return booking;
}
