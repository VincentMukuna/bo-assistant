import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable("customer_email_verifications", (table) => {
      table.renameColumn("token_hash", "code_hash");
      table.integer("failed_attempts").unsigned().notNullable().defaultTo(0);
    });
  }

  async down() {
    this.schema.alterTable("customer_email_verifications", (table) => {
      table.renameColumn("code_hash", "token_hash");
      table.dropColumn("failed_attempts");
    });
  }
}
