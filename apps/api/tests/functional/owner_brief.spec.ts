import Booking from "#models/booking";
import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

async function setupOwnerOperation() {
  const owner = await User.create({
    fullName: "Kim Lewis",
    email: `${crypto.randomUUID()}@example.com`,
    password: "password123",
  });
  const customer = await Customer.create({
    name: "Alice Morgan",
    email: `${crypto.randomUUID()}@example.com`,
    phone: "+1 555 0192",
    address: "1842 Pine Street",
    notes: "Use the side gate",
  });
  return { owner, customer };
}

test.group("Owner brief", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("requires owner authentication", async ({ client }) => {
    const response = await client.get("/api/v1/owner-briefs");
    response.assertStatus(401);
  });

  test("turns live workspace state into a prioritized operating brief", async ({
    assert,
    client,
  }) => {
    const { owner, customer } = await setupOwnerOperation();
    const now = DateTime.now().setZone("America/Los_Angeles");
    await Booking.create({
      customerId: customer.id,
      service: "Window track repair",
      staff: "Noah",
      scheduledAt: now.plus({ hours: 1 }),
      durationMinutes: 90,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    await Booking.create({
      customerId: customer.id,
      service: "Deep home clean",
      staff: "Jamie + Rosa",
      scheduledAt: now.minus({ days: 2 }),
      durationMinutes: 180,
      status: "needs_approval",
      serviceAddress: customer.address,
    });
    await Booking.create({
      customerId: customer.id,
      service: "Door hinge repair",
      staff: "Eli",
      scheduledAt: now.minus({ days: 1 }),
      durationMinutes: 60,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    const conversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: customer.id,
      title: "Customer requested a person",
      status: "open",
      nextStepOwner: "owner",
    });
    await InboxAttentionItem.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      cause: "relationship",
      actionType: "owner_takeover",
      status: "pending",
      externalKey: crypto.randomUUID(),
      summary: "Alice asked to speak with Kim before work begins.",
      contextJson: "{}",
    });
    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "outcome",
      summary: "Booking details verified",
      detail: "The appointment remains confirmed.",
    });

    const response = await client.get("/api/v1/owner-briefs").withGuard("web").loginAs(owner);

    response.assertStatus(200);
    const body = response.body() as {
      headline: string;
      metrics: Record<string, number>;
      attentionItems: Array<Record<string, any>>;
      todaySchedule: Array<Record<string, any>>;
      watchItems: Array<Record<string, any>>;
      recentWins: Array<Record<string, any>>;
    };
    assert.isAtLeast(body.metrics.bookingsToday, 1);
    assert.isAtLeast(body.metrics.needsDecision, 2);
    assert.isAtLeast(body.metrics.operationalRisks, 1);
    assert.include(body.headline, "items");
    const relationshipAttention = body.attentionItems.find(
      (item) => item.id === `conversation:${conversation.id}`
    );
    assert.equal(relationshipAttention?.eyebrow, "Customer needs you");
    assert.equal(relationshipAttention?.link.href, `/inbox?conversation=${conversation.id}`);
    const todayBooking = body.todaySchedule.find((item) => item.service === "Window track repair");
    assert.equal(todayBooking?.customerName, "Alice Morgan");
    assert.equal(todayBooking?.note, "Use the side gate");
    assert.equal(todayBooking?.link.href, `/bookings?view=agenda&booking=${todayBooking?.id}`);
    const staleBooking = body.watchItems.find((item) =>
      String(item.title).includes("Door hinge repair")
    );
    if (!staleBooking) throw new Error("Expected the stale booking in the watchlist");
    assert.include(staleBooking.title, "still marked confirmed");
    const recentWin = body.recentWins.find((item) => item.summary === "Booking details verified");
    assert.equal(recentWin?.summary, "Booking details verified");
  });

  test("includes visitor conversations without requiring a customer record", async ({
    assert,
    client,
  }) => {
    const { owner } = await setupOwnerOperation();
    const conversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: null,
      visitorId: crypto.randomUUID(),
      title: "Website repair question",
      status: "open",
      nextStepOwner: "owner",
      outcomeStatus: "failed",
    });
    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "outcome",
      summary: "Visitor follow-up recorded",
    });

    const response = await client.get("/api/v1/owner-briefs").withGuard("web").loginAs(owner);

    response.assertStatus(200);
    const body = response.body() as {
      attentionItems: Array<{ id: string; customerName: string }>;
      watchItems: Array<{ id: string; detail: string }>;
      recentWins: Array<{ summary: string; customerName: string }>;
    };
    assert.equal(
      body.attentionItems.find((item) => item.id === `conversation:${conversation.id}`)
        ?.customerName,
      "Website visitor"
    );
    assert.include(
      body.watchItems.find((item) => item.id === `failed-conversation:${conversation.id}`)?.detail,
      "Website visitor"
    );
    assert.equal(
      body.recentWins.find((item) => item.summary === "Visitor follow-up recorded")?.customerName,
      "Website visitor"
    );
  });

  test("routes suggested questions through the operations model", async ({ assert, client }) => {
    const { owner, customer } = await setupOwnerOperation();
    const now = DateTime.now().setZone("America/Los_Angeles");
    await Booking.create({
      customerId: customer.id,
      service: "Window track repair",
      staff: "Noah",
      scheduledAt: now.plus({ hours: 1 }),
      durationMinutes: 90,
      status: "confirmed",
      serviceAddress: customer.address,
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
        requestContext: { briefJson: string; pageContextJson: string };
      };
      assert.equal(body.messages[0].content, "Prepare me for today");
      assert.include(body.requestContext.briefJson, "Window track repair");
      assert.deepEqual(JSON.parse(body.requestContext.pageContextJson), { surface: "overview" });
      return Response.json({ text: "You have one window repair today." });
    };

    try {
      const response = await client
        .post("/api/v1/owner-assistant/messages")
        .withGuard("web")
        .loginAs(owner)
        .json({ message: "Prepare me for today", surface: "overview" });

      response.assertStatus(200);
      assert.equal(response.body().mode, "agent");
      assert.equal(response.body().answer, "You have one window repair today.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("gives the model server-built context for the selected customer", async ({
    assert,
    client,
  }) => {
    const { owner, customer } = await setupOwnerOperation();
    await Booking.create({
      customerId: customer.id,
      service: "Window track repair",
      staff: "Noah",
      scheduledAt: DateTime.now().plus({ days: 1 }),
      durationMinutes: 90,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/agents/owner-operations-agent/generate");
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
        requestContext: { ownerName: string; briefJson: string; pageContextJson: string };
      };
      assert.equal(body.messages[0].content, "Give me your operating read");
      assert.equal(body.requestContext.ownerName, "Kim Lewis");
      const brief = JSON.parse(body.requestContext.briefJson) as Record<string, unknown>;
      assert.property(brief, "attentionItems");
      assert.property(brief, "todaySchedule");
      assert.notProperty(brief, "revenue");
      const pageContext = JSON.parse(body.requestContext.pageContextJson) as {
        surface: string;
        customer: { id: number; name: string; bookings: Array<{ service: string }> };
      };
      assert.equal(pageContext.surface, "customer");
      assert.equal(pageContext.customer.id, customer.id);
      assert.equal(pageContext.customer.name, "Alice Morgan");
      assert.equal(pageContext.customer.bookings[0]?.service, "Window track repair");
      return Response.json({ text: "The operation is quiet. No action is required." });
    };

    try {
      const response = await client
        .post("/api/v1/owner-assistant/messages")
        .withGuard("web")
        .loginAs(owner)
        .json({
          message: "Give me your operating read",
          surface: "customer",
          customerId: customer.id,
        });

      response.assertStatus(200);
      assert.equal(response.body().mode, "agent");
      assert.equal(response.body().answer, "The operation is quiet. No action is required.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("gives the model the selected Inbox conversation", async ({ assert, client }) => {
    const { owner, customer } = await setupOwnerOperation();
    const conversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: customer.id,
      title: "Move Friday's appointment",
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
      summary: "Confirm the requested appointment",
      contextJson: JSON.stringify({
        bookingId: 42,
        scheduledAt: "2026-08-18 21:30:00",
      }),
    });
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.includes(`/memory/threads/${conversation.id}/messages`)) {
        return Response.json({
          uiMessages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              content: "Could we move the appointment to Monday?",
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }

      assert.equal(url.pathname, "/api/agents/owner-operations-agent/generate");
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
        requestContext: { pageContextJson: string };
      };
      assert.equal(body.messages[0].content, "What should I reply?");
      const pageContext = JSON.parse(body.requestContext.pageContextJson) as {
        surface: string;
        conversation: {
          id: string;
          contact: string;
          nextStep: string;
          handling: string;
          messages: Array<{ sender: string; body: string }>;
          attentionItems: Array<{
            reason: string;
            status: string;
            context: Record<string, unknown>;
            link: { label: string; href: string };
          }>;
        };
      };
      assert.equal(pageContext.surface, "inbox");
      assert.equal(pageContext.conversation.id, conversation.id);
      assert.equal(pageContext.conversation.contact, "Alice Morgan");
      assert.equal(pageContext.conversation.nextStep, "Needs your response");
      assert.equal(pageContext.conversation.handling, "Oak is handling this conversation");
      assert.deepInclude(pageContext.conversation.messages[0], {
        sender: "customer",
        body: "Could we move the appointment to Monday?",
      });
      assert.deepEqual(pageContext.conversation.attentionItems[0]?.context, {
        scheduledAtDisplay: "Tue, Aug 18 at 2:30 PM PDT",
      });
      assert.equal(pageContext.conversation.attentionItems[0]?.reason, "Needs your approval");
      assert.equal(pageContext.conversation.attentionItems[0]?.status, "Waiting for you");
      assert.deepEqual(pageContext.conversation.attentionItems[0]?.link, {
        label: "Open booking",
        href: "/bookings?view=agenda&booking=42",
      });
      return Response.json({ text: "Confirm whether Monday morning or afternoon works best." });
    };

    try {
      const response = await client
        .post("/api/v1/owner-assistant/messages")
        .withGuard("web")
        .loginAs(owner)
        .json({
          message: "What should I reply?",
          surface: "inbox",
          conversationId: conversation.id,
        });

      response.assertStatus(200);
      assert.equal(
        response.body().answer,
        "Confirm whether Monday morning or afternoon works best."
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
