"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  RefreshCw,
  Send,
  ShieldAlert,
  UserRound,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { OwnerAssistantMarkdown } from "@/components/overview/owner-assistant-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { errorMessage, ownerBriefQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "owner" | "assistant";
  body: string;
};

const metricMeta = [
  { key: "needsDecision", label: "Waiting on you", icon: ShieldAlert, tone: "amber" },
  { key: "bookingsToday", label: "Bookings today", icon: CalendarDays, tone: "sky" },
  { key: "operationalRisks", label: "Need follow-up", icon: AlertTriangle, tone: "rose" },
  {
    key: "handledRecently",
    label: "Completed since yesterday",
    icon: CheckCircle2,
    tone: "emerald",
  },
] as const;

const statusLabels: Record<string, string> = {
  confirmed: "Confirmed",
  needs_approval: "Pending",
  in_progress: "In progress",
  completed: "Completed",
};

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function generatedTime(value: string) {
  return `${new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  })} PT`;
}

function businessDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
      {children}
    </div>
  );
}

export function OwnerOverviewScreen() {
  const { user } = useAuth();
  const briefQuery = useQuery(ownerBriefQueryOptions);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const firstName = user?.fullName?.split(/\s+/)[0] ?? "there";
  const brief = briefQuery.data;

  const askMutation = useMutation({
    mutationFn: (message: string) => api.ownerBrief.ask(message, { surface: "overview" }),
    onSuccess: (result, askedQuestion) => {
      setMessages((current) => [
        ...current,
        { id: `owner-${Date.now()}`, role: "owner", body: askedQuestion },
        { id: `assistant-${Date.now()}`, role: "assistant", body: result.answer },
      ]);
    },
  });

  const latestMessages = useMemo(() => messages.slice(-4), [messages]);

  function ask(value: string) {
    const trimmed = value.trim();
    if (!trimmed || askMutation.isPending) return;
    setQuestion("");
    askMutation.mutate(trimmed);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  if (briefQuery.isPending) {
    return (
      <div className="h-full overflow-y-auto bg-[#f7f7f4]">
        <div className="mx-auto max-w-7xl animate-pulse px-5 py-8 sm:px-7 lg:py-10">
          <div className="h-6 w-32 rounded bg-zinc-200" />
          <div className="mt-4 h-11 max-w-xl rounded bg-zinc-200" />
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f7f4] px-6 text-center">
        <div>
          <AlertTriangle className="mx-auto size-7 text-amber-600" />
          <p className="mt-3 text-sm font-semibold">Unable to load today’s overview</p>
          <Button variant="outline" className="mt-4" onClick={() => briefQuery.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f7f7f4]">
      <div className="mx-auto max-w-7xl px-5 py-7 sm:px-7 lg:px-9 lg:py-9">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-medium text-zinc-500">
              {businessDateLabel(brief.businessDate)}
            </div>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.035em] text-zinc-950 sm:text-4xl">
              {brief.greeting}, {firstName}. {brief.headline}.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
              {brief.summary}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-fit bg-white"
            disabled={briefQuery.isFetching}
            onClick={() => briefQuery.refetch()}
          >
            <RefreshCw className={cn(briefQuery.isFetching && "animate-spin")} />
            Updated {generatedTime(brief.generatedAt)}
          </Button>
        </header>

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key metrics">
          {metricMeta
            .filter((metric) => brief.metrics[metric.key] > 0)
            .map((metric) => {
              const Icon = metric.icon;
              const value = brief.metrics[metric.key];
              return (
                <div
                  key={metric.key}
                  className="rounded-2xl border border-zinc-200/70 bg-white px-4 py-4 shadow-[0_1px_1px_rgba(0,0,0,0.02)] sm:px-5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">{metric.label}</span>
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded-lg",
                        metric.tone === "amber" && "bg-amber-50 text-amber-700",
                        metric.tone === "sky" && "bg-sky-50 text-sky-700",
                        metric.tone === "rose" && "bg-rose-50 text-rose-700",
                        metric.tone === "emerald" && "bg-emerald-50 text-emerald-700"
                      )}
                    >
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-[-0.04em] tabular-nums">
                    {value}
                  </div>
                </div>
              );
            })}
        </section>

        <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            {brief.attentionItems.length ? (
              <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
                <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="size-4 text-amber-700" />
                      <h2 className="text-base font-semibold">Needs your attention</h2>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {brief.attentionItems.length}{" "}
                      {brief.attentionItems.length === 1 ? "item is" : "items are"} waiting for your
                      approval or response.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-zinc-100">
                  {brief.attentionItems.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href={item.link.href}
                      className="group flex gap-4 px-5 py-4 transition-colors hover:bg-zinc-50/80 sm:px-6"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                          item.priority === "urgent"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-amber-50 text-amber-700"
                        )}
                      >
                        {item.kind === "booking" ? (
                          <CalendarDays className="size-4" />
                        ) : (
                          <UserRound className="size-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-[10px] font-medium tracking-[0.08em] text-zinc-400 uppercase">
                          {item.eyebrow} · {item.customerName}
                        </span>
                        <h3 className="mt-1 text-sm font-semibold text-zinc-900">{item.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">{item.detail}</p>
                      </div>
                      <ArrowUpRight className="mt-1 size-4 shrink-0 text-zinc-300 transition-colors group-hover:text-zinc-700" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4 sm:px-6">
                <div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-sky-700" />
                    <h2 className="text-base font-semibold">Today’s schedule</h2>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">Appointments and visit notes.</p>
                </div>
                <Link
                  href="/bookings"
                  className="text-primary text-xs font-semibold hover:underline"
                >
                  Full schedule
                </Link>
              </div>
              {brief.todaySchedule.length ? (
                <div className="divide-y divide-zinc-100">
                  {brief.todaySchedule.map((item) => (
                    <Link
                      key={item.id}
                      href={item.link.href}
                      className="group grid gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/80 sm:grid-cols-[100px_40px_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold tabular-nums sm:block">
                        <span className="whitespace-nowrap">{item.time} PT</span>
                        <span className="text-[10px] font-normal text-zinc-400 sm:mt-1 sm:block">
                          {durationLabel(item.durationMinutes)}
                        </span>
                      </div>
                      <Avatar className="hidden size-9 sm:flex">
                        <AvatarFallback className="bg-zinc-100 text-[11px] font-semibold">
                          {item.customerInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold">{item.service}</h3>
                          <span className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[9px] font-medium tracking-wide text-zinc-500 uppercase">
                            {statusLabels[item.status] ?? item.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          {item.customerName} · {item.staff}
                        </p>
                        {item.note ? (
                          <p className="mt-1.5 line-clamp-1 text-xs text-amber-800">
                            Customer note: {item.note}
                          </p>
                        ) : null}
                      </div>
                      <ChevronRight className="hidden size-4 text-zinc-300 transition-transform group-hover:translate-x-0.5 sm:block" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-5 sm:p-6">
                  <EmptyState>No bookings are scheduled for today.</EmptyState>
                </div>
              )}
            </section>
          </div>

          <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
            <section className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-[#eff6f1] shadow-[0_12px_35px_rgba(19,78,54,0.08)]">
              <div className="border-b border-emerald-900/10 px-5 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-xl">
                      <Bot className="size-4" />
                    </span>
                    <div>
                      <h2 className="text-sm font-semibold text-zinc-950">Ask Oak</h2>
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-[360px] min-h-[180px] overflow-y-auto px-5 py-4">
                {latestMessages.length ? (
                  <div className="space-y-4">
                    {latestMessages.map((message) =>
                      message.role === "owner" ? (
                        <div
                          key={message.id}
                          className="ml-8 rounded-xl bg-white px-3.5 py-2.5 text-sm text-zinc-700 shadow-sm"
                        >
                          {message.body}
                        </div>
                      ) : (
                        <div key={message.id} className="text-sm leading-6 text-zinc-700">
                          <OwnerAssistantMarkdown>{message.body}</OwnerAssistantMarkdown>
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {brief.suggestedQuestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-900/10 bg-white/80 px-3.5 py-3 text-left text-xs font-medium text-zinc-700 transition-colors hover:bg-white"
                        onClick={() => ask(suggestion)}
                        disabled={askMutation.isPending}
                      >
                        {suggestion}
                        <ChevronRight className="size-3.5 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    ))}
                  </div>
                )}
                {askMutation.isPending ? (
                  <div className="mt-4 flex items-center gap-2 text-xs text-emerald-900/60">
                    <span className="flex gap-1">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-700/50" />
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-700/50 [animation-delay:120ms]" />
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-700/50 [animation-delay:240ms]" />
                    </span>
                    Checking…
                  </div>
                ) : null}
                {askMutation.isError ? (
                  <p className="mt-3 text-xs text-red-700" role="alert">
                    {errorMessage(askMutation.error, "I couldn’t answer that right now.")}
                  </p>
                ) : null}
              </div>

              <form onSubmit={submit} className="border-t border-emerald-900/10 p-3">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-900/10 bg-white p-1.5 shadow-sm">
                  <Input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about today or open work"
                    aria-label="Ask about today or open work"
                    className="h-8 border-0 bg-transparent shadow-none focus-visible:ring-0"
                  />
                  <Button
                    size="icon-sm"
                    type="submit"
                    disabled={!question.trim() || askMutation.isPending}
                  >
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </form>
            </section>

            {brief.watchItems.length ? (
              <section className="rounded-2xl border border-zinc-200/70 bg-white p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-rose-700" />
                    <h2 className="text-sm font-semibold">Needs follow-up</h2>
                  </div>
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {brief.watchItems.length}
                  </span>
                </div>
                <div className="mt-4 space-y-1">
                  {brief.watchItems.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      href={item.link.href}
                      className="group flex gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-zinc-50"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-500" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs leading-5 font-semibold text-zinc-800">
                          {item.title}
                        </h3>
                        <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">{item.detail}</p>
                      </div>
                      <ArrowUpRight className="mt-1 size-3.5 shrink-0 text-zinc-300 group-hover:text-zinc-600" />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {brief.recentWins.length ? (
              <section className="rounded-2xl border border-zinc-200/70 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4 text-emerald-700" />
                  <h2 className="text-sm font-semibold">Completed since yesterday</h2>
                </div>
                <div className="mt-4 space-y-3">
                  {brief.recentWins.slice(0, 4).map((item) => (
                    <Link key={item.id} href={item.link.href} className="group block">
                      <p className="text-xs leading-5 font-semibold text-zinc-800 group-hover:underline">
                        {item.summary}
                      </p>
                      <p className="mt-0.5 text-[11px] text-zinc-500">{item.customerName}</p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
