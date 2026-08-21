import vine from "@vinejs/vine";

export const createOwnerAssistantMessageValidator = vine.create({
  message: vine.string().trim().minLength(1).maxLength(2_000),
  surface: vine.enum(["overview", "bookings", "customer"]).optional(),
  customerId: vine.number().positive().withoutDecimals().optional(),
});
