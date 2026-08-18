import createBooking from "#actions/create-booking";
import deleteBooking from "#actions/delete-booking";
import updateBooking from "#actions/update-booking";
import Booking from "#models/booking";
import BookingTransformer from "#transformers/booking_transformer";
import { createBookingValidator, updateBookingValidator } from "#validators/booking";
import type { HttpContext } from "@adonisjs/core/http";

export default class BookingsController {
  async index({ serialize }: HttpContext) {
    const bookings = await Booking.query().preload("customer").orderBy("scheduledAt");
    return serialize(BookingTransformer.transform(bookings));
  }

  async store({ request, response, serialize, logger }: HttpContext) {
    const payload = await request.validateUsing(createBookingValidator);
    const created = await createBooking(payload);
    if (created.status === "error") {
      return created.error.match({
        BookingCustomerNotFound: () =>
          response.notFound({ error: "The selected customer no longer exists." }),
        BookingStoreUnavailable: (failure) => {
          logger.error({ err: failure }, "Unable to create booking");
          return response.serviceUnavailable({
            error: "The booking could not be created right now.",
          });
        },
      });
    }
    const booking = created.value;
    await booking.load("customer");
    response.status(201);
    return serialize(BookingTransformer.transform(booking));
  }

  async show({ params, serialize }: HttpContext) {
    const booking = await Booking.query().where("id", params.id).preload("customer").firstOrFail();
    return serialize(BookingTransformer.transform(booking));
  }

  async update({ params, request, response, serialize, logger }: HttpContext) {
    const booking = await Booking.findOrFail(params.id);
    const payload = await request.validateUsing(updateBookingValidator);
    const updated = await updateBooking(booking, payload);
    if (updated.status === "error") {
      return updated.error.match({
        BookingCustomerNotFound: () =>
          response.notFound({ error: "The selected customer no longer exists." }),
        BookingStoreUnavailable: (failure) => {
          logger.error({ err: failure, bookingId: booking.id }, "Unable to update booking");
          return response.serviceUnavailable({
            error: "The booking could not be updated right now.",
          });
        },
      });
    }
    await booking.load("customer");
    return serialize(BookingTransformer.transform(booking));
  }

  async destroy({ params, response, logger }: HttpContext) {
    const booking = await Booking.findOrFail(params.id);
    const deleted = await deleteBooking(booking);
    if (deleted.status === "error") {
      logger.error({ err: deleted.error, bookingId: booking.id }, "Unable to delete booking");
      return response.serviceUnavailable({ error: "The booking could not be deleted right now." });
    }
    return response.noContent();
  }
}
