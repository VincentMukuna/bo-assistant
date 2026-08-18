import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "support_conversations";

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp("first_message_at").nullable();
      table.string("last_message_preview", 500).nullable();
    });
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn("last_message_preview");
      table.dropColumn("first_message_at");
    });
  }
}
