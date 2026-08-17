import type Booking from "#models/booking";

export default async function deleteBooking(booking: Booking) {
  await booking.delete();
}
