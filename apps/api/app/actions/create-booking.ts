import Booking from '#models/booking'
import Customer from '#models/customer'
import type { DateTime } from 'luxon'

export type BookingStatus = 'confirmed' | 'needs_approval' | 'in_progress' | 'completed'

export type CreateBookingInput = {
  customerId: number
  service: string
  staff: string
  scheduledAt: DateTime
  durationMinutes: number
  status: BookingStatus
  serviceAddress: string
}

export default async function createBooking(input: CreateBookingInput) {
  await Customer.findOrFail(input.customerId)

  return Booking.create({
    ...input,
  })
}
