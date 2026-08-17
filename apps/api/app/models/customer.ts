import { CustomerSchema } from '#database/schema'
import Booking from '#models/booking'
import { computed, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Customer extends CustomerSchema {
  @hasMany(() => Booking)
  declare bookings: HasMany<typeof Booking>

  @computed()
  get initials() {
    return this.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase()
  }
}
