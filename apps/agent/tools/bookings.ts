import { createTool } from "@mastra/core/tools";
import { Result, TaggedError, panic, type Result as ResultType } from "better-result";
import { z } from "zod";
import { formatFriendlyDate, type InvalidDatePresentation } from "./format-date";

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

export class BookingApiUnavailable extends TaggedError("BookingApiUnavailable")<{
  operation: string;
  cause: unknown;
  message: string;
}> {}

export class BookingApiRejected extends TaggedError("BookingApiRejected")<{
  operation: string;
  status: number;
  code: string;
  retryable: boolean;
  message: string;
}> {}

export class InvalidBookingApiResponse extends TaggedError("InvalidBookingApiResponse")<{
  operation: string;
  status: number;
  cause?: unknown;
  message: string;
}> {}

type BookingApiError = BookingApiUnavailable | BookingApiRejected | InvalidBookingApiResponse;
type BookingToolError = BookingApiError | InvalidDatePresentation;

const bookingApiErrorSchema = z.object({
  error: z.union([
    z.string().transform((message) => ({
      code: "BOOKING_API_REJECTED",
      message,
      retryable: false,
    })),
    z.object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean(),
    }),
  ]),
});

function apiUrl() {
  return (process.env.API_URL ?? "http://localhost:3333").replace(/\/$/, "");
}

async function callBookingApi<T>(
  path: string,
  body: Record<string, unknown>,
  bookingCapability: string,
  schema: z.ZodType<T>
): Promise<ResultType<T, BookingApiError>> {
  const response = await Result.tryPromise({
    try: () =>
      fetch(`${apiUrl()}${path}`, {
        method: "POST",
        headers: {
          "authorization": `Bearer ${bookingCapability}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      }),
    catch: (cause) =>
      new BookingApiUnavailable({
        operation: path,
        cause,
        message: `Unable to call the booking API operation ${path}. The request did not complete.`,
      }),
  });
  if (response.status === "error") return response;

  const payload = await Result.tryPromise({
    try: () => response.value.json(),
    catch: (cause) =>
      new InvalidBookingApiResponse({
        operation: path,
        status: response.value.status,
        cause,
        message: `The booking API operation ${path} returned a non-JSON response with status ${response.value.status}.`,
      }),
  });
  if (payload.status === "error") return payload;

  if (!response.value.ok) {
    const failure = bookingApiErrorSchema.safeParse(payload.value);
    if (!failure.success) {
      return Result.err(
        new InvalidBookingApiResponse({
          operation: path,
          status: response.value.status,
          cause: failure.error,
          message: `The booking API operation ${path} returned an invalid error payload with status ${response.value.status}.`,
        })
      );
    }
    return Result.err(
      new BookingApiRejected({
        operation: path,
        status: response.value.status,
        ...failure.data.error,
      })
    );
  }

  const parsed = schema.safeParse(payload.value);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.err(
        new InvalidBookingApiResponse({
          operation: path,
          status: response.value.status,
          cause: parsed.error,
          message: `The booking API operation ${path} returned an invalid success payload.`,
        })
      );
}

function leaveBookingResult<T>(result: ResultType<T, BookingToolError>): T {
  if (result.status === "ok") return result.value;

  // Mastra models tool failure through a rejected execute callback. Keep this throw at the
  // framework edge so all application and transport code before it remains Result-based.
  throw result.error;
}

function presentBooking(booking: Booking, currentDate: string, timezone: string) {
  return formatFriendlyDate(booking.start_time, {
    currentDate,
    timezone,
  }).map((startTimeDisplay) => ({
    ...booking,
    start_time_display: startTimeDisplay,
  }));
}

export const findBookingsForCustomer = createTool({
  id: "find_bookings_for_customer",
  description:
    "Find the authenticated customer's appointments in an ISO timestamp range of no more than 90 days. Each result includes start_time_display, a customer-friendly date that must be used verbatim in replies. Use this before choosing a booking to reschedule.",
  inputSchema: z.object({
    from: z.string().describe("Inclusive ISO timestamp with timezone offset"),
    to: z
      .string()
      .describe("Exclusive ISO timestamp with timezone offset, no more than 90 days after from"),
  }),
  outputSchema: z.object({ bookings: z.array(presentedBookingSchema) }),
  requestContextSchema: bookingContextSchema,
  execute: async (input, { requestContext }) => {
    const result = leaveBookingResult(
      await callBookingApi(
        "/api/v1/agent/booking-searches",
        input,
        requestContext.all.bookingCapability,
        z.object({ bookings: z.array(bookingSchema) })
      )
    );

    return {
      bookings: leaveBookingResult(
        Result.all(
          result.bookings.map((booking) =>
            presentBooking(booking, requestContext.all.currentDate, requestContext.all.timezone)
          )
        )
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
  execute: async (input, context) => {
    const { booking_id, new_start_time } = input;
    const toolCallId = context.agent?.toolCallId;
    if (!toolCallId) {
      return panic(
        "The approval-required reschedule tool executed without Mastra providing a tool-call ID."
      );
    }

    const result = leaveBookingResult(
      await callBookingApi(
        "/api/v1/agent/booking-reschedules",
        { booking_id, new_start_time, tool_call_id: toolCallId },
        context.requestContext.all.bookingCapability,
        z.object({ booking: bookingSchema })
      )
    );

    return {
      booking: leaveBookingResult(
        presentBooking(
          result.booking,
          context.requestContext.all.currentDate,
          context.requestContext.all.timezone
        )
      ),
    };
  },
});
