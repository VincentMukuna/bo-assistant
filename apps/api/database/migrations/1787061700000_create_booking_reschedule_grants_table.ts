import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "booking_reschedule_grants";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.string("tool_call_id").primary();
      table.string("run_id").notNullable();
      table
        .integer("customer_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("customers")
        .onDelete("CASCADE");
      table
        .integer("booking_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("bookings")
        .onDelete("CASCADE");
      table.timestamp("expected_start_time").notNullable();
      table.timestamp("proposed_start_time").notNullable();
      table.timestamp("expires_at").notNullable();
      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").nullable();

      table.index(["customer_id", "tool_call_id"]);
      table.index(["expires_at"]);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
