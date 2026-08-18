import {
  issueBookingReadCapability,
  issueBookingRescheduleCapability,
} from "#services/booking_capability";
import Booking from "#models/booking";
import Customer from "#models/customer";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

test.group("Agent booking resources", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("scopes booking searches to the read capability customer", async ({ assert, client }) => {
    const alice = await Customer.create({
      name: "Alice",
      email: "alice-agent@example.com",
      phone: "1",
      address: "1 Pine",
      notes: "",
    });
    const bob = await Customer.create({
      name: "Bob",
      email: "bob-agent@example.com",
      phone: "2",
      address: "2 Pine",
      notes: "",
    });
    const aliceBooking = await Booking.create({
      customerId: alice.id,
      service: "Deep clean",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-09-01T17:00:00Z"),
      durationMinutes: 120,
      status: "confirmed",
      serviceAddress: alice.address,
    });
    await Booking.create({
      customerId: bob.id,
      service: "Repair",
      staff: "Noah",
      scheduledAt: DateTime.fromISO("2026-09-02T17:00:00Z"),
      durationMinutes: 60,
      status: "confirmed",
      serviceAddress: bob.address,
    });

    const response = await client
      .post("/api/v1/agent/booking-searches")
      .header("authorization", `Bearer ${issueBookingReadCapability(alice.id)}`)
      .json({ from: "2026-09-01T00:00:00Z", to: "2026-09-04T00:00:00Z" });

    response.assertStatus(200);
    assert.deepEqual(
      (response.body() as { bookings: Array<{ booking_id: number }> }).bookings.map(
        (booking) => booking.booking_id
      ),
      [aliceBooking.id]
    );
  });

  test("executes only the exact approved reschedule and rejects replay after state changes", async ({
    client,
    db,
  }) => {
    const customer = await Customer.create({
      name: "Alice",
      email: "alice-write@example.com",
      phone: "1",
      address: "1 Pine",
      notes: "",
    });
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Deep clean",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-09-01T17:00:00Z"),
      durationMinutes: 120,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    const capability = issueBookingRescheduleCapability({
      customerId: customer.id,
      bookingId: booking.id,
      expectedStartTime: "2026-09-01T17:00:00Z",
      proposedStartTime: "2026-09-08T17:00:00Z",
      runId: "run-1",
      toolCallId: "tool-1",
    });

    const altered = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({ booking_id: booking.id, new_start_time: "2026-09-09T10:00:00-07:00" });
    altered.assertStatus(401);

    const accepted = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({ booking_id: booking.id, new_start_time: "2026-09-08T10:00:00-07:00" });
    accepted.assertStatus(200);
    await db.assertHas("bookings", { id: booking.id, scheduled_at: "2026-09-08 17:00:00" });

    const replay = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({ booking_id: booking.id, new_start_time: "2026-09-08T10:00:00-07:00" });
    replay.assertStatus(409);
  });

  test("rejects overlapping staff bookings, not only identical start times", async ({ client }) => {
    const customer = await Customer.create({
      name: "Alice",
      email: "alice-overlap@example.com",
      phone: "1",
      address: "1 Pine",
      notes: "",
    });
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Deep clean",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-09-01T17:00:00Z"),
      durationMinutes: 120,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    await Booking.create({
      customerId: customer.id,
      service: "Other",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-09-08T18:00:00Z"),
      durationMinutes: 120,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    const capability = issueBookingRescheduleCapability({
      customerId: customer.id,
      bookingId: booking.id,
      expectedStartTime: "2026-09-01T17:00:00Z",
      proposedStartTime: "2026-09-08T17:00:00Z",
      runId: "run-2",
      toolCallId: "tool-2",
    });

    const response = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({ booking_id: booking.id, new_start_time: "2026-09-08T10:00:00-07:00" });
    response.assertStatus(409);
  });

  test("does not accept a read capability for a write", async ({ client }) => {
    const response = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${issueBookingReadCapability(1)}`)
      .json({ booking_id: 1, new_start_time: "2026-09-08T10:00:00-07:00" });
    response.assertStatus(401);
  });
});
