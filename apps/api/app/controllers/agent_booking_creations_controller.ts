import createPendingBooking from "#actions/create-pending-booking";
import { serializeAgentBooking } from "#controllers/agent_booking_searches_controller";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

function errorBody(code: string, message: string, retryable = false) {
  return { error: { code, message, retryable } };
}

function trimmedString(value: unknown, min: number, max: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length >= min && result.length <= max ? result : null;
}

function parseOffsetDate(value: unknown) {
  if (typeof value !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = DateTime.fromISO(value, { setZone: true });
  return date.isValid ? date : null;
}

export default class AgentBookingCreationsController {
  async store({ request, response, bookingCapability, logger }: HttpContext) {
    const conversationId = bookingCapability.conversationId;
    const toolCallId = trimmedString(request.input("tool_call_id"), 1, 255);
    const service = trimmedString(request.input("service"), 2, 120);
    const staffInput = request.input("staff");
    const staff =
      staffInput === undefined ? undefined : (trimmedString(staffInput, 2, 120) ?? undefined);
    const scheduledAt = parseOffsetDate(request.input("start_time"));
    const durationInput = request.input("duration_minutes");
    const durationMinutes = durationInput === undefined ? undefined : Number(durationInput);
    if (
      !conversationId ||
      !toolCallId ||
      !service ||
      !scheduledAt ||
      (staffInput !== undefined && !staff) ||
      (durationMinutes !== undefined &&
        (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 1440))
    ) {
      return response.badRequest(
        errorBody(
          "INVALID_BOOKING_REQUEST",
          "service and an ISO start_time with a timezone offset are required; staff and duration_minutes must be valid when supplied."
        )
      );
    }

    const result = await createPendingBooking({
      customerId: bookingCapability.customerId,
      conversationId,
      toolCallId,
      service,
      staff,
      scheduledAt,
      durationMinutes,
    });
    if (result.status === "ok") {
      return { booking: serializeAgentBooking(result.value) };
    }

    return result.error.match({
      InvalidBookingTime: () =>
        response.badRequest(
          errorBody("INVALID_BOOKING_TIME", "The appointment time must be in the future.")
        ),
      BookingConversationNotFound: () =>
        response.notFound(errorBody("CONVERSATION_NOT_FOUND", "Conversation not found.")),
      BookingStaffUnavailable: (failure) =>
        response.conflict(errorBody("STAFF_UNAVAILABLE", failure.message)),
      PendingBookingStoreUnavailable: (failure) => {
        logger.error(
          { err: failure, operation: failure.operation, conversationId },
          "Unable to create pending booking"
        );
        return response.serviceUnavailable(
          errorBody(
            "BOOKING_STORE_UNAVAILABLE",
            "The booking could not be created right now.",
            true
          )
        );
      },
    });
  }
}
