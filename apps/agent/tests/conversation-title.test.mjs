import assert from "node:assert/strict";
import test from "node:test";
import { conversationTitleAgent } from "@/agents/conversation-title.ts";

test("uses the nano title model with minimal reasoning", async () => {
  const model = await conversationTitleAgent.getModel();
  const options = await conversationTitleAgent.getDefaultOptions();

  assert.equal(model?.provider, "openai");
  assert.equal(model?.modelId, "gpt-5-nano");
  assert.equal(options.providerOptions?.openai?.reasoningEffort, "minimal");
  assert.equal(options.modelSettings?.maxOutputTokens, 32);
  assert.equal(options.modelSettings?.maxRetries, 0);
});
