import { BookingCustomerNotFound, BookingStoreUnavailable } from "#actions/booking_failures";
import type Booking from "#models/booking";
import Customer from "#models/customer";
import type { UpdateBookingPayload } from "#validators/booking";
import { Result } from "better-result";

export default async function updateBooking(booking: Booking, input: UpdateBookingPayload) {
  return Result.gen(async function* () {
    if (input.customerId !== undefined) {
      const customer = yield* Result.await(
        Result.tryPromise({
          try: () => Customer.find(input.customerId!),
          catch: (cause) =>
            new BookingStoreUnavailable({
              operation: "load-customer",
              bookingId: booking.id,
              cause,
              message: `Unable to load customer ${input.customerId} before updating booking ${booking.id}.`,
            }),
        })
      );
      if (!customer) {
        return Result.err(
          new BookingCustomerNotFound({
            customerId: input.customerId,
            message: `Customer ${input.customerId} was not found for booking ${booking.id}.`,
          })
        );
      }
    }

    booking.merge(input);
    const saved = yield* Result.await(
      Result.tryPromise({
        try: async () => {
          await booking.save();
          return booking;
        },
        catch: (cause) =>
          new BookingStoreUnavailable({
            operation: "update",
            bookingId: booking.id,
            cause,
            message: `Unable to update booking ${booking.id}.`,
          }),
      })
    );
    return Result.ok(saved);
  });
}
