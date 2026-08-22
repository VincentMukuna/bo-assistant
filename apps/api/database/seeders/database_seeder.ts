import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { resetDemoDataset, seedDemoDataset } from "#database/demo_dataset";
import app from "@adonisjs/core/services/app";

export default class extends BaseSeeder {
  async run() {
    if (app.inProduction && process.env.DEMO_RESET_ON_SEED === "true") {
      await resetDemoDataset({ includeConversations: true });
      return;
    }

    await seedDemoDataset({ includeConversations: app.inProduction });
  }
}
