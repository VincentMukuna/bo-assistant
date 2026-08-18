import assert from "node:assert/strict";
import test from "node:test";
import { businessSupportAgent } from "../src/mastra/agents/business-support-agent.ts";
import { findBookingsForCustomer, rescheduleBooking } from "../src/mastra/tools/booking-tools.ts";

const context = {
  requestContext: {
    all: {
      bookingCapability: "read-or-write-capability",
      currentDate: "2026-08-18",
      timezone: "America/Los_Angeles",
    },
  },
};

test("requires explicit approval only for the reschedule mutation", () => {
  assert.notEqual(findBookingsForCustomer.requireApproval, true);
  assert.equal(rescheduleBooking.requireApproval, true);
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
    assert.equal(new Headers(init.headers).get("authorization"), "Bearer read-or-write-capability");
    assert.deepEqual(JSON.parse(String(init.body)), {
      booking_id: 6,
      new_start_time: "2026-08-24T10:00:00-07:00",
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

test("configures persistent memory on the business support agent", async () => {
  assert.ok(await businessSupportAgent.getMemory());
});
