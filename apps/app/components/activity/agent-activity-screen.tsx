"use client";

import { useRouter } from "next/navigation";
import { Check, Sparkles } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  initialTasks,
  type ActivityFilter,
  type AgentTask,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function AgentActivityView({
  tasks,
  filter,
  onFilter,
}: {
  tasks: AgentTask[];
  filter: ActivityFilter;
  onFilter: (filter: ActivityFilter) => void;
}) {
  const filtered = tasks.filter((task) => filter === "all" || (filter === "approval" ? task.status === "Approval needed" : task.status === "Completed"));
  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50/50">
      <header className="flex min-h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 py-2 sm:px-6">
        <h1 className="sr-only">Agent Activity</h1>
        <div className="flex gap-1 overflow-x-auto">
          {(["all", "approval", "completed"] as const).map((value) => (
            <button key={value} type="button" onClick={() => onFilter(value)} className={cn("rounded-lg px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50", filter === value && "bg-zinc-100 font-medium text-zinc-950")}>{value === "all" ? "All" : value === "approval" ? "Needs approval" : "Completed"}</button>
          ))}
        </div>
        <span className="ml-auto shrink-0 text-xs text-zinc-500">{filtered.length} {filtered.length === 1 ? "task" : "tasks"}</span>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto max-w-5xl p-4 sm:p-6">
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            {filtered.map((task, index) => (
              <article key={task.id} className={cn("p-5 sm:p-6", index !== 0 && "border-t border-zinc-200")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white"><Sparkles className="size-3.5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold">{task.title}</h2><StatusBadge status={task.status} /></div>
                    <div className="mt-1.5 text-xs text-muted-foreground">{task.customer} · {task.time}</div>
                    <div className="mt-5 grid gap-5 border-t border-zinc-100 pt-5 sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-medium text-zinc-500">Information checked</div>
                        <ul className="mt-3 space-y-2">
                          {task.checked.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-zinc-700"><Check className="size-3.5 text-zinc-400" />{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-zinc-500">Outcome</div>
                        <p className="mt-3 text-sm leading-6 text-zinc-700">{task.outcome}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export function AgentActivityScreen({ filter }: { filter: ActivityFilter }) {
  const router = useRouter();

  return (
    <AgentActivityView
      tasks={initialTasks}
      filter={filter}
      onFilter={(next) =>
        router.replace(`/agent-activity?filter=${next}`, { scroll: false })
      }
    />
  );
}
