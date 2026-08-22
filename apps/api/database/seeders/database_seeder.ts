import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { seedDemoDataset } from "#database/demo_dataset";
import resetDemo from "#actions/reset-demo";
import app from "@adonisjs/core/services/app";

export default class extends BaseSeeder {
  async run() {
    if (process.env.DEMO_RESET_ON_SEED === "true") {
      await resetDemo({ includeConversations: app.inProduction });
      return;
    }

    await seedDemoDataset({ includeConversations: app.inProduction });
  }
}
