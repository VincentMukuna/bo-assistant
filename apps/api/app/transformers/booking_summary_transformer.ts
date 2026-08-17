import type Booking from "#models/booking";
import { BaseTransformer } from "@adonisjs/core/transformers";

export default class BookingSummaryTransformer extends BaseTransformer<Booking> {
  toObject() {
    return {
      id: this.resource.id,
      customerId: this.resource.customerId,
      service: this.resource.service,
      staff: this.resource.staff,
      scheduledAt: this.resource.scheduledAt.toISO()!,
      durationMinutes: this.resource.durationMinutes,
      status: this.resource.status,
      serviceAddress: this.resource.serviceAddress,
      createdAt: this.resource.createdAt.toISO()!,
      updatedAt: this.resource.updatedAt?.toISO() ?? null,
    };
  }
}
