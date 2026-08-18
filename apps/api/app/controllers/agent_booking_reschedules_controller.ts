import rescheduleBooking, { BookingRescheduleError } from "#actions/reschedule-booking";
import { serializeAgentBooking } from "#controllers/agent_booking_searches_controller";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

function parseOffsetDate(value: unknown) {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = DateTime.fromISO(value, { setZone: true });
  return date.isValid ? date : null;
}

export default class AgentBookingReschedulesController {
  async store({ request, response, bookingCapability }: HttpContext) {
    if (bookingCapability.kind !== "booking-reschedule") {
      return response.unauthorized({ error: "A reschedule capability is required." });
    }

    const bookingId = Number(request.input("booking_id"));
    const proposedStartTime = parseOffsetDate(request.input("new_start_time"));
    const expectedStartTime = parseOffsetDate(bookingCapability.expectedStartTime);
    const authorizedStartTime = parseOffsetDate(bookingCapability.proposedStartTime);
    if (
      !Number.isInteger(bookingId) ||
      !proposedStartTime ||
      !expectedStartTime ||
      !authorizedStartTime
    ) {
      return response.badRequest({
        error: "booking_id and an ISO new_start_time with a timezone offset are required.",
      });
    }
    if (
      bookingId !== bookingCapability.bookingId ||
      proposedStartTime.toUTC().toMillis() !== authorizedStartTime.toUTC().toMillis()
    ) {
      return response.unauthorized({ error: "The request exceeds the approved booking change." });
    }

    try {
      const booking = await rescheduleBooking({
        customerId: bookingCapability.customerId,
        bookingId,
        expectedStartTime,
        proposedStartTime,
      });
      return { booking: serializeAgentBooking(booking) };
    } catch (error) {
      if (error instanceof BookingRescheduleError) {
        return response.status(error.status).send({ error: error.message });
      }
      throw error;
    }
  }
}
