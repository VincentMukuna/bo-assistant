import { expect, test } from "bun:test";
import {
  bootstrapCustomerSession,
  decideApproval,
  readBusinessSupportStream,
  sendConversationMessage,
} from "../lib/business-support-agent.ts";

test("bootstraps identity without sending a customer selector", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    expect(String(input)).toBe("/api/v1/demo/session");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
    return Response.json({ customer: { name: "Alice Morgan" } });
  };
  try {
    expect(await bootstrapCustomerSession()).toEqual({ customer: { name: "Alice Morgan" } });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("routes composer messages through the conversation resource", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ path: String(input), body: JSON.parse(String(init.body)) });
    return new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
  };
  try {
    await sendConversationMessage("conversation-1", "Hello");
    expect(requests).toEqual([
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
    expect(JSON.parse(String(init.body))).toEqual({ decision: "approve" });
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
  expect(text).toBe("Hello there");
});
