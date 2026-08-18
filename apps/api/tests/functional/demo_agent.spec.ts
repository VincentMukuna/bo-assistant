import Customer from "#models/customer";
import { readBookingCapability } from "#services/booking_capability";
import testUtils from "@adonisjs/core/services/test_utils";
import { test } from "@japa/runner";

function agentStream(chunks: unknown[]) {
  return new Response(
    `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
    { headers: { "content-type": "text/event-stream" } }
  );
}

async function createDemoCustomer() {
  return Customer.updateOrCreate(
    { email: "alice.morgan@example.com" },
    {
      name: "Alice Morgan",
      email: "alice.morgan@example.com",
      phone: "+1 555 0192",
      address: "1842 Pine Street",
      notes: "",
    }
  );
}

test.group("Demo business support agent", (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction());

  test("streams Mastra's native chat response and keeps the capability server-side", async ({
    assert,
    client,
  }) => {
    const customer = await createDemoCustomer();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = async (input, init) => {
      assert.equal(String(input), "http://localhost:4111/api/agents/business-support-agent/stream");
      const body = JSON.parse(String(init?.body)) as {
        messages: unknown[];
        requestContext: { bookingCapability: string; customerName: string };
      };
      assert.deepEqual(body.messages, [{ role: "user", content: "Move my booking." }]);
      assert.equal(body.requestContext.customerName, customer.name);
      assert.equal(
        readBookingCapability(`Bearer ${body.requestContext.bookingCapability}`)?.customerId,
        customer.id
      );

      return agentStream([
        {
          type: "tool-call-approval",
          runId: "run-123",
          payload: {
            toolCallId: "tool-123",
            toolName: "rescheduleBooking",
            args: {
              booking_id: 6,
              service: "Window track repair",
              staff: "Noah",
              current_start_time: "2026-08-20T22:00:00.000+00:00",
              new_start_time: "2026-08-21T14:00:00-07:00",
            },
          },
        },
      ]);
    };

    try {
      const response = await client
        .post("/api/v1/demo/chats")
        .json({ messages: [{ role: "user", content: "Move my booking." }] });

      response.assertStatus(200);
      assert.include(response.header("content-type"), "text/event-stream");
      assert.include(response.text(), '"type":"tool-call-approval"');
      assert.include(response.text(), '"runId":"run-123"');
      assert.notProperty(response.headers(), "x-demo-chat-protocol");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("forwards native approval decisions and an optional decline reason", async ({
    assert,
    client,
  }) => {
    await createDemoCustomer();
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];

    globalThis.fetch = async (input, init) => {
      requests.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>,
      });
      return agentStream([
        { type: "text-delta", payload: { text: "Thanks, I’ll propose another time." } },
      ]);
    };

    try {
      const declined = await client.post("/api/v1/demo/approvals").json({
        runId: "run-123",
        toolCallId: "tool-123",
        decision: "decline",
        reason: "No, let's do 3 PM instead.",
      });
      const approved = await client.post("/api/v1/demo/approvals").json({
        runId: "run-456",
        toolCallId: "tool-456",
        decision: "approve",
      });

      declined.assertStatus(200);
      approved.assertStatus(200);
      assert.isTrue(requests[0].url.endsWith("/decline-tool-call"));
      assert.deepInclude(requests[0].body, {
        runId: "run-123",
        toolCallId: "tool-123",
        reason: "No, let's do 3 PM instead.",
      });
      assert.isTrue(requests[1].url.endsWith("/approve-tool-call"));
      assert.deepInclude(requests[1].body, {
        runId: "run-456",
        toolCallId: "tool-456",
      });
      assert.notProperty(requests[1].body, "reason");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
