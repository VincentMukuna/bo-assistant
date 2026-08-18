import {
  BookingRescheduleGrantError,
  default as rescheduleBookingWithGrant,
} from "#actions/reschedule-booking-with-grant";
import { BookingRescheduleError } from "#actions/reschedule-booking";
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
    const bookingId = Number(request.input("booking_id"));
    const toolCallId = request.input("tool_call_id");
    const proposedStartTime = parseOffsetDate(request.input("new_start_time"));
    if (!Number.isInteger(bookingId) || typeof toolCallId !== "string" || !proposedStartTime) {
      return response.badRequest({
        error:
          "booking_id, tool_call_id, and an ISO new_start_time with a timezone offset are required.",
      });
    }

    try {
      const booking = await rescheduleBookingWithGrant({
        customerId: bookingCapability.customerId,
        bookingId,
        toolCallId,
        proposedStartTime,
      });
      return { booking: serializeAgentBooking(booking) };
    } catch (error) {
      if (error instanceof BookingRescheduleGrantError) {
        return response.unauthorized({ error: error.message });
      }
      if (error instanceof BookingRescheduleError) {
        return response.status(error.status).send({ error: error.message });
      }
      throw error;
    }
  }
}
