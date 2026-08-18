import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";

test.group("Agent activity", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("requires owner authentication", async ({ client }) => {
    const response = await client.get("/api/v1/agent-activities");
    response.assertStatus(401);
  });

  test("returns durable activity with live workload metrics", async ({ assert, client }) => {
    const owner = await User.create({
      fullName: "Kim Lewis",
      email: `${crypto.randomUUID()}@example.com`,
      password: "password123",
    });
    const customer = await Customer.create({
      name: "Alice Morgan",
      email: `${crypto.randomUUID()}@example.com`,
      phone: "+1 555 0100",
      address: "1842 Pine Street",
      notes: "Use the side gate",
    });
    const conversation = await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: customer.id,
      title: "Move a booking",
      status: "open",
      nextStepOwner: "owner",
    });
    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "milestone",
      summary: "Agent handled the latest customer request",
      detail: "No owner decision was required.",
    });
    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "attention",
      summary: "Business approval needed",
      detail: "The calendar remains unchanged.",
    });

    const response = await client.get("/api/v1/agent-activities").withGuard("web").loginAs(owner);

    response.assertStatus(200);
    const body = response.body() as {
      metrics: { needsOwner: number; completedToday: number };
      activities: Array<Record<string, any>>;
    };
    assert.isAtLeast(body.metrics.needsOwner, 1);
    assert.isAtLeast(body.metrics.completedToday, 1);
    const activity = body.activities.find(
      (item) =>
        item.summary === "Business approval needed" && item.conversation.id === conversation.id
    );
    if (!activity) throw new Error("Expected the durable attention event in the activity feed");
    assert.equal(activity.category, "attention");
    assert.equal(activity.conversation.title, "Move a booking");
    assert.equal(activity.customer.id, customer.id);
    assert.equal(activity.customer.name, "Alice Morgan");
    assert.equal(activity.customer.initials, "AM");
  });
});
