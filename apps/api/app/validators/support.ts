import vine from "@vinejs/vine";

export const createConversationMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(4_000),
});

export const createApprovalDecisionValidator = vine.create({
  decision: vine.enum(["approve", "decline"]),
  reason: vine.string().trim().maxLength(4_000).optional(),
});
