import { BookingSchema } from "#database/schema";
import Customer from "#models/customer";
import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

export default class Booking extends BookingSchema {
  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>;
}
