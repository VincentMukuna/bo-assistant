import { BaseSeeder } from "@adonisjs/lucid/seeders";
import { seedDemoDataset } from "#database/demo_dataset";
import app from "@adonisjs/core/services/app";

export default class extends BaseSeeder {
  async run() {
    await seedDemoDataset({ includeConversations: app.inProduction });
  }
}
