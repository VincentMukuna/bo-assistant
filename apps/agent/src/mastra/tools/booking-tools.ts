import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const bookingCapabilitySchema = z.object({
  bookingCapability: z.string().min(1),
});

const bookingSchema = z.object({
  booking_id: z.number().int().positive(),
  service: z.string(),
  staff: z.string(),
  start_time: z.string(),
  duration_minutes: z.number().int().positive(),
  status: z.string(),
});

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

export const findBookingsForCustomer = createTool({
  id: "find_bookings_for_customer",
  description:
    "Find the authenticated customer's appointments in an ISO timestamp range. Use this before choosing a booking to reschedule.",
  inputSchema: z.object({
    from: z.string().describe("Inclusive ISO timestamp with timezone offset"),
    to: z.string().describe("Exclusive ISO timestamp with timezone offset"),
  }),
  outputSchema: z.object({ bookings: z.array(bookingSchema) }),
  requestContextSchema: bookingCapabilitySchema,
  execute: async (input, { requestContext }) => {
    return callBookingApi<{ bookings: z.infer<typeof bookingSchema>[] }>(
      "/api/v1/agent/bookings/find",
      input,
      requestContext.all.bookingCapability
    );
  },
});

export const rescheduleBooking = createTool({
  id: "reschedule_booking",
  description:
    "Reschedule one authenticated-customer booking after the customer has clearly confirmed the exact new date and time.",
  inputSchema: z.object({
    booking_id: z.number().int().positive(),
    new_start_time: z
      .string()
      .describe("The confirmed new appointment time as an ISO timestamp with timezone offset"),
  }),
  outputSchema: z.object({ booking: bookingSchema }),
  requestContextSchema: bookingCapabilitySchema,
  execute: async (input, { requestContext }) => {
    return callBookingApi<{ booking: z.infer<typeof bookingSchema> }>(
      "/api/v1/agent/bookings/reschedule",
      input,
      requestContext.all.bookingCapability
    );
  },
});
