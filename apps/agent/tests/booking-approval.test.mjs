import { expect, test } from "bun:test";
import { businessSupportAgent } from "@/agents/business-support.ts";
import {
  BookingApiRejected,
  BookingApiUnavailable,
  InvalidBookingApiResponse,
  createBooking,
  findBookingsForCustomer,
  rescheduleBooking,
} from "@/tools/bookings.ts";

const context = {
  requestContext: {
    all: {
      bookingCapability: "read-capability",
      currentDate: "2026-08-18",
      timezone: "America/Los_Angeles",
    },
  },
  agent: { toolCallId: "approved-tool-call" },
};

test("requires explicit approval only for the reschedule mutation", () => {
  expect(createBooking.requireApproval).not.toBe(true);
  expect(findBookingsForCustomer.requireApproval).not.toBe(true);
  expect(rescheduleBooking.requireApproval).toBe(true);
});

test("creates a pending booking immediately through the focused internal resource", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe("http://localhost:3333/api/v1/agent/booking-creations");
    expect(JSON.parse(String(init.body))).toEqual({
      service: "Deep home clean",
      staff: "Jamie",
      start_time: "2026-08-25T10:00:00-07:00",
      duration_minutes: 120,
      tool_call_id: "approved-tool-call",
    });
    return Response.json({
      booking: {
        booking_id: 9,
        service: "Deep home clean",
        staff: "Jamie",
        start_time: "2026-08-25T17:00:00Z",
        duration_minutes: 120,
        status: "needs_approval",
      },
    });
  };

  try {
    const result = await createBooking.execute(
      {
        service: "Deep home clean",
        staff: "Jamie",
        start_time: "2026-08-25T10:00:00-07:00",
        duration_minutes: 120,
      },
      context
    );
    expect(result.booking.status).toBe("needs_approval");
    expect(result.booking.start_time_display).toBe("Tuesday, August 25 at 10:00 AM");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("documents the API's 90-day booking search boundary for the model", () => {
  expect(findBookingsForCustomer.description).toMatch(/no more than 90 days/i);
  const toDescription = findBookingsForCustomer.inputSchema.shape.to.description;
  expect(toDescription).toMatch(/no more than 90 days/i);
});

test("accepts only authoritative reschedule identifiers and timestamps", () => {
  const parsed = rescheduleBooking.inputSchema.parse({
    booking_id: 6,
    expected_start_time: "2026-08-21T18:30:00Z",
    new_start_time: "2026-08-24T10:00:00-07:00",
    service: "browser-controlled service",
    staff: "browser-controlled staff",
  });

  expect(parsed).toEqual({
    booking_id: 6,
    expected_start_time: "2026-08-21T18:30:00Z",
    new_start_time: "2026-08-24T10:00:00-07:00",
  });
});

test("sends the approved mutation to the focused internal booking resource", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe("http://localhost:3333/api/v1/agent/booking-reschedules");
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer read-capability");
    expect(JSON.parse(String(init.body))).toEqual({
      booking_id: 6,
      new_start_time: "2026-08-24T10:00:00-07:00",
      tool_call_id: "approved-tool-call",
    });
    return Response.json({
      booking: {
        booking_id: 6,
        service: "Window track repair",
        staff: "Noah",
        start_time: "2026-08-24T17:00:00Z",
        duration_minutes: 90,
        status: "confirmed",
      },
    });
  };

  try {
    const result = await rescheduleBooking.execute(
      {
        booking_id: 6,
        expected_start_time: "2026-08-21T18:30:00Z",
        new_start_time: "2026-08-24T10:00:00-07:00",
      },
      context
    );
    expect(result.booking.booking_id).toBe(6);
    expect(result.booking.start_time_display).toBe("Monday at 10:00 AM");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("preserves a typed booking rejection at the Mastra execution boundary", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json(
      {
        error: {
          code: "STAFF_UNAVAILABLE",
          message: "That staff member is already booked at this time.",
          retryable: false,
        },
      },
      { status: 409 }
    );

  try {
    const error = await rejectionOf(() =>
      rescheduleBooking.execute(
        {
          booking_id: 6,
          expected_start_time: "2026-08-21T18:30:00Z",
          new_start_time: "2026-08-24T10:00:00-07:00",
        },
        context
      )
    );
    expect(BookingApiRejected.is(error)).toBe(true);
    expect(error.code).toBe("STAFF_UNAVAILABLE");
    expect(error.status).toBe(409);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed booking success payloads as typed contract failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ booking: { booking_id: "wrong" } });
  try {
    const error = await rejectionOf(() =>
      rescheduleBooking.execute(
        {
          booking_id: 6,
          expected_start_time: "2026-08-21T18:30:00Z",
          new_start_time: "2026-08-24T10:00:00-07:00",
        },
        context
      )
    );
    expect(InvalidBookingApiResponse.is(error)).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("turns booking network rejection into a typed availability failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("connection refused");
  };
  try {
    const error = await rejectionOf(() =>
      rescheduleBooking.execute(
        {
          booking_id: 6,
          expected_start_time: "2026-08-21T18:30:00Z",
          new_start_time: "2026-08-24T10:00:00-07:00",
        },
        context
      )
    );
    expect(BookingApiUnavailable.is(error)).toBe(true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("configures persistent memory on the business support agent", async () => {
  expect(await businessSupportAgent.getMemory()).toBeTruthy();
});

async function rejectionOf(operation) {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error("Expected operation to reject");
}
