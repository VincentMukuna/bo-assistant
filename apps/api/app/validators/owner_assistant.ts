import vine from "@vinejs/vine";

export const createOwnerAssistantMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(2_000),
  surface: vine.enum(["overview", "bookings", "customer", "inbox"]).optional(),
  customerId: vine.number().positive().withoutDecimals().optional(),
  conversationId: vine.string().uuid().optional(),
});
