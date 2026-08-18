import Booking from "#models/booking";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

const DATABASE_TIMESTAMP_FORMAT = "yyyy-LL-dd HH:mm:ss";

function parseIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = DateTime.fromISO(value, { setZone: true });
  return date.isValid ? date : null;
}

export function serializeAgentBooking(booking: Booking) {
  return {
    booking_id: booking.id,
    service: booking.service,
    staff: booking.staff,
    start_time: booking.scheduledAt.toISO(),
    duration_minutes: booking.durationMinutes,
    status: booking.status,
  };
}

export default class AgentBookingSearchesController {
  async store({ request, response, bookingCapability }: HttpContext) {
    const from = parseIsoDate(request.input("from"));
    const to = parseIsoDate(request.input("to"));
    if (!from || !to || to <= from || to.diff(from, "days").days > 90) {
      return response.badRequest({
        error: "from and to must be valid ISO timestamps spanning no more than 90 days.",
      });
    }

    const bookings = await Booking.query()
      .where("customerId", bookingCapability.customerId)
      .whereBetween("scheduledAt", [
        from.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT),
        to.toUTC().toFormat(DATABASE_TIMESTAMP_FORMAT),
      ])
      .orderBy("scheduledAt");

    return { bookings: bookings.map(serializeAgentBooking) };
  }
}
