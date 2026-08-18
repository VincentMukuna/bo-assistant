import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable("support_conversations", (table) => {
      table.string("next_step_owner").notNullable().defaultTo("agent");
      table.string("handling_mode").notNullable().defaultTo("agent");
      table.string("outcome_status").notNullable().defaultTo("active");
      table.text("outcome_summary").nullable();
    });

    this.schema.createTable("inbox_attention_items", (table) => {
      table.uuid("id").primary();
      table
        .uuid("conversation_id")
        .notNullable()
        .references("id")
        .inTable("support_conversations")
        .onDelete("CASCADE");
      table.string("cause").notNullable();
      table.string("action_type").notNullable();
      table.string("status").notNullable().defaultTo("pending");
      table.string("external_key").notNullable().unique();
      table.text("summary").notNullable();
      table.text("context_json").notNullable();
      table.text("outcome_summary").nullable();
      table
        .integer("decided_by_user_id")
        .unsigned()
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.timestamp("decided_at").nullable();
      table.timestamp("created_at").notNullable();
      table.timestamp("updated_at").nullable();

      table.index(["conversation_id", "status"]);
    });

    this.schema.createTable("inbox_annotations", (table) => {
      table.uuid("id").primary();
      table
        .uuid("conversation_id")
        .notNullable()
        .references("id")
        .inTable("support_conversations")
        .onDelete("CASCADE");
      table.string("kind").notNullable();
      table.text("summary").notNullable();
      table.text("detail").nullable();
      table.timestamp("created_at").notNullable();

      table.index(["conversation_id", "created_at"]);
    });
  }

  async down() {
    this.schema.dropTable("inbox_annotations");
    this.schema.dropTable("inbox_attention_items");
    this.schema.alterTable("support_conversations", (table) => {
      table.dropColumns("next_step_owner", "handling_mode", "outcome_status", "outcome_summary");
    });
  }
}
