import Booking from "#models/booking";
import Customer from "#models/customer";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { issueOwnerOperationsCapability } from "#services/owner_operations_capability";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

test.group("Owner operations record tools", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("reads only the conversation and booking records granted to Oak", async ({
    assert,
    client,
  }) => {
    const user = await User.create({
      fullName: "Kim Lewis",
      email: `${crypto.randomUUID()}@example.com`,
      password: "password123",
    });
    const customer = await Customer.create({
      name: "Alice Morgan",
      email: `${crypto.randomUUID()}@example.com`,
      phone: "+1 555 0192",
      address: "1842 Pine Street",
    });
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Deep home clean",
      staff: "Jamie + Rosa",
      scheduledAt: DateTime.fromISO("2026-08-18T14:30:00-07:00"),
      durationMinutes: 180,
      status: "needs_approval",
      serviceAddress: customer.address,
    });
    const conversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: customer.id,
      title: "Confirm Tuesday's deep clean",
      status: "open",
      nextStepOwner: "owner",
    });
    await InboxAttentionItem.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      cause: "authority",
      actionType: "booking_confirmation",
      status: "pending",
      externalKey: crypto.randomUUID(),
      summary: "Deep home clean is ready to confirm",
      contextJson: JSON.stringify({ bookingId: booking.id }),
    });

    const capability = issueOwnerOperationsCapability(user.id, {
      conversationIds: [conversation.id],
      bookingIds: [booking.id],
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.include(url.pathname, `/memory/threads/${conversation.id}/messages`);
      return Response.json({
        uiMessages: [
          {
            id: crypto.randomUUID(),
            role: "user",
            content: "Can you confirm Tuesday afternoon?",
            createdAt: "2026-08-18T18:00:00.000Z",
          },
        ],
      });
    };

    try {
      const conversationResponse = await client
        .get(`/api/v1/agent/operations/conversations/${conversation.id}`)
        .header("authorization", `Bearer ${capability}`);
      conversationResponse.assertStatus(200);
      conversationResponse.assertBodyContains({
        conversation: {
          id: conversation.id,
          contact: "Alice Morgan",
          nextStep: "Needs your response",
          messages: [{ sender: "customer", body: "Can you confirm Tuesday afternoon?" }],
        },
      });

      const bookingResponse = await client
        .get(`/api/v1/agent/operations/bookings/${booking.id}`)
        .header("authorization", `Bearer ${capability}`);
      bookingResponse.assertStatus(200);
      bookingResponse.assertBodyContains({
        booking: {
          id: booking.id,
          customer: "Alice Morgan",
          staff: "Jamie + Rosa",
          scheduledAtDisplay: "Tue, Aug 18 at 2:30 PM PDT",
          durationMinutes: 180,
          status: "needs_approval",
        },
      });

      const forbidden = await client
        .get("/api/v1/agent/operations/bookings/999999")
        .header("authorization", `Bearer ${capability}`);
      forbidden.assertStatus(403);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("rejects operations record reads without a capability", async ({ client }) => {
    const response = await client.get(`/api/v1/agent/operations/bookings/1`);
    response.assertStatus(401);
  });
});
