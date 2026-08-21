import { BaseSchema } from "@adonisjs/lucid/schema";

const ANONYMOUS_EMAIL_PREFIX = "anonymous-";
const ANONYMOUS_EMAIL_SUFFIX = "@invalid.local";

function visitorIdFromEmail(email: string) {
  return email.slice(ANONYMOUS_EMAIL_PREFIX.length, -ANONYMOUS_EMAIL_SUFFIX.length);
}

export default class extends BaseSchema {
  async up() {
    this.schema.alterTable("support_conversations", (table) => {
      table.uuid("visitor_id").nullable();
      table.string("memory_resource_id").nullable();
      table.integer("customer_id").unsigned().nullable().alter();
    });
    this.schema.alterTable("customer_email_verifications", (table) => {
      table.uuid("visitor_id").nullable();
      table.integer("customer_id").unsigned().nullable().alter();
    });

    this.defer(async (db) => {
      await db.rawQuery(
        "UPDATE support_conversations SET memory_resource_id = 'customer:' || customer_id"
      );

      const placeholders = await db
        .from("customers")
        .select("id", "email")
        .whereLike("email", `${ANONYMOUS_EMAIL_PREFIX}%${ANONYMOUS_EMAIL_SUFFIX}`);

      for (const placeholder of placeholders) {
        const visitorId = visitorIdFromEmail(String(placeholder.email));
        await db
          .from("support_conversations")
          .where("customer_id", placeholder.id)
          .update({ customer_id: null, visitor_id: visitorId });
        await db
          .from("customer_email_verifications")
          .where("customer_id", placeholder.id)
          .update({ customer_id: null, visitor_id: visitorId });
      }

      await db
        .from("customers")
        .whereLike("email", `${ANONYMOUS_EMAIL_PREFIX}%${ANONYMOUS_EMAIL_SUFFIX}`)
        .whereNotExists((query) =>
          query
            .from("bookings")
            .select("bookings.id")
            .whereRaw("bookings.customer_id = customers.id")
        )
        .delete();
    });

    this.schema.alterTable("support_conversations", (table) => {
      table.string("memory_resource_id").notNullable().alter();
      table.index(["visitor_id", "updated_at"]);
    });
    this.schema.alterTable("customer_email_verifications", (table) => {
      table.index(["visitor_id"]);
    });
  }

  async down() {
    this.defer(async (db) => {
      const conversationVisitors = await db
        .from("support_conversations")
        .whereNull("customer_id")
        .whereNotNull("visitor_id")
        .distinct("visitor_id");
      const verificationVisitors = await db
        .from("customer_email_verifications")
        .whereNull("customer_id")
        .whereNotNull("visitor_id")
        .distinct("visitor_id");
      const visitorIds = new Set(
        [...conversationVisitors, ...verificationVisitors].map((visitor) =>
          String(visitor.visitor_id)
        )
      );

      for (const visitorId of visitorIds) {
        const email = `${ANONYMOUS_EMAIL_PREFIX}${visitorId}${ANONYMOUS_EMAIL_SUFFIX}`;
        const existing = await db.from("customers").where("email", email).select("id").first();
        const inserted = existing
          ? []
          : await db.table("customers").insert({
              name: "",
              email,
              phone: "",
              address: "",
              notes: "",
              created_at: this.now(),
            });
        const customerId = existing?.id ?? inserted[0];
        await db
          .from("support_conversations")
          .where("visitor_id", visitorId)
          .update({ customer_id: customerId });
        await db
          .from("customer_email_verifications")
          .where("visitor_id", visitorId)
          .update({ customer_id: customerId });
      }
    });

    this.schema.alterTable("customer_email_verifications", (table) => {
      table.dropIndex(["visitor_id"]);
      table.dropColumn("visitor_id");
      table.integer("customer_id").unsigned().notNullable().alter();
    });
    this.schema.alterTable("support_conversations", (table) => {
      table.dropIndex(["visitor_id", "updated_at"]);
      table.dropColumn("visitor_id");
      table.dropColumn("memory_resource_id");
      table.integer("customer_id").unsigned().notNullable().alter();
    });
  }
}
