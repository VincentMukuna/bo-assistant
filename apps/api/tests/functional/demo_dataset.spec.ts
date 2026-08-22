import { resetDemoDataset, seedDemoDataset } from "#database/demo_dataset";
import Booking from "#models/booking";
import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { buildOwnerBrief, OWNER_TIMEZONE } from "#services/owner_brief";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

test.group("Demo dataset", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("seeds a compact, idempotent production showcase without replacing users", async ({
    assert,
  }) => {
    const preservedUser = await User.create({
      fullName: "Existing Owner",
      email: "existing-owner@example.com",
      password: "keep-this-password",
    });
    await InboxAnnotation.query().delete();
    await InboxAttentionItem.query().delete();
    await SupportConversation.query().delete();
    await Booking.query().delete();
    await Customer.query().delete();

    const originalFetch = globalThis.fetch;
    const requests: Array<{ method: string; path: string }> = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      requests.push({ method: init?.method ?? "GET", path: url.pathname });
      return Response.json(init?.body ? JSON.parse(String(init.body)) : {});
    };

    try {
      await seedDemoDataset({ includeConversations: true });
      await seedDemoDataset({ includeConversations: true });
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.isNotNull(await User.find(preservedUser.id));
    assert.lengthOf(await Customer.all(), 5);
    assert.lengthOf(await Booking.all(), 6);
    assert.lengthOf(await SupportConversation.all(), 4);
    assert.lengthOf(await InboxAttentionItem.all(), 1);
    assert.lengthOf(await InboxAnnotation.all(), 4);

    const statuses = await Booking.query().orderBy("status").select("status");
    assert.deepEqual(
      statuses.map((booking) => booking.status),
      ["completed", "confirmed", "confirmed", "confirmed", "in_progress", "needs_approval"]
    );

    const brief = await buildOwnerBrief(DateTime.now().setZone(OWNER_TIMEZONE));
    assert.equal(brief.metrics.bookingsToday, 2);
    assert.equal(brief.metrics.needsDecision, 1);
    assert.equal(brief.metrics.operationalRisks, 0);
    assert.equal(brief.metrics.handledRecently, 1);

    assert.equal(
      requests.filter(
        (request) => request.method === "POST" && request.path === "/api/memory/threads"
      ).length,
      8
    );
    assert.equal(
      requests.filter(
        (request) => request.method === "POST" && request.path === "/api/memory/save-messages"
      ).length,
      8
    );
  });

  test("resets disposable activity while preserving every user account", async ({ assert }) => {
    const preservedUser = await User.create({
      fullName: "Permanent Demo Owner",
      email: "permanent-owner@example.com",
      password: "keep-this-password",
    });
    const staleCustomer = await Customer.create({
      name: "Stale Customer",
      email: "stale@example.com",
      phone: "+1 (415) 555-0100",
      address: "Old demo address",
      notes: "This record should be removed by the daily reset.",
      emailVerifiedAt: DateTime.now(),
    });
    await Booking.create({
      customerId: staleCustomer.id,
      service: "Stale booking",
      staff: "Nobody",
      scheduledAt: DateTime.now(),
      durationMinutes: 30,
      status: "confirmed",
      serviceAddress: staleCustomer.address,
    });

    const originalFetch = globalThis.fetch;
    const requests: Array<{ method: string; path: string }> = [];
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? "GET";
      requests.push({ method, path: url.pathname });

      if (method === "GET" && url.pathname === "/api/memory/threads") {
        return Response.json({
          threads: [{ id: "old-demo-thread", resourceId: "customer:old" }],
          hasMore: false,
        });
      }
      return Response.json({});
    };

    try {
      await resetDemoDataset({ includeConversations: true });
      await resetDemoDataset({ includeConversations: true });
    } finally {
      globalThis.fetch = originalFetch;
    }

    assert.isNotNull(await User.find(preservedUser.id));
    assert.isNull(await Customer.find(staleCustomer.id));
    assert.lengthOf(await Customer.all(), 5);
    assert.lengthOf(await Booking.all(), 6);
    assert.lengthOf(await SupportConversation.all(), 4);
    assert.lengthOf(await InboxAttentionItem.all(), 1);
    assert.lengthOf(await InboxAnnotation.all(), 4);
    assert.equal(
      requests.filter(
        (request) =>
          request.method === "DELETE" && request.path === "/api/memory/threads/old-demo-thread"
      ).length,
      2
    );
  });
});
