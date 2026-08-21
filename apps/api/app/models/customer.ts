import { CustomerSchema } from "#database/schema";
import Booking from "#models/booking";
import SupportConversation from "#models/support_conversation";
import { computed, hasMany } from "@adonisjs/lucid/orm";
import type { HasMany } from "@adonisjs/lucid/types/relations";

export default class Customer extends CustomerSchema {
  @hasMany(() => Booking)
  declare bookings: HasMany<typeof Booking>;

  @hasMany(() => SupportConversation)
  declare supportConversations: HasMany<typeof SupportConversation>;

  @computed()
  get initials() {
    return (this.name || this.email || "Guest")
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }
}
