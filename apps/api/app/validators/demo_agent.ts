import vine from "@vinejs/vine";

const message = vine.object({
  role: vine.enum(["user", "assistant"]),
  content: vine.string().trim().minLength(1).maxLength(4_000),
});

export const createDemoChatValidator = vine.create({
  messages: vine.array(message).minLength(1).maxLength(30),
});

export const createDemoApprovalValidator = vine.create({
  runId: vine.string().trim().minLength(1).maxLength(200),
  toolCallId: vine.string().trim().minLength(1).maxLength(200),
  decision: vine.enum(["approve", "decline"]),
  reason: vine.string().trim().maxLength(4_000).optional(),
});
