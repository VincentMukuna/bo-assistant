import app from "@adonisjs/core/services/app";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type DemoResetStatus = "ready" | "resetting" | "failed";

export type DemoResetState = {
  generation: string;
  status: DemoResetStatus;
  progress: number;
  message: string;
  updatedAt: string;
};

const statePath = app.tmpPath("demo-reset-state.json");
const initialState: DemoResetState = {
  generation: "initial",
  status: "ready",
  progress: 100,
  message: "Demo ready",
  updatedAt: new Date(0).toISOString(),
};

function isDemoResetState(value: unknown): value is DemoResetState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DemoResetState>;
  return (
    typeof state.generation === "string" &&
    (state.status === "ready" || state.status === "resetting" || state.status === "failed") &&
    typeof state.progress === "number" &&
    typeof state.message === "string" &&
    typeof state.updatedAt === "string"
  );
}

export async function readDemoResetState(): Promise<DemoResetState> {
  try {
    const value: unknown = JSON.parse(await readFile(statePath, "utf8"));
    return isDemoResetState(value) ? value : initialState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return initialState;
    throw error;
  }
}

async function writeDemoResetState(state: DemoResetState) {
  await mkdir(dirname(statePath), { recursive: true });
  const temporaryPath = `${statePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(state), "utf8");
  await rename(temporaryPath, statePath);
  return state;
}

export async function beginDemoReset() {
  const current = await readDemoResetState();
  if (current.status === "resetting") throw new Error("A demo reset is already running");

  return writeDemoResetState({
    generation: randomUUID(),
    status: "resetting",
    progress: 0,
    message: "Signing everyone out…",
    updatedAt: new Date().toISOString(),
  });
}

export async function updateDemoReset(generation: string, progress: number, message: string) {
  const current = await readDemoResetState();
  if (current.generation !== generation || current.status !== "resetting") {
    throw new Error("The active demo reset has changed");
  }

  return writeDemoResetState({
    ...current,
    progress: Math.max(0, Math.min(99, Math.round(progress))),
    message,
    updatedAt: new Date().toISOString(),
  });
}

export async function completeDemoReset(generation: string) {
  const current = await readDemoResetState();
  if (current.generation !== generation) throw new Error("The active demo reset has changed");

  return writeDemoResetState({
    generation,
    status: "ready",
    progress: 100,
    message: "Demo ready",
    updatedAt: new Date().toISOString(),
  });
}

export async function failDemoReset(generation: string) {
  const current = await readDemoResetState();
  if (current.generation !== generation) return current;

  return writeDemoResetState({
    ...current,
    status: "failed",
    message: "The reset stopped before completion.",
    updatedAt: new Date().toISOString(),
  });
}
