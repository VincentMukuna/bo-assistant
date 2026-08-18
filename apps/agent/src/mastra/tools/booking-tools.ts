import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { formatFriendlyDate } from "../presentation/format-date";

const bookingContextSchema = z.object({
  bookingCapability: z.string().min(1),
  currentDate: z.string().min(1),
  timezone: z.string().min(1),
});

const bookingSchema = z.object({
  booking_id: z.number().int().positive(),
  service: z.string(),
  staff: z.string(),
  start_time: z.string(),
  duration_minutes: z.number().int().positive(),
  status: z.string(),
});

const presentedBookingSchema = bookingSchema.extend({
  start_time_display: z.string(),
});

type Booking = z.infer<typeof bookingSchema>;

function apiUrl() {
  return (process.env.API_URL ?? "http://localhost:3333").replace(/\/$/, "");
}

async function callBookingApi<T>(
  path: string,
  body: Record<string, unknown>,
  bookingCapability: string
): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${bookingCapability}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  const result = (await response.json().catch(() => null)) as { error?: unknown } | null;

  if (!response.ok) {
    const message =
      result && typeof result.error === "string"
        ? result.error
        : "The booking service rejected the request.";
    throw new Error(message);
  }

  return result as T;
}

function presentBooking(booking: Booking, currentDate: string, timezone: string) {
  return {
    ...booking,
    start_time_display: formatFriendlyDate(booking.start_time, {
      currentDate,
      timezone,
    }),
  };
}

export const findBookingsForCustomer = createTool({
  id: "find_bookings_for_customer",
  description:
    "Find the authenticated customer's appointments in an ISO timestamp range. Each result includes start_time_display, a customer-friendly date that must be used verbatim in replies. Use this before choosing a booking to reschedule.",
  inputSchema: z.object({
    from: z.string().describe("Inclusive ISO timestamp with timezone offset"),
    to: z.string().describe("Exclusive ISO timestamp with timezone offset"),
  }),
  outputSchema: z.object({ bookings: z.array(presentedBookingSchema) }),
  requestContextSchema: bookingContextSchema,
  execute: async (input, { requestContext }) => {
    const result = await callBookingApi<{ bookings: Booking[] }>(
      "/api/v1/agent/booking-searches",
      input,
      requestContext.all.bookingCapability
    );

    return {
      bookings: result.bookings.map((booking) =>
        presentBooking(booking, requestContext.all.currentDate, requestContext.all.timezone)
      ),
    };
  },
});

export const rescheduleBooking = createTool({
  id: "reschedule_booking",
  description:
    "Propose an exact reschedule for one authenticated-customer booking. The application asks the customer to approve the tool call before it executes. The result includes start_time_display, a customer-friendly date that must be used verbatim in replies.",
  requireApproval: true,
  inputSchema: z.object({
    booking_id: z.number().int().positive(),
    expected_start_time: z
      .string()
      .describe("The selected booking's current ISO start time with timezone offset"),
    new_start_time: z
      .string()
      .describe("The proposed new appointment time as an ISO timestamp with timezone offset"),
  }),
  outputSchema: z.object({ booking: presentedBookingSchema }),
  requestContextSchema: bookingContextSchema,
  execute: async (input, { requestContext }) => {
    const { booking_id, new_start_time } = input;
    const result = await callBookingApi<{ booking: Booking }>(
      "/api/v1/agent/booking-reschedules",
      { booking_id, new_start_time },
      requestContext.all.bookingCapability
    );

    return {
      booking: presentBooking(
        result.booking,
        requestContext.all.currentDate,
        requestContext.all.timezone
      ),
    };
  },
});
