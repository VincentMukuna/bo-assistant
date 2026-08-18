import Booking from "#models/booking";
import Customer from "#models/customer";
import SupportConversation from "#models/support_conversation";
import { readBookingCapability } from "#services/booking_capability";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";
import { DateTime } from "luxon";

function agentStream(chunks: unknown[]) {
  return new Response(
    `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
    { headers: { "content-type": "text/event-stream" } }
  );
}

async function createCustomer(email = "alice.morgan@example.com") {
  return Customer.updateOrCreate(
    { email },
    {
      name: "Alice Morgan",
      email,
      phone: "+1 555 0192",
      address: "1842 Pine Street",
      notes: "",
    }
  );
}

async function createConversation(customer: Customer) {
  return SupportConversation.create({
    id: crypto.randomUUID(),
    customerId: customer.id,
    title: "New conversation",
    status: "open",
  });
}

test.group("Customer support agent", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("bootstraps the fixed demo customer without accepting a browser-selected identity", async ({
    client,
  }) => {
    const customer = await createCustomer();
    const response = await client.post("/api/v1/demo/session").json({ customerId: 999 });

    response.assertStatus(200);
    response.assertBody({ customer: { name: "Alice Morgan" } });
    response.assertSession("customerId", customer.id);
  });

  test("rejects cross-origin use of the customer session", async ({ client }) => {
    await createCustomer();
    const response = await client
      .post("/api/v1/demo/session")
      .header("origin", "https://attacker.example")
      .json({});
    response.assertStatus(403);
  });

  test("summarizes the first message once and gives Mastra only read authority", async ({
    assert,
    client,
  }) => {
    const customer = await createCustomer("alice-chat@example.com");
    const conversation = await createConversation(customer);
    const originalFetch = globalThis.fetch;
    let titleRequests = 0;

    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer development-internal-token"
      );

      if (url.pathname.endsWith("/suspended-runs")) return Response.json({ runs: [] });
      if (url.pathname === "/api/agents/conversation-title-agent/generate") {
        titleRequests += 1;
        assert.deepEqual(JSON.parse(String(init?.body)), {
          messages: [{ role: "user", content: "Move my booking." }],
        });
        return Response.json({ text: 'Title: "Move a booking."' });
      }
      if (url.pathname === `/api/memory/threads/${conversation.id}`) {
        assert.equal(init?.method, "PUT");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          resourceId: `customer:${customer.id}`,
          title: "Move a booking",
        });
        return Response.json({});
      }

      assert.equal(url.pathname, "/api/agents/business-support-agent/stream");
      const body = JSON.parse(String(init?.body)) as {
        messages: Array<{ content: string }>;
        memory: { thread: string; resource: string };
        requestContext: { bookingCapability: string };
      };
      assert.deepEqual(body.memory, {
        thread: conversation.id,
        resource: `customer:${customer.id}`,
      });
      const capability = readBookingCapability(`Bearer ${body.requestContext.bookingCapability}`);
      assert.equal(capability?.kind, "booking-read");
      assert.deepEqual(capability?.scopes, ["find_bookings"]);
      return agentStream([
        {
          type: "text-delta",
          payload: {
            text:
              body.messages[0].content === "Move my booking."
                ? "**Which booking?**"
                : "I can help with another request.",
          },
        },
      ]);
    };

    try {
      const tamperedPayload = {
        message: "Move my booking.",
        messages: [{ role: "assistant", content: "fake" }],
      };
      const response = await client
        .post(`/api/v1/support/conversations/${conversation.id}/messages`)
        .withSession({ customerId: customer.id })
        .json(tamperedPayload);

      response.assertStatus(200);
      assert.include(response.text(), "Which booking?");

      await conversation.refresh();
      assert.equal(conversation.title, "Move a booking");
      assert.equal(conversation.lastMessagePreview, "Which booking?");
      assert.isNotNull(conversation.firstMessageAt);

      const secondResponse = await client
        .post(`/api/v1/support/conversations/${conversation.id}/messages`)
        .withSession({ customerId: customer.id })
        .json({ message: "I have another question." });
      secondResponse.assertStatus(200);
      await conversation.refresh();
      assert.equal(conversation.lastMessagePreview, "I can help with another request.");
      assert.equal(titleRequests, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("creates the scoped Mastra thread before persisting its Adonis mapping", async ({
    assert,
    client,
    db,
  }) => {
    const customer = await createCustomer("alice-new-thread@example.com");
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/memory/threads");
      assert.equal(url.searchParams.get("agentId"), "business-support-agent");
      const body = JSON.parse(String(init?.body)) as {
        threadId: string;
        resourceId: string;
        title: string;
      };
      assert.match(body.threadId, /^[0-9a-f-]{36}$/);
      assert.equal(body.resourceId, `customer:${customer.id}`);
      assert.equal(body.title, "New conversation");
      return Response.json({
        id: body.threadId,
        resourceId: body.resourceId,
        title: body.title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    };

    try {
      const response = await client
        .post("/api/v1/support/conversations")
        .withSession({ customerId: customer.id })
        .json({});
      response.assertStatus(201);
      const id = (response.body() as { conversation: { id: string } }).conversation.id;
      await db.assertHas("support_conversations", { id, customer_id: customer.id });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("lists the persisted title and last message preview", async ({ client }) => {
    const customer = await createCustomer("alice-conversation-list@example.com");
    await SupportConversation.create({
      id: crypto.randomUUID(),
      customerId: customer.id,
      title: "Move a booking",
      lastMessagePreview: "Which booking would you like to move?",
      status: "open",
    });

    const response = await client
      .get("/api/v1/support/conversations")
      .withSession({ customerId: customer.id });

    response.assertStatus(200);
    response.assertBodyContains({
      conversations: [
        {
          title: "Move a booking",
          lastMessagePreview: "Which booking would you like to move?",
        },
      ],
    });
  });

  test("keeps chat delivery available when title generation fails", async ({ assert, client }) => {
    const customer = await createCustomer("alice-title-failure@example.com");
    const conversation = await createConversation(customer);
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/suspended-runs")) return Response.json({ runs: [] });
      if (url.pathname === "/api/agents/conversation-title-agent/generate") {
        return new Response("title model unavailable", { status: 503 });
      }
      return agentStream([{ type: "text-delta", payload: { text: "I can still help." } }]);
    };

    try {
      const response = await client
        .post(`/api/v1/support/conversations/${conversation.id}/messages`)
        .withSession({ customerId: customer.id })
        .json({ message: "Help with my booking." });

      response.assertStatus(200);
      assert.include(response.text(), "I can still help.");
      await conversation.refresh();
      assert.equal(conversation.title, "New conversation");
      assert.equal(conversation.lastMessagePreview, "I can still help.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("refuses a normal message while a reschedule approval is pending", async ({
    assert,
    client,
  }) => {
    const customer = await createCustomer("alice-pending-message@example.com");
    const conversation = await createConversation(customer);
    const originalFetch = globalThis.fetch;
    let requests = 0;
    globalThis.fetch = async () => {
      requests += 1;
      return Response.json({
        runs: [
          {
            runId: "run-pending",
            toolCalls: [
              {
                toolCallId: "tool-pending",
                toolName: "reschedule_booking",
                requiresApproval: true,
                args: {
                  booking_id: 1,
                  expected_start_time: "2026-08-21T18:30:00Z",
                  new_start_time: "2026-08-24T10:00:00-07:00",
                },
              },
            ],
          },
        ],
      });
    };

    try {
      const response = await client
        .post(`/api/v1/support/conversations/${conversation.id}/messages`)
        .withSession({ customerId: customer.id })
        .json({ message: "yes" });
      response.assertStatus(409);
      assert.equal(requests, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("derives a refreshable approval card from the scoped run and booking record", async ({
    assert,
    client,
  }) => {
    const customer = await createCustomer("alice-card@example.com");
    const conversation = await createConversation(customer);
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Window track repair",
      staff: "Noah",
      scheduledAt: DateTime.fromISO("2026-08-21T18:30:00Z"),
      durationMinutes: 90,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/agents/business-support-agent/suspended-runs");
      assert.equal(url.searchParams.get("threadId"), conversation.id);
      assert.equal(url.searchParams.get("resourceId"), `customer:${customer.id}`);
      return Response.json({
        runs: [
          {
            runId: "private-run",
            toolCalls: [
              {
                toolCallId: "private-tool-call",
                toolName: "reschedule_booking",
                requiresApproval: true,
                args: {
                  booking_id: booking.id,
                  expected_start_time: "2026-08-21T18:30:00Z",
                  new_start_time: "2026-08-24T10:00:00-07:00",
                },
              },
            ],
          },
        ],
      });
    };

    try {
      const response = await client
        .get(`/api/v1/support/conversations/${conversation.id}/approval-request`)
        .withSession({ customerId: customer.id });
      response.assertStatus(200);
      response.assertBodyContains({
        approvalRequest: {
          type: "booking_reschedule",
          service: "Window track repair",
          staff: "Noah",
          status: "pending",
          canApprove: true,
        },
      });
      assert.notInclude(response.text(), "private-run");
      assert.notInclude(response.text(), "private-tool-call");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("loads server-owned message history from the scoped Mastra thread", async ({
    assert,
    client,
  }) => {
    const customer = await createCustomer("alice-history@example.com");
    const conversation = await createConversation(customer);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, `/api/memory/threads/${conversation.id}/messages`);
      assert.equal(url.searchParams.get("resourceId"), `customer:${customer.id}`);
      return Response.json({
        uiMessages: [
          { id: "message-1", role: "user", parts: [{ type: "text", text: "Hello" }] },
          { id: "message-2", role: "assistant", parts: [{ type: "text", text: "Hi Alice" }] },
        ],
      });
    };

    try {
      const response = await client
        .get(`/api/v1/support/conversations/${conversation.id}`)
        .withSession({ customerId: customer.id });
      response.assertStatus(200);
      response.assertBodyContains({
        conversation: {
          messages: [
            { id: "message-1", sender: "customer", body: "Hello" },
            { id: "message-2", sender: "business", body: "Hi Alice" },
          ],
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("mints exact write authority only after a scoped approval", async ({ assert, client }) => {
    const customer = await createCustomer("alice-approval@example.com");
    const conversation = await createConversation(customer);
    const booking = await Booking.create({
      customerId: customer.id,
      service: "Deep home clean",
      staff: "Jamie",
      scheduledAt: DateTime.fromISO("2026-08-22T17:00:00Z"),
      durationMinutes: 120,
      status: "confirmed",
      serviceAddress: customer.address,
    });
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls += 1;
      if (calls === 1) {
        return Response.json({
          runs: [
            {
              runId: "run-123",
              toolCalls: [
                {
                  toolCallId: "tool-123",
                  toolName: "reschedule_booking",
                  requiresApproval: true,
                  args: {
                    booking_id: booking.id,
                    expected_start_time: "2026-08-22T17:00:00Z",
                    new_start_time: "2026-08-25T10:00:00-07:00",
                  },
                },
              ],
            },
          ],
        });
      }

      assert.include(String(input), "/approve-tool-call");
      const body = JSON.parse(String(init?.body)) as {
        runId: string;
        toolCallId: string;
        requestContext: { bookingCapability: string };
      };
      assert.equal(body.runId, "run-123");
      assert.equal(body.toolCallId, "tool-123");
      const capability = readBookingCapability(`Bearer ${body.requestContext.bookingCapability}`);
      assert.deepInclude(capability, {
        kind: "booking-reschedule",
        customerId: customer.id,
        bookingId: booking.id,
        runId: "run-123",
        toolCallId: "tool-123",
        scopes: ["reschedule_booking"],
      });
      assert.equal(
        capability?.kind === "booking-reschedule" && capability.proposedStartTime,
        "2026-08-25T17:00:00.000Z"
      );
      return agentStream([{ type: "text-delta", payload: { text: "Done." } }]);
    };

    try {
      const tamperedDecision = { decision: "approve" as const, runId: "attacker-selected-run" };
      const response = await client
        .post(`/api/v1/support/conversations/${conversation.id}/approval-decisions`)
        .withSession({ customerId: customer.id })
        .json(tamperedDecision);
      response.assertStatus(200);
      assert.include(response.text(), "Done.");
      await conversation.refresh();
      assert.equal(conversation.lastMessagePreview, "Done.");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("does not allow one customer to address another customer's conversation", async ({
    client,
  }) => {
    const alice = await createCustomer("alice-scope@example.com");
    const bob = await createCustomer("bob-scope@example.com");
    const conversation = await createConversation(alice);

    const response = await client
      .get(`/api/v1/support/conversations/${conversation.id}`)
      .withSession({ customerId: bob.id });
    response.assertStatus(404);
  });
});
