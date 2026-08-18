import Booking from "#models/booking";
import { readBookingCapability, type BookingCapability } from "#services/booking_capability";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

const RESCHEDULABLE_STATUSES = new Set(["confirmed", "needs_approval"]);
const DATABASE_TIMESTAMP_FORMAT = "yyyy-LL-dd HH:mm:ss";

function parseIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = DateTime.fromISO(value, { setZone: true });
  return date.isValid ? date : null;
}

function serializeBooking(booking: Booking) {
  return {
    booking_id: booking.id,
    service: booking.service,
    staff: booking.staff,
    start_time: booking.scheduledAt.toISO(),
    duration_minutes: booking.durationMinutes,
    status: booking.status,
  };
}

function authorize(authorization: string | undefined, scope: BookingCapability["scopes"][number]) {
  const capability = readBookingCapability(authorization);
  return capability?.scopes.includes(scope) ? capability : null;
}

export default class AgentBookingsController {
  async find({ request, response }: HttpContext) {
    const capability = authorize(request.header("authorization"), "find_bookings");
    if (!capability) return response.unauthorized({ error: "Invalid booking capability." });

    const from = parseIsoDate(request.input("from"));
    const to = parseIsoDate(request.input("to"));
    if (!from || !to || to <= from || to.diff(from, "days").days > 90) {
      return response.badRequest({
        error: "from and to must be valid ISO timestamps spanning no more than 90 days.",
      });
    }

    const bookings = await Booking.query()
      .where("customerId", capability.customerId)
      .whereBetween("scheduledAt", [
        from.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT),
        to.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT),
      ])
      .orderBy("scheduledAt");

    return { bookings: bookings.map(serializeBooking) };
  }

  async reschedule({ request, response }: HttpContext) {
    const capability = authorize(request.header("authorization"), "reschedule_booking");
    if (!capability) return response.unauthorized({ error: "Invalid booking capability." });

    const bookingId = Number(request.input("booking_id"));
    const rawStartTime = request.input("new_start_time");
    const newStartTime = parseIsoDate(rawStartTime);
    const includesOffset =
      typeof rawStartTime === "string" && /(?:Z|[+-]\d{2}:\d{2})$/i.test(rawStartTime);

    if (!Number.isInteger(bookingId) || bookingId < 1 || !newStartTime || !includesOffset) {
      return response.badRequest({
        error: "booking_id and an ISO new_start_time with a timezone offset are required.",
      });
    }

    if (newStartTime <= DateTime.now()) {
      return response.badRequest({ error: "The new appointment time must be in the future." });
    }

    const booking = await Booking.query()
      .where("id", bookingId)
      .where("customerId", capability.customerId)
      .first();

    if (!booking) return response.notFound({ error: "Booking not found." });
    if (!RESCHEDULABLE_STATUSES.has(booking.status)) {
      return response.conflict({ error: `A ${booking.status} booking cannot be rescheduled.` });
    }

    const conflictingBooking = await Booking.query()
      .whereNot("id", booking.id)
      .where("staff", booking.staff)
      .where("scheduledAt", newStartTime.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT))
      .first();

    if (conflictingBooking) {
      return response.conflict({ error: "That staff member is already booked at this time." });
    }

    booking.scheduledAt = newStartTime.toUTC();
    await booking.save();

    return { booking: serializeBooking(booking) };
  }
}
