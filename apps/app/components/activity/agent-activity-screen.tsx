"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Hand,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { AgentActivity, AgentActivityCategory, AgentActivityFilter } from "@/lib/api";
import { agentActivityQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

const filters: Array<{ value: AgentActivityFilter; label: string }> = [
  { value: "all", label: "All activity" },
  { value: "attention", label: "Needs attention" },
  { value: "decision", label: "Decisions" },
  { value: "completed", label: "Handled" },
  { value: "handoff", label: "Handoffs" },
];

const categoryLabels: Record<AgentActivityCategory, string> = {
  attention: "Needs attention",
  decision: "Owner decision",
  handoff: "Handoff",
  completed: "Handled",
  activity: "Activity",
};

function categoryStyle(category: AgentActivityCategory) {
  if (category === "attention") return "bg-amber-100 text-amber-800";
  if (category === "decision") return "bg-violet-100 text-violet-800";
  if (category === "handoff") return "bg-sky-100 text-sky-800";
  if (category === "completed") return "bg-emerald-100 text-emerald-800";
  return "bg-zinc-100 text-zinc-700";
}

function CategoryIcon({ activity }: { activity: AgentActivity }) {
  const className = "size-3";
  if (activity.kind === "failure") return <AlertTriangle className={className} />;
  if (activity.category === "attention") return <ShieldAlert className={className} />;
  if (activity.category === "decision") return <CheckCircle2 className={className} />;
  if (activity.category === "handoff") return <Hand className={className} />;
  if (activity.category === "completed") return <Sparkles className={className} />;
  return <Bot className={className} />;
}

function dayLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const key = date.toDateString();
  if (key === today.toDateString()) return "Today";
  if (key === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function activityTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function ActivityRow({ activity }: { activity: AgentActivity }) {
  return (
    <article className="group flex gap-4 px-4 py-4 transition-colors hover:bg-zinc-50/70 sm:px-5">
      <Avatar className="mt-0.5 size-9 shrink-0 after:border-zinc-200/60">
        <AvatarFallback className="bg-zinc-100 text-[11px]">
          {activity.contact.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">{activity.summary}</h3>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
              categoryStyle(activity.category)
            )}
          >
            <CategoryIcon activity={activity} />
            {categoryLabels[activity.category]}
          </span>
        </div>
        {activity.detail ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-zinc-600">{activity.detail}</p>
        ) : null}
        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
          <span className="font-medium text-zinc-700">{activity.contact.name}</span>
          <span aria-hidden="true">·</span>
          <span className="max-w-64 truncate">{activity.conversation.title}</span>
          <span aria-hidden="true">·</span>
          <time>{activityTime(activity.createdAt)}</time>
        </div>
      </div>
      <Link
        href={`/inbox?conversation=${activity.conversation.id}`}
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 opacity-70 transition-colors group-hover:opacity-100 hover:bg-zinc-100 hover:text-zinc-900"
        aria-label={`Open ${activity.contact.name}'s conversation`}
      >
        <ArrowUpRight className="size-4" />
      </Link>
    </article>
  );
}

export function AgentActivityScreen({ filter }: { filter: AgentActivityFilter }) {
  const router = useRouter();
  const activityQuery = useQuery(agentActivityQueryOptions);
  const feed = activityQuery.data;
  const grouped = useMemo(() => {
    const groups = new Map<string, AgentActivity[]>();
    for (const activity of feed?.activities ?? []) {
      if (filter !== "all" && activity.category !== filter) continue;
      const label = dayLabel(activity.createdAt);
      const group = groups.get(label);
      if (group) group.push(activity);
      else groups.set(label, [activity]);
    }
    return [...groups.entries()];
  }, [feed?.activities, filter]);

  if (activityQuery.isPending) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading agent activity…
      </div>
    );
  }
  if (!feed) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        Unable to load agent activity.
      </div>
    );
  }

  const metrics = [
    { label: "Needs you", value: feed.metrics.needsOwner, tone: "text-amber-700" },
    { label: "Agent handling", value: feed.metrics.agentHandling, tone: "text-sky-700" },
    { label: "Completed today", value: feed.metrics.completedToday, tone: "text-emerald-700" },
    { label: "Failed", value: feed.metrics.failures, tone: "text-red-700" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50/50">
      <header className="shrink-0 border-b border-zinc-200/60 bg-white px-5 py-5 sm:px-7">
        <div className="mx-auto max-w-5xl">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.02em]">Agent activity</h1>
            <p className="mt-1 text-sm text-zinc-500">
              What the agent handled, where it paused, and what changed.
            </p>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-xs text-zinc-500">{metric.label}</dt>
                <dd className={cn("mt-1 text-2xl font-semibold tabular-nums", metric.tone)}>
                  {metric.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>
      <div className="shrink-0 border-b border-zinc-200/50 bg-white/70 px-5 sm:px-7">
        <div className="scrollbar-subtle mx-auto flex max-w-5xl gap-1 overflow-x-auto py-2">
          {filters.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                router.replace(`/agent-activity?filter=${option.value}`, { scroll: false })
              }
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900",
                filter === option.value && "bg-zinc-100 text-zinc-900"
              )}
              aria-pressed={filter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-5xl px-5 py-6 sm:px-7">
          {grouped.map(([label, activities]) => (
            <section key={label} className="mb-7">
              <div className="mb-2 flex items-center gap-2">
                <h2 className="label-caps text-zinc-500">{label}</h2>
                <span className="text-[10px] text-zinc-400">{activities.length}</span>
              </div>
              <div className="divide-y divide-zinc-200/60 overflow-hidden rounded-xl border border-zinc-200/60 bg-white">
                {activities.map((activity) => (
                  <ActivityRow key={activity.id} activity={activity} />
                ))}
              </div>
            </section>
          ))}
          {!grouped.length ? (
            <div className="py-20 text-center">
              <Sparkles className="mx-auto size-7 text-zinc-300" />
              <p className="mt-3 text-sm font-medium">No activity in this view</p>
              <p className="mt-1 text-xs text-zinc-500">New agent actions will appear here live.</p>
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}
