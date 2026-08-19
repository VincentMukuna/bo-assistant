import assert from "node:assert/strict";
import test from "node:test";
import { businessSupportAgent } from "../src/mastra/agents/business-support-agent.ts";
import {
  BookingApiRejected,
  BookingApiUnavailable,
  InvalidBookingApiResponse,
  findBookingsForCustomer,
  rescheduleBooking,
} from "../src/mastra/tools/booking-tools.ts";

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
  assert.notEqual(findBookingsForCustomer.requireApproval, true);
  assert.equal(rescheduleBooking.requireApproval, true);
});

test("documents the API's 90-day booking search boundary for the model", () => {
  assert.match(findBookingsForCustomer.description, /no more than 90 days/i);
  const toDescription = findBookingsForCustomer.inputSchema.shape.to.description;
  assert.match(toDescription, /no more than 90 days/i);
});

test("accepts only authoritative reschedule identifiers and timestamps", () => {
  const parsed = rescheduleBooking.inputSchema.parse({
    booking_id: 6,
    expected_start_time: "2026-08-21T18:30:00Z",
    new_start_time: "2026-08-24T10:00:00-07:00",
    service: "browser-controlled service",
    staff: "browser-controlled staff",
  });

  assert.deepEqual(parsed, {
    booking_id: 6,
    expected_start_time: "2026-08-21T18:30:00Z",
    new_start_time: "2026-08-24T10:00:00-07:00",
  });
});

test("sends the approved mutation to the focused internal booking resource", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "http://localhost:3333/api/v1/agent/booking-reschedules");
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer read-capability");
    assert.deepEqual(JSON.parse(String(init.body)), {
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
    assert.equal(result.booking.booking_id, 6);
    assert.equal(result.booking.start_time_display, "Monday at 10:00 AM");
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
    await assert.rejects(
      () =>
        rescheduleBooking.execute(
          {
            booking_id: 6,
            expected_start_time: "2026-08-21T18:30:00Z",
            new_start_time: "2026-08-24T10:00:00-07:00",
          },
          context
        ),
      (error) => {
        assert.ok(BookingApiRejected.is(error));
        assert.equal(error.code, "STAFF_UNAVAILABLE");
        assert.equal(error.status, 409);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("rejects malformed booking success payloads as typed contract failures", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ booking: { booking_id: "wrong" } });
  try {
    await assert.rejects(
      () =>
        rescheduleBooking.execute(
          {
            booking_id: 6,
            expected_start_time: "2026-08-21T18:30:00Z",
            new_start_time: "2026-08-24T10:00:00-07:00",
          },
          context
        ),
      (error) => InvalidBookingApiResponse.is(error)
    );
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
    await assert.rejects(
      () =>
        rescheduleBooking.execute(
          {
            booking_id: 6,
            expected_start_time: "2026-08-21T18:30:00Z",
            new_start_time: "2026-08-24T10:00:00-07:00",
          },
          context
        ),
      (error) => BookingApiUnavailable.is(error)
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("configures persistent memory on the business support agent", async () => {
  assert.ok(await businessSupportAgent.getMemory());
});
