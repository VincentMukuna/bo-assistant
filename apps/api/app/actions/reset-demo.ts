import { resetDemoDataset } from "#database/demo_dataset";
import {
  beginDemoReset,
  completeDemoReset,
  failDemoReset,
  updateDemoReset,
  type DemoResetState,
} from "#services/demo_reset_state";
import { setTimeout as wait } from "node:timers/promises";

type ResetDemoOptions = {
  includeConversations: boolean;
  drainMs?: number;
  onProgress?: (state: DemoResetState) => void | Promise<void>;
};

export default async function resetDemo({
  includeConversations,
  drainMs = 3_000,
  onProgress,
}: ResetDemoOptions) {
  const started = await beginDemoReset();

  async function report(progress: number, message: string) {
    const state = await updateDemoReset(started.generation, progress, message);
    await onProgress?.(state);
  }

  try {
    await report(5, "Signing everyone out…");
    await wait(drainMs);
    const result = await resetDemoDataset({
      includeConversations,
      onProgress: report,
    });
    await report(98, "Finishing the demo setup…");
    const completed = await completeDemoReset(started.generation);
    await onProgress?.(completed);
    return { ...result, state: completed };
  } catch (error) {
    await failDemoReset(started.generation);
    throw error;
  }
}
