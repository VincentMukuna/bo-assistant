import { issueBookingCapability } from "#services/booking_capability";
import Booking from "#models/booking";
import Customer from "#models/customer";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

test.group("Agent booking tools", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("limits booking reads and writes to the capability customer", async ({
    assert,
    client,
    db,
  }) => {
    const alice = await Customer.create({
      name: "Alice Morgan",
      email: "alice-agent@example.com",
      phone: "+1 555 0101",
      address: "1 Pine Street",
      notes: "",
    });
    const bob = await Customer.create({
      name: "Bob Stone",
      email: "bob-agent@example.com",
      phone: "+1 555 0102",
      address: "2 Pine Street",
      notes: "",
    });

    const aliceBooking = await Booking.create({
      customerId: alice.id,
      service: "Deep home clean",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-09-01T17:00:00Z"),
      durationMinutes: 120,
      status: "confirmed",
      serviceAddress: alice.address,
    });
    const bobBooking = await Booking.create({
      customerId: bob.id,
      service: "Window repair",
      staff: "Noah",
      scheduledAt: DateTime.fromISO("2026-09-02T17:00:00Z"),
      durationMinutes: 60,
      status: "confirmed",
      serviceAddress: bob.address,
    });

    const capability = issueBookingCapability(alice.id);
    const found = await client
      .post("/api/v1/agent/bookings/find")
      .header("authorization", `Bearer ${capability}`)
      .json({ from: "2026-09-01T00:00:00Z", to: "2026-09-04T00:00:00Z" });

    found.assertStatus(200);
    found.assertBodyContains({
      bookings: [{ booking_id: aliceBooking.id, service: "Deep home clean" }],
    });
    const foundBookings = (found.body() as { bookings: Array<{ booking_id: number }> }).bookings;
    assert.deepEqual(
      foundBookings.map((booking) => booking.booking_id),
      [aliceBooking.id]
    );

    const otherCustomerUpdate = await client
      .post("/api/v1/agent/bookings/reschedule")
      .header("authorization", `Bearer ${capability}`)
      .json({ booking_id: bobBooking.id, new_start_time: "2026-09-10T10:00:00-07:00" });

    otherCustomerUpdate.assertStatus(404);

    const rescheduled = await client
      .post("/api/v1/agent/bookings/reschedule")
      .header("authorization", `Bearer ${capability}`)
      .json({ booking_id: aliceBooking.id, new_start_time: "2026-09-08T10:00:00-07:00" });

    rescheduled.assertStatus(200);
    rescheduled.assertBodyContains({
      booking: { booking_id: aliceBooking.id, start_time: "2026-09-08T17:00:00.000Z" },
    });
    await db.assertHas("bookings", {
      id: aliceBooking.id,
      scheduled_at: "2026-09-08 17:00:00",
    });
  });

  test("rejects booking tool calls without a valid capability", async ({ client }) => {
    const response = await client
      .post("/api/v1/agent/bookings/find")
      .json({ from: "2026-09-01T00:00:00Z", to: "2026-09-04T00:00:00Z" });

    response.assertStatus(401);
  });
});
