import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "bookings";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments("id").notNullable();
      table
        .integer("customer_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("customers")
        .onDelete("CASCADE");
      table.string("service").notNullable();
      table.string("staff").notNullable();
      table.timestamp("scheduled_at").notNullable();
      table.integer("duration_minutes").unsigned().notNullable().defaultTo(120);
      table.string("status").notNullable().defaultTo("confirmed");
      table.string("service_address").notNullable();
      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").nullable();

      table.index(["scheduled_at"]);
      table.index(["customer_id", "scheduled_at"]);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
