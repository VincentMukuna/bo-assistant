import assert from "node:assert/strict";
import test from "node:test";
import {
  InvalidSupportApiResponse,
  InvalidSupportStream,
  SupportApiRejected,
  bootstrapCustomerSession,
  decideApproval,
  readBusinessSupportStream,
  sendCustomerReply,
} from "../lib/business-support-agent.ts";

test("bootstraps identity without sending a customer selector", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "/api/v1/demo/session");
    assert.equal(init.method, "POST");
    assert.equal(init.body, "{}");
    return Response.json({ customer: { name: "Alice Morgan" } });
  };
  try {
    const result = await bootstrapCustomerSession();
    assert.equal(result.status, "ok");
    assert.deepEqual(result.value, { customer: { name: "Alice Morgan" } });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes every composer reply through decline while an approval is pending", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ path: String(input), body: JSON.parse(String(init.body)) });
    return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
  };
  try {
    await sendCustomerReply("conversation-1", "yes", true);
    await sendCustomerReply("conversation-1", "Tuesday at 3 instead", true);
    await sendCustomerReply("conversation-1", "Hello", false);
    assert.deepEqual(requests, [
      {
        path: "/api/v1/support/conversations/conversation-1/approval-decisions",
        body: { decision: "decline", reason: "yes" },
      },
      {
        path: "/api/v1/support/conversations/conversation-1/approval-decisions",
        body: { decision: "decline", reason: "Tuesday at 3 instead" },
      },
      {
        path: "/api/v1/support/conversations/conversation-1/messages",
        body: { message: "Hello" },
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("approval decisions expose no run or tool-call locator", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    assert.deepEqual(JSON.parse(String(init.body)), { decision: "approve" });
    return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
  };
  try {
    await decideApproval("conversation-1", "approve");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("consumes native Mastra text streams", async () => {
  const response = new Response(
    [
      `data: ${JSON.stringify({ type: "text-delta", payload: { text: "Hello" } })}\n\n`,
      `data: ${JSON.stringify({ type: "text-delta", payload: { text: " there" } })}\n\n`,
      "data: [DONE]\n\n",
    ].join(""),
    { headers: { "content-type": "text/event-stream" } }
  );
  let text = "";
  await readBusinessSupportStream(response, (delta) => (text += delta));
  assert.equal(text, "Hello there");
});

test("returns a typed failure for malformed support API JSON", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("not json");
  try {
    const result = await bootstrapCustomerSession();
    assert.equal(result.status, "error");
    assert.ok(InvalidSupportApiResponse.is(result.error));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a typed rejection for non-success support responses", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ error: "Session expired." }, { status: 401 });
  try {
    const result = await bootstrapCustomerSession();
    assert.equal(result.status, "error");
    assert.ok(SupportApiRejected.is(result.error));
    assert.equal(result.error.status, 401);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("returns a typed failure for an empty support stream", async () => {
  const result = await readBusinessSupportStream(new Response(null), () => {});
  assert.equal(result.status, "error");
  assert.ok(InvalidSupportStream.is(result.error));
  assert.equal(result.error.reason, "empty");
});
