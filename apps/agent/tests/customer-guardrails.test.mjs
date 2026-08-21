import { expect, test } from "bun:test";
import { RequestContext } from "@mastra/core/request-context";
import { businessSupportAgent } from "@/agents/business-support.ts";
import {
  createCustomerInputGuardrails,
  createCustomerOutputGuardrails,
} from "@/agents/customer-guardrails.ts";

test("uses Mastra's built-in customer guardrails in a deliberate order", () => {
  expect(createCustomerInputGuardrails().map((processor) => processor.id)).toEqual([
    "unicode-normalizer",
    "regex-filter",
    "prompt-injection-detector",
    "token-limiter",
  ]);
  expect(createCustomerOutputGuardrails().map((processor) => processor.id)).toEqual([
    "token-limiter",
  ]);
});

test("normalizes hidden control characters before model-based checks", () => {
  const [normalizer] = createCustomerInputGuardrails();
  const messages = [
    {
      id: "message-1",
      role: "user",
      createdAt: new Date(),
      threadId: "thread-1",
      resourceId: "customer:1",
      content: {
        format: 2,
        parts: [{ type: "text", text: "  Book\u0000   tomorrow  " }],
      },
    },
  ];

  const result = normalizer.processInput({ messages, abort: () => undefined });

  expect(result[0].content.parts[0].text).toBe("Book tomorrow");
});

test("agent instructions keep booking authority with the authenticated customer", async () => {
  const requestContext = new RequestContext();
  requestContext.set("bookingCapability", "test-capability");
  requestContext.set("customerName", "Alice Morgan");
  requestContext.set("timezone", "America/Los_Angeles");
  requestContext.set("currentDate", "2026-08-21");

  const instructions = await businessSupportAgent.getInstructions({ requestContext });

  expect(instructions).toContain("authenticated customer identity above is authoritative");
  expect(instructions).toContain("do not call a booking tool");
  expect(instructions).toContain("A person's name is not a staff preference");
});
