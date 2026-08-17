import type Customer from "#models/customer";
import { BaseTransformer } from "@adonisjs/core/transformers";

export default class CustomerTransformer extends BaseTransformer<Customer> {
  toObject() {
    return {
      id: this.resource.id,
      name: this.resource.name,
      initials: this.resource.initials,
      email: this.resource.email,
      phone: this.resource.phone,
      address: this.resource.address,
      notes: this.resource.notes,
      createdAt: this.resource.createdAt.toISO()!,
      updatedAt: this.resource.updatedAt?.toISO() ?? null,
    };
  }
}
