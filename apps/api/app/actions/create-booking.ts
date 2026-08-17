import Booking from "#models/booking";
import Customer from "#models/customer";
import type { CreateBookingPayload } from "#validators/booking";

export default async function createBooking(input: CreateBookingPayload) {
  await Customer.findOrFail(input.customerId);

  return Booking.create({
    ...input,
  });
}
