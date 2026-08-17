import vine from "@vinejs/vine";
import type { Infer, InferInput } from "@vinejs/vine/types";

const name = () => vine.string().trim().minLength(2).maxLength(120);
const email = () => vine.string().trim().email().maxLength(254);
const phone = () => vine.string().trim().minLength(5).maxLength(50);
const address = () => vine.string().trim().minLength(3).maxLength(255);
const notes = () => vine.string().trim().maxLength(5000);

export const createCustomerValidator = vine.create({
  name: name(),
  email: email().unique({ table: "customers", column: "email" }),
  phone: phone(),
  address: address(),
  notes: notes(),
});

export const updateCustomerValidator = vine.create({
  name: name().optional(),
  email: email().optional(),
  phone: phone().optional(),
  address: address().optional(),
  notes: notes().optional(),
});

export type CreateCustomerRequest = InferInput<typeof createCustomerValidator>;
export type CreateCustomerPayload = Infer<typeof createCustomerValidator>;
export type UpdateCustomerRequest = InferInput<typeof updateCustomerValidator>;
export type UpdateCustomerPayload = Infer<typeof updateCustomerValidator>;
