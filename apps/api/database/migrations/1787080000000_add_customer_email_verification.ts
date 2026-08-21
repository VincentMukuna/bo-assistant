import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable("customers", (table) => {
      table.timestamp("email_verified_at").nullable();
    });

    this.schema.createTable("customer_email_verifications", (table) => {
      table.uuid("id").primary();
      table
        .integer("customer_id")
        .unsigned()
        .notNullable()
        .references("id")
        .inTable("customers")
        .onDelete("CASCADE");
      table.string("email", 254).notNullable();
      table.string("name").nullable();
      table.string("token_hash", 64).notNullable().unique();
      table.timestamp("expires_at").notNullable();
      table.timestamp("created_at").notNullable();

      table.index(["customer_id"]);
      table.index(["email"]);
      table.index(["expires_at"]);
    });
  }

  async down() {
    this.schema.dropTable("customer_email_verifications");

    this.schema.alterTable("customers", (table) => {
      table.dropColumn("email_verified_at");
    });
  }
}
