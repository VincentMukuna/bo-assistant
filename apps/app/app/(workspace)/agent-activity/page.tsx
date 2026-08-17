import type { Metadata } from "next";

import { AgentActivityScreen } from "@/components/activity/agent-activity-screen";
import type { ActivityFilter } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Agent Activity · Oak & Pine" };

type ActivityPageProps = {
  searchParams: Promise<{ filter?: string | string[] }>;
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const query = await searchParams;
  const allowed: ActivityFilter[] = ["all", "approval", "completed"];
  const filter =
    typeof query.filter === "string" && allowed.includes(query.filter as ActivityFilter)
      ? (query.filter as ActivityFilter)
      : "all";

  return <AgentActivityScreen filter={filter} />;
}
