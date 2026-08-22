import Customer from "#models/customer";
import Booking from "#models/booking";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem, { type AttentionCause } from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { inboxEventStream } from "#services/inbox_event_stream";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

async function createOwner() {
  return User.create({
    fullName: "Kim Lewis",
    email: `${crypto.randomUUID()}@example.com`,
    password: "password123",
  });
}

async function createCustomer(name: string) {
  return Customer.create({
    name,
    email: `${crypto.randomUUID()}@example.com`,
    phone: "+1 555 0100",
    address: "1842 Pine Street",
    notes: "Use the side gate",
  });
}

async function createConversation(customer: Customer, title: string) {
  return SupportConversation.create({
    id: crypto.randomUUID(),
    customerId: customer.id,
    title,
    lastMessagePreview: title,
    firstMessageAt: DateTime.now(),
    status: "open",
  });
}

test.group("Workspace Inbox", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("protects every workspace Inbox resource with owner authentication", async ({ client }) => {
    const index = await client.get("/api/v1/inbox/conversations");
    const events = await client.get("/api/v1/inbox/events");
    const deletion = await client.delete(`/api/v1/inbox/conversations/${crypto.randomUUID()}`);
    index.assertStatus(401);
    events.assertStatus(401);
    deletion.assertStatus(401);
  });

  test("lists started conversations by operational responsibility and returns decision-ready context", async ({
    client,
  }) => {
    const owner = await createOwner();
    const alice = await createCustomer("Alice Morgan");
    const marcus = await createCustomer("Marcus Lee");
    const routine = await createConversation(marcus, "Pricing question");
    const visitor = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: null,
      visitorId: crypto.randomUUID(),
      title: "Window repair estimate",
      firstMessageAt: DateTime.now(),
      status: "open",
    });
    const emptyVisitorConversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: null,
      visitorId: crypto.randomUUID(),
      title: "New conversation",
      status: "open",
    });
    const needsOwner = await createConversation(alice, "Move a booking");
    needsOwner.nextStepOwner = "owner";
    await needsOwner.save();

    const causes: AttentionCause[] = ["authority", "judgment", "relationship", "failure"];
    for (const cause of causes) {
      await InboxAttentionItem.create({
        id: crypto.randomUUID(),
        conversationId: needsOwner.id,
        cause,
        actionType: cause === "authority" ? "booking_reschedule" : "owner_review",
        status: cause === "authority" ? "pending" : "completed",
        externalKey: `${needsOwner.id}:${cause}`,
        summary: `${cause} context is ready`,
        contextJson: JSON.stringify({
          service: "Deep home clean",
          proposedStartTime: "2026-08-25T17:00:00Z",
        }),
      });
    }
    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: needsOwner.id,
      kind: "attention",
      summary: "Business approval needed",
      detail: "The calendar remains unchanged.",
    });

    const response = await client
      .get("/api/v1/inbox/conversations")
      .withGuard("web")
      .loginAs(owner);
    response.assertStatus(200);
    const body = response.body() as { conversations: Array<Record<string, any>> };
    response.assertBodyContains({
      conversations: [
        {
          id: needsOwner.id,
          nextStepOwner: "owner",
          attention: {
            cause: "authority",
            summary: "authority context is ready",
            context: { service: "Deep home clean" },
          },
        },
      ],
    });
    const ids = body.conversations.map((conversation) => conversation.id);
    if (!ids.includes(routine.id)) throw new Error("Routine conversations must remain visible");
    if (ids.includes(emptyVisitorConversation.id)) {
      throw new Error("Conversations without a visitor message must stay out of the Inbox");
    }
    const visitorPayload = body.conversations.find(
      (conversation) => conversation.id === visitor.id
    );
    if (!visitorPayload) throw new Error("Anonymous visitor conversations must remain visible");
    if (visitorPayload.customer)
      throw new Error("Visitor conversations must not expose a customer");
    if (visitorPayload.contact.kind !== "visitor" || visitorPayload.contact.id !== null) {
      throw new Error("Visitor conversations must use visitor contact context");
    }
  });

  test("takeover pauses the agent, saves owner replies in the same thread, and can be released", async ({
    assert,
    client,
  }) => {
    const owner = await createOwner();
    const customer = await createCustomer("Alice Morgan");
    const conversation = await createConversation(customer, "Sensitive request");

    const takeover = await client
      .put(`/api/v1/inbox/conversations/${conversation.id}/ownership`)
      .withGuard("web")
      .loginAs(owner)
      .json({ handlingMode: "owner" });
    takeover.assertStatus(200);

    const customerMessage = await client
      .post(`/api/v1/support/conversations/${conversation.id}/messages`)
      .withSession({ customerId: customer.id })
      .json({ message: "Is anyone there?" });
    customerMessage.assertStatus(409);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/memory/save-messages");
      assert.equal(url.searchParams.get("agentId"), "business-support-agent");
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<Record<string, unknown>>;
      };
      assert.deepInclude(body.messages[0], {
        threadId: conversation.id,
        resourceId: `customer:${customer.id}`,
        role: "assistant",
        content: "I’m personally looking into this for you.",
        metadata: { author: "owner" },
      });
      return Response.json({ messages: body.messages });
    };

    try {
      const reply = await client
        .post(`/api/v1/inbox/conversations/${conversation.id}/messages`)
        .withGuard("web")
        .loginAs(owner)
        .json({ message: "I’m personally looking into this for you." });
      reply.assertStatus(201);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const release = await client
      .put(`/api/v1/inbox/conversations/${conversation.id}/ownership`)
      .withGuard("web")
      .loginAs(owner)
      .json({ handlingMode: "agent" });
    release.assertStatus(200);
    await conversation.refresh();
    assert.equal(conversation.handlingMode, "agent");
    assert.equal(conversation.nextStepOwner, "agent");
  });

  test("confirms a pending booking and notifies the customer in the same conversation", async ({
    assert,
    client,
  }) => {
    const owner = await createOwner();
    const customer = await createCustomer("Alice Morgan");
    const conversation = await createConversation(customer, "Book a deep clean");
    conversation.nextStepOwner = "owner";
    await conversation.save();
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Deep home clean",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-09-15T17:00:00Z"),
      durationMinutes: 120,
      status: "needs_approval",
      serviceAddress: customer.address,
    });
    const attention = await InboxAttentionItem.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      cause: "authority",
      actionType: "booking_confirmation",
      status: "pending",
      externalKey: "booking-creation:confirm-tool-1",
      summary: "Alice Morgan created a new Deep home clean booking",
      contextJson: JSON.stringify({ bookingId: booking.id }),
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/memory/save-messages");
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<Record<string, unknown>>;
      };
      assert.deepInclude(body.messages[0], {
        id: attention.id,
        threadId: conversation.id,
        resourceId: `customer:${customer.id}`,
        role: "assistant",
        content:
          "Your Deep home clean booking for Tuesday, September 15 at 10:00 AM has been confirmed.",
        metadata: { author: "owner" },
      });
      return Response.json({ messages: body.messages });
    };

    try {
      const response = await client
        .post(`/api/v1/inbox/conversations/${conversation.id}/attention/${attention.id}/decisions`)
        .withGuard("web")
        .loginAs(owner)
        .json({ decision: "approve" });
      response.assertStatus(200);
      response.assertBodyContains({ attention: { id: attention.id, status: "completed" } });
    } finally {
      globalThis.fetch = originalFetch;
    }

    await Promise.all([booking.refresh(), attention.refresh(), conversation.refresh()]);
    assert.equal(booking.status, "confirmed");
    assert.equal(attention.status, "completed");
    assert.equal(conversation.nextStepOwner, "none");
    assert.equal(conversation.outcomeStatus, "completed");
  });

  test("deletes an Inbox conversation and its activity while keeping customer bookings", async ({
    assert,
    client,
  }) => {
    const owner = await createOwner();
    const customer = await createCustomer("Alice Morgan");
    const conversation = await createConversation(customer, "Old question");
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Home cleaning",
      staff: "Unassigned",
      scheduledAt: DateTime.fromISO("2026-09-15T17:00:00Z"),
      durationMinutes: 120,
      status: "needs_approval",
      serviceAddress: customer.address,
    });
    const attention = await InboxAttentionItem.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      cause: "authority",
      actionType: "booking_confirmation",
      status: "pending",
      externalKey: "booking-creation:delete-tool-1",
      summary: "New booking",
      contextJson: JSON.stringify({ bookingId: booking.id }),
    });
    const annotation = await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "attention",
      summary: "New booking needs confirmation",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(init?.method, "DELETE");
      assert.equal(url.pathname, `/api/memory/threads/${conversation.id}`);
      assert.equal(url.searchParams.get("agentId"), "business-support-agent");
      assert.equal(url.searchParams.get("resourceId"), `customer:${customer.id}`);
      return new Response(null, { status: 204 });
    };

    try {
      const response = await client
        .delete(`/api/v1/inbox/conversations/${conversation.id}`)
        .withGuard("web")
        .loginAs(owner);
      response.assertStatus(204);
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.isNull(await SupportConversation.find(conversation.id));
    assert.isNull(await InboxAttentionItem.find(attention.id));
    assert.isNull(await InboxAnnotation.find(annotation.id));
    assert.isNotNull(await Booking.find(booking.id));
  });

  test("publishes a conversation-scoped live update for workspace reconciliation", ({ assert }) => {
    let received: unknown;
    const unsubscribe = inboxEventStream.subscribe((event) => {
      received = event;
    });
    inboxEventStream.publish("conversation-123");
    unsubscribe();
    assert.deepInclude(received, { type: "inbox.changed", conversationId: "conversation-123" });
  });
});
