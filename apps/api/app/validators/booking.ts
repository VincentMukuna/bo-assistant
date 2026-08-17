import { bookingStatuses } from "#contracts/booking";
import vine from "@vinejs/vine";
import type { Infer, InferInput } from "@vinejs/vine/types";

const customerId = () => vine.number().positive().withoutDecimals();
const service = () => vine.string().trim().minLength(2).maxLength(120);
const staff = () => vine.string().trim().minLength(2).maxLength(120);
const scheduledAt = () => vine.date({ formats: ["iso8601"] });
const durationMinutes = () => vine.number().positive().withoutDecimals().max(1440);
const status = () => vine.enum(bookingStatuses);
const serviceAddress = () => vine.string().trim().minLength(3).maxLength(255);

export const createBookingValidator = vine.create({
  customerId: customerId(),
  service: service(),
  staff: staff(),
  scheduledAt: scheduledAt(),
  durationMinutes: durationMinutes(),
  status: status(),
  serviceAddress: serviceAddress(),
});

export const updateBookingValidator = vine.create({
  customerId: customerId().optional(),
  service: service().optional(),
  staff: staff().optional(),
  scheduledAt: scheduledAt().optional(),
  durationMinutes: durationMinutes().optional(),
  status: status().optional(),
  serviceAddress: serviceAddress().optional(),
});

export type CreateBookingRequest = InferInput<typeof createBookingValidator>;
export type CreateBookingPayload = Infer<typeof createBookingValidator>;
export type UpdateBookingRequest = InferInput<typeof updateBookingValidator>;
export type UpdateBookingPayload = Infer<typeof updateBookingValidator>;
