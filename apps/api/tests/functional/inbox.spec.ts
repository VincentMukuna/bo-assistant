import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem, { type AttentionCause } from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { inboxEventStream } from "#services/inbox_event_stream";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";

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
    status: "open",
  });
}

test.group("Workspace Inbox", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("protects every workspace Inbox resource with owner authentication", async ({ client }) => {
    const index = await client.get("/api/v1/inbox/conversations");
    const events = await client.get("/api/v1/inbox/events");
    index.assertStatus(401);
    events.assertStatus(401);
  });

  test("lists every conversation by operational responsibility and returns decision-ready context", async ({
    client,
  }) => {
    const owner = await createOwner();
    const alice = await createCustomer("Alice Morgan");
    const marcus = await createCustomer("Marcus Lee");
    const routine = await createConversation(marcus, "Pricing question");
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

  test("fails closed when persisted attention context is corrupt", async ({ assert, client }) => {
    const owner = await createOwner();
    const customer = await createCustomer("Invalid Context Customer");
    const conversation = await createConversation(customer, "Invalid attention context");
    conversation.nextStepOwner = "owner";
    await conversation.save();
    const attention = await InboxAttentionItem.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      cause: "authority",
      actionType: "booking_reschedule",
      status: "pending",
      externalKey: crypto.randomUUID(),
      summary: "Invalid context",
      contextJson: "{not-json",
    });

    const index = await client.get("/api/v1/inbox/conversations").withGuard("web").loginAs(owner);
    index.assertStatus(500);
    assert.deepEqual(index.body(), {
      error: "The Inbox contains an attention item that needs repair.",
    });

    const decision = await client
      .post(`/api/v1/inbox/conversations/${conversation.id}/attention/${attention.id}/decisions`)
      .withGuard("web")
      .loginAs(owner)
      .json({ decision: "approve" });
    decision.assertStatus(422);
    assert.deepEqual(decision.body(), {
      error: "This action contains invalid decision context and needs review.",
    });
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
