import vine from "@vinejs/vine";

export const updateConversationOwnershipValidator = vine.create({
  handlingMode: vine.enum(["agent", "owner"]),
});

export const createOwnerMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(4_000),
});

export const createAttentionDecisionValidator = vine.create({
  decision: vine.enum(["approve", "decline"]),
  reason: vine.string().trim().maxLength(4_000).optional(),
});
