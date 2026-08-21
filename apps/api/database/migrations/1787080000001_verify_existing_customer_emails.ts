import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  async up() {
    await this.db.from("customers").whereNotNull("email").update({ email_verified_at: this.now() });
  }

  async down() {}
}
