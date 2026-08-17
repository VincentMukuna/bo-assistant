import type Booking from '#models/booking'
import Customer from '#models/customer'
import type { CreateBookingInput } from '#actions/create-booking'

export default async function updateBooking(booking: Booking, input: Partial<CreateBookingInput>) {
  if (input.customerId !== undefined) {
    await Customer.findOrFail(input.customerId)
  }

  booking.merge(input)
  await booking.save()
  return booking
}
