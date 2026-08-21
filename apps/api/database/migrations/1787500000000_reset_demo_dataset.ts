import { businessSupportAgent } from "#services/business_support_agent";
import { BaseSchema } from "@adonisjs/lucid/schema";
import app from "@adonisjs/core/services/app";

export default class extends BaseSchema {
  async up() {
    // Production conversations span SQLite metadata and Mastra's Postgres memory store.
    // Clear the remote side first so a failure leaves the migration retryable.
    if (app.inProduction) await businessSupportAgent.deleteAllThreads();

    await this.db.from("inbox_annotations").delete();
    await this.db.from("inbox_attention_items").delete();
    await this.db.from("booking_reschedule_grants").delete();
    await this.db.from("customer_email_verifications").delete();
    await this.db.from("support_conversations").delete();
    await this.db.from("bookings").delete();
    await this.db.from("customers").delete();

    await this.db.rawQuery("DELETE FROM sqlite_sequence WHERE name IN ('bookings', 'customers')");
  }

  async down() {
    // This deliberately destructive demo reset cannot reconstruct discarded records.
  }
}
