import vine from "@vinejs/vine";

export const requestCustomerEmailVerificationValidator = vine.create({
  email: vine.string().trim().email().maxLength(254),
  name: vine.string().trim().maxLength(120).optional(),
});
