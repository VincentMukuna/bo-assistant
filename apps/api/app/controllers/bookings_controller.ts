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

  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createBookingValidator);
    const booking = await createBooking(payload);
    await booking.load("customer");
    response.status(201);
    return serialize(BookingTransformer.transform(booking));
  }

  async show({ params, serialize }: HttpContext) {
    const booking = await Booking.query().where("id", params.id).preload("customer").firstOrFail();
    return serialize(BookingTransformer.transform(booking));
  }

  async update({ params, request, serialize }: HttpContext) {
    const booking = await Booking.findOrFail(params.id);
    const payload = await request.validateUsing(updateBookingValidator);
    await updateBooking(booking, payload);
    await booking.load("customer");
    return serialize(BookingTransformer.transform(booking));
  }

  async destroy({ params, response }: HttpContext) {
    const booking = await Booking.findOrFail(params.id);
    await deleteBooking(booking);
    return response.noContent();
  }
}
