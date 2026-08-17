import { BookingSchema } from "#database/schema";
import type { BookingStatus } from "#contracts/booking";
import Customer from "#models/customer";
import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

export default class Booking extends BookingSchema {
  declare status: BookingStatus;

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>;
}
