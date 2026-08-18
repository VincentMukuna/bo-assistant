import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "support_conversations";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid("id").primary();
      table
        .integer("customer_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("customers")
        .onDelete("CASCADE");
      table.string("title").notNullable().defaultTo("Business support");
      table.string("status").notNullable().defaultTo("open");
      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").nullable();

      table.index(["customer_id", "updated_at"]);
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
