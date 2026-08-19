import rescheduleBookingWithGrant from "#actions/reschedule-booking-with-grant";
import { serializeAgentBooking } from "#controllers/agent_booking_searches_controller";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

function parseOffsetDate(value: unknown) {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = DateTime.fromISO(value, { setZone: true });
  return date.isValid ? date : null;
}

function errorBody(code: string, message: string, retryable = false) {
  return { error: { code, message, retryable } };
}

export default class AgentBookingReschedulesController {
  async store({ request, response, bookingCapability, logger }: HttpContext) {
    const bookingId = Number(request.input("booking_id"));
    const toolCallId = request.input("tool_call_id");
    const proposedStartTime = parseOffsetDate(request.input("new_start_time"));
    if (!Number.isInteger(bookingId) || typeof toolCallId !== "string" || !proposedStartTime) {
      return response.badRequest(
        errorBody(
          "INVALID_RESCHEDULE_REQUEST",
          "booking_id, tool_call_id, and an ISO new_start_time with a timezone offset are required."
        )
      );
    }

    const result = await rescheduleBookingWithGrant({
      customerId: bookingCapability.customerId,
      bookingId,
      toolCallId,
      proposedStartTime,
    });

    if (result.status === "ok") {
      return { booking: serializeAgentBooking(result.value) };
    }

    return result.error.match({
      RescheduleNotAuthorized: () =>
        response.unauthorized(
          errorBody("RESCHEDULE_NOT_AUTHORIZED", "The booking change has not been approved.")
        ),
      InvalidRescheduleTime: () =>
        response.badRequest(
          errorBody("INVALID_RESCHEDULE_TIME", "The new appointment time must be in the future.")
        ),
      BookingNotFound: () =>
        response.notFound(errorBody("BOOKING_NOT_FOUND", "Booking not found.")),
      BookingNotReschedulable: (failure) =>
        response.conflict(
          errorBody(
            "BOOKING_NOT_RESCHEDULABLE",
            `A ${failure.status} booking cannot be rescheduled.`
          )
        ),
      BookingChangedSinceApproval: () =>
        response.conflict(
          errorBody(
            "BOOKING_CHANGED_SINCE_APPROVAL",
            "This booking changed after the customer approved the request."
          )
        ),
      StaffUnavailable: () =>
        response.conflict(
          errorBody("STAFF_UNAVAILABLE", "That staff member is already booked at this time.")
        ),
      BookingStoreUnavailable: (failure) => {
        logger.error(
          {
            err: failure,
            bookingId: failure.bookingId,
            operation: failure.operation,
          },
          "Unable to reschedule booking"
        );
        return response.serviceUnavailable(
          errorBody(
            "BOOKING_STORE_UNAVAILABLE",
            "The booking service is unavailable. The booking was not rescheduled.",
            true
          )
        );
      },
    });
  }
}
