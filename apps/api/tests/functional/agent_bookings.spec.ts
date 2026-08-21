import createBookingRescheduleGrant from "#actions/create-booking-reschedule-grant";
import rescheduleBooking, {
  BookingChangedSinceApproval,
  BookingNotFound,
  BookingNotReschedulable,
  InvalidRescheduleTime,
} from "#actions/reschedule-booking";
import { issueBookingReadCapability } from "#services/booking_capability";
import Booking from "#models/booking";
import Customer from "#models/customer";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
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

  test("creates one pending booking and owner notification for an exact tool call", async ({
    assert,
    client,
  }) => {
    const customer = await Customer.create({
      name: "Alice",
      email: "alice-create@example.com",
      phone: "1",
      address: "1 Pine",
      notes: "",
    });
    const conversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: customer.id,
      title: "Book a deep clean",
      status: "open",
    });
    const capability = issueBookingReadCapability(customer.id, conversation.id);
    const request = {
      tool_call_id: "create-tool-1",
      service: "Home cleaning",
      start_time: "2026-09-15T10:00:00-07:00",
    };

    const created = await client
      .post("/api/v1/agent/booking-creations")
      .header("authorization", `Bearer ${capability}`)
      .json(request);
    created.assertStatus(200);
    created.assertBodyContains({
      booking: {
        service: "Home cleaning",
        staff: "Unassigned",
        duration_minutes: 120,
        status: "needs_approval",
      },
    });

    const retried = await client
      .post("/api/v1/agent/booking-creations")
      .header("authorization", `Bearer ${capability}`)
      .json(request);
    retried.assertStatus(200);
    assert.equal(retried.body().booking.booking_id, created.body().booking.booking_id);
    assert.equal(
      await Booking.query()
        .where("customerId", customer.id)
        .count("* as total")
        .then((rows) => Number(rows[0].$extras.total)),
      1
    );

    const attention = await InboxAttentionItem.findByOrFail(
      "externalKey",
      "booking-creation:create-tool-1"
    );
    assert.equal(attention.actionType, "booking_confirmation");
    assert.equal(attention.status, "pending");
    assert.equal(attention.context.bookingId, created.body().booking.booking_id);
    await conversation.refresh();
    assert.equal(conversation.nextStepOwner, "owner");
  });

  test("executes only the exact approved reschedule and makes exact retries idempotent", async ({
    assert,
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
    await createBookingRescheduleGrant({
      customerId: customer.id,
      bookingId: booking.id,
      expectedStartTime: DateTime.fromISO("2026-09-01T17:00:00Z"),
      proposedStartTime: DateTime.fromISO("2026-09-08T17:00:00Z"),
      runId: "run-1",
      toolCallId: "tool-1",
    });
    const capability = issueBookingReadCapability(customer.id);

    const altered = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({
        booking_id: booking.id,
        tool_call_id: "tool-1",
        new_start_time: "2026-09-09T10:00:00-07:00",
      });
    altered.assertStatus(401);
    assert.deepEqual(altered.body(), {
      error: {
        code: "RESCHEDULE_NOT_AUTHORIZED",
        message: "The booking change has not been approved.",
        retryable: false,
      },
    });

    const accepted = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({
        booking_id: booking.id,
        tool_call_id: "tool-1",
        new_start_time: "2026-09-08T10:00:00-07:00",
      });
    accepted.assertStatus(200);
    await db.assertHas("bookings", { id: booking.id, scheduled_at: "2026-09-08 17:00:00" });

    const replay = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({
        booking_id: booking.id,
        tool_call_id: "tool-1",
        new_start_time: "2026-09-08T10:00:00-07:00",
      });
    replay.assertStatus(200);
  });

  test("rejects overlapping staff bookings, not only identical start times", async ({
    assert,
    client,
  }) => {
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
    await createBookingRescheduleGrant({
      customerId: customer.id,
      bookingId: booking.id,
      expectedStartTime: DateTime.fromISO("2026-09-01T17:00:00Z"),
      proposedStartTime: DateTime.fromISO("2026-09-08T17:00:00Z"),
      runId: "run-2",
      toolCallId: "tool-2",
    });
    const capability = issueBookingReadCapability(customer.id);

    const response = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${capability}`)
      .json({
        booking_id: booking.id,
        tool_call_id: "tool-2",
        new_start_time: "2026-09-08T10:00:00-07:00",
      });
    response.assertStatus(409);
    assert.deepEqual(response.body(), {
      error: {
        code: "STAFF_UNAVAILABLE",
        message: "That staff member is already booked at this time.",
        retryable: false,
      },
    });
  });

  test("does not accept a customer capability without an approval grant", async ({ client }) => {
    const response = await client
      .post("/api/v1/agent/booking-reschedules")
      .header("authorization", `Bearer ${issueBookingReadCapability(1)}`)
      .json({
        booking_id: 1,
        tool_call_id: "unapproved-tool",
        new_start_time: "2026-09-08T10:00:00-07:00",
      });
    response.assertStatus(401);
  });

  test("returns a named failure when the proposed time is not in the future", async ({
    assert,
  }) => {
    const result = await rescheduleBooking({
      customerId: 1,
      bookingId: 1,
      expectedStartTime: DateTime.now().minus({ days: 2 }),
      proposedStartTime: DateTime.now().minus({ days: 1 }),
    });

    assert.equal(result.status, "error");
    if (result.status === "error") assert.isTrue(InvalidRescheduleTime.is(result.error));
  });

  test("returns a named failure when the scoped booking is absent", async ({ assert }) => {
    const result = await rescheduleBooking({
      customerId: 999,
      bookingId: 999,
      expectedStartTime: DateTime.fromISO("2026-09-01T17:00:00Z"),
      proposedStartTime: DateTime.fromISO("2026-09-08T17:00:00Z"),
    });

    assert.equal(result.status, "error");
    if (result.status === "error") assert.isTrue(BookingNotFound.is(result.error));
  });

  test("returns named failures for ineligible and stale bookings", async ({ assert }) => {
    const customer = await Customer.create({
      name: "Alice",
      email: "alice-state-errors@example.com",
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
      status: "completed",
      serviceAddress: customer.address,
    });

    const ineligible = await rescheduleBooking({
      customerId: customer.id,
      bookingId: booking.id,
      expectedStartTime: booking.scheduledAt,
      proposedStartTime: DateTime.fromISO("2026-09-08T17:00:00Z"),
    });
    assert.equal(ineligible.status, "error");
    if (ineligible.status === "error") {
      assert.isTrue(BookingNotReschedulable.is(ineligible.error));
    }

    booking.status = "confirmed";
    await booking.save();
    const stale = await rescheduleBooking({
      customerId: customer.id,
      bookingId: booking.id,
      expectedStartTime: DateTime.fromISO("2026-09-02T17:00:00Z"),
      proposedStartTime: DateTime.fromISO("2026-09-08T17:00:00Z"),
    });
    assert.equal(stale.status, "error");
    if (stale.status === "error") assert.isTrue(BookingChangedSinceApproval.is(stale.error));
  });
});
