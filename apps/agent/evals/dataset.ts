import type { Dataset } from "@mastra/core/datasets";
import type { Mastra } from "@mastra/core/mastra";
import type { DatasetItem, DatasetItemPayload } from "@mastra/core/storage";
import { z } from "zod";
import { scenarios } from "./scenarios";

export const evaluationDatasetId = "business-support-regression";
export const evaluationTargetId = "business-support-agent";

const managedBy = "apps/agent/evals";
const datasetName = "Business support regression";
const datasetDescription =
  "Versioned booking, safety, and response-quality cases for the Oak & Pine support agent.";

function desiredItem(scenario: (typeof scenarios)[number]): DatasetItemPayload {
  return {
    externalId: scenario.id,
    input: scenario.input,
    groundTruth: scenario.groundTruth,
    expectedTrajectory: scenario.expectedTrajectory,
    toolMocks: scenario.toolMocks,
    unmockedToolPolicy: "deny",
    scorerIds: [...scenario.requiredScorerIds, ...(scenario.signalScorerIds ?? [])],
    requestContext: scenario.requestContext,
    metadata: {
      managedBy,
      name: scenario.name,
      why: scenario.why,
    },
    source: {
      type: "json",
      referenceId: "apps/agent/evals/scenarios.ts",
    },
  };
}

function comparableItem(item: DatasetItem | DatasetItemPayload): DatasetItemPayload {
  return {
    externalId: item.externalId ?? undefined,
    input: item.input,
    groundTruth: item.groundTruth,
    expectedTrajectory: item.expectedTrajectory,
    toolMocks: item.toolMocks,
    unmockedToolPolicy: item.unmockedToolPolicy,
    scorerIds: item.scorerIds ?? undefined,
    requestContext: item.requestContext,
    metadata: item.metadata,
    source: item.source,
  };
}

function sortedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortedJson);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortedJson(entry)])
  );
}

function samePayload(left: DatasetItemPayload, right: DatasetItemPayload) {
  return JSON.stringify(sortedJson(left)) === JSON.stringify(sortedJson(right));
}

async function getOrCreateDataset(mastra: Mastra): Promise<Dataset> {
  const { datasets } = await mastra.datasets.list({ page: 0, perPage: 100 });
  const existing = datasets.find((dataset) => dataset.id === evaluationDatasetId);
  if (existing) {
    const dataset = await mastra.datasets.get({ id: evaluationDatasetId });
    const hasExpectedTarget =
      existing.targetType === "agent" && existing.targetIds?.includes(evaluationTargetId);
    if (!hasExpectedTarget) {
      await dataset.update({ targetType: "agent", targetIds: [evaluationTargetId] });
    }
    return dataset;
  }

  return mastra.datasets.create({
    id: evaluationDatasetId,
    name: datasetName,
    description: datasetDescription,
    inputSchema: z.string().min(1),
    groundTruthSchema: z.object({ expectedBehavior: z.string().min(1) }),
    requestContextSchema: {
      type: "object",
      properties: {
        bookingCapability: { type: "string" },
        customerName: { type: "string" },
        timezone: { type: "string" },
        currentDate: { type: "string" },
      },
      required: ["bookingCapability", "customerName", "timezone", "currentDate"],
      additionalProperties: false,
    },
    metadata: { managedBy },
    targetType: "agent",
    targetIds: [evaluationTargetId],
  });
}

export async function syncEvaluationDataset(mastra: Mastra) {
  const dataset = await getOrCreateDataset(mastra);
  const listed = await dataset.listItems({ page: 0, perPage: 100 });
  const existingItems = Array.isArray(listed) ? listed : listed.items;
  const desiredItems = scenarios.map(desiredItem);
  const desiredByExternalId = new Map(
    desiredItems.map((item) => [item.externalId as string, item])
  );
  const existingByExternalId = new Map(
    existingItems.flatMap((item) => (item.externalId ? [[item.externalId, item] as const] : []))
  );

  let added = 0;
  let updated = 0;
  let removed = 0;

  for (const item of desiredItems) {
    const existing = existingByExternalId.get(item.externalId as string);
    if (!existing) {
      await dataset.addItem(item);
      added += 1;
      continue;
    }

    if (!samePayload(comparableItem(existing), item)) {
      const { externalId: _externalId, ...updates } = item;
      await dataset.updateItem({ itemId: existing.id, ...updates });
      updated += 1;
    }
  }

  for (const item of existingItems) {
    const isManaged = item.metadata?.managedBy === managedBy;
    if (isManaged && item.externalId && !desiredByExternalId.has(item.externalId)) {
      await dataset.deleteItem({ itemId: item.id });
      removed += 1;
    }
  }

  const details = await dataset.getDetails();
  return {
    dataset,
    version: details.version,
    itemCount: existingItems.length + added - removed,
    changes: { added, updated, removed },
  };
}
