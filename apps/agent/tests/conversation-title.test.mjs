import { expect, test } from "bun:test";
import { conversationTitleAgent } from "@/agents/conversation-title.ts";

test("uses the nano title model with minimal reasoning", async () => {
  const model = await conversationTitleAgent.getModel();
  const options = await conversationTitleAgent.getDefaultOptions();

  expect(model?.provider).toBe("openai");
  expect(model?.modelId).toBe("gpt-5-nano");
  expect(options.providerOptions?.openai?.reasoningEffort).toBe("minimal");
  expect(options.modelSettings?.maxOutputTokens).toBe(32);
  expect(options.modelSettings?.maxRetries).toBe(0);
});
