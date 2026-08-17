import createBooking from "#actions/create-booking";
import deleteBooking from "#actions/delete-booking";
import updateBooking from "#actions/update-booking";
import Booking from "#models/booking";
import { createBookingValidator, updateBookingValidator } from "#validators/booking";
import type { HttpContext } from "@adonisjs/core/http";

export default class BookingsController {
  async index() {
    return Booking.query().preload("customer").orderBy("scheduledAt");
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createBookingValidator);
    const booking = await createBooking(payload);
    await booking.load("customer");
    return response.status(201).send(booking);
  }

  async show({ params }: HttpContext) {
    return Booking.query().where("id", params.id).preload("customer").firstOrFail();
  }

  async update({ params, request }: HttpContext) {
    const booking = await Booking.findOrFail(params.id);
    const payload = await request.validateUsing(updateBookingValidator);
    await updateBooking(booking, payload);
    await booking.load("customer");
    return booking;
  }

  async destroy({ params, response }: HttpContext) {
    const booking = await Booking.findOrFail(params.id);
    await deleteBooking(booking);
    return response.noContent();
  }
}
