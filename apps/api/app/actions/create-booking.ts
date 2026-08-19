import { BookingCustomerNotFound, BookingStoreUnavailable } from "#actions/booking_failures";
import Booking from "#models/booking";
import Customer from "#models/customer";
import type { CreateBookingPayload } from "#validators/booking";
import { Result } from "better-result";

export default async function createBooking(input: CreateBookingPayload) {
  return Result.gen(async function* () {
    const customer = yield* Result.await(
      Result.tryPromise({
        try: () => Customer.find(input.customerId),
        catch: (cause) =>
          new BookingStoreUnavailable({
            operation: "load-customer",
            cause,
            message: `Unable to load customer ${input.customerId} before creating a booking.`,
          }),
      })
    );
    if (!customer) {
      return Result.err(
        new BookingCustomerNotFound({
          customerId: input.customerId,
          message: `Customer ${input.customerId} was not found for the new booking.`,
        })
      );
    }

    const booking = yield* Result.await(
      Result.tryPromise({
        try: () => Booking.create(input),
        catch: (cause) =>
          new BookingStoreUnavailable({
            operation: "create",
            cause,
            message: `Unable to create a booking for customer ${input.customerId}.`,
          }),
      })
    );
    return Result.ok(booking);
  });
}
