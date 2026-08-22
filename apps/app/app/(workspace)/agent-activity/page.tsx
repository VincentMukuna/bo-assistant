import type { Metadata } from "next";

import { AgentActivityScreen } from "@/components/activity/agent-activity-screen";
import type { AgentActivityFilter } from "@/lib/api";

export const metadata: Metadata = { title: "Oak Activity · Oak & Pine" };

type ActivityPageProps = {
  searchParams: Promise<{ filter?: string | string[] }>;
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const query = await searchParams;
  const allowed: AgentActivityFilter[] = [
    "all",
    "attention",
    "decision",
    "completed",
    "handoff",
    "activity",
  ];
  const filter =
    typeof query.filter === "string" && allowed.includes(query.filter as AgentActivityFilter)
      ? (query.filter as AgentActivityFilter)
      : "all";

  return <AgentActivityScreen filter={filter} />;
}
