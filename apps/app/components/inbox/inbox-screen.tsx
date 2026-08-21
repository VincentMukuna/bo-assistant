"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Hand,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";

import { AgentMessageMarkdown } from "@/components/inbox/agent-message-markdown";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api, type InboxAttention, type InboxConversationSummary } from "@/lib/api";
import {
  errorMessage,
  inboxConversationQueryOptions,
  inboxQueryOptions,
  queryKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const inboxListWidth = {
  default: 350,
  min: 280,
  max: 520,
  storageKey: "bo-assistant:inbox-list-width:v1",
} as const;

const inboxContextWidth = {
  default: 300,
  min: 250,
  max: 440,
  storageKey: "bo-assistant:inbox-context-width:v1",
} as const;

const ownerLabels = {
  owner: "Needs you",
  agent: "Agent handling",
  customer: "Waiting on customer",
  none: "Handled",
} as const;

const causeLabels = {
  authority: "Approval",
  judgment: "Needs judgment",
  relationship: "Human touch",
  failure: "Needs recovery",
} as const;

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(delta / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function dateTime(value: unknown) {
  if (typeof value !== "string") return "Unknown time";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function nextStepTone(owner: InboxConversationSummary["nextStepOwner"]) {
  if (owner === "owner") return "bg-amber-100/80 text-amber-900";
  if (owner === "agent") return "bg-sky-100/80 text-sky-800";
  if (owner === "customer") return "bg-zinc-200/70 text-zinc-700";
  return "bg-emerald-100/80 text-emerald-800";
}

function clampInboxListWidth(width: number) {
  return Math.min(inboxListWidth.max, Math.max(inboxListWidth.min, width));
}

function clampInboxContextWidth(width: number) {
  return Math.min(inboxContextWidth.max, Math.max(inboxContextWidth.min, width));
}

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: InboxConversationSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const grouped = new Map<
      number,
      { customer: InboxConversationSummary["customer"]; conversations: InboxConversationSummary[] }
    >();

    for (const conversation of conversations) {
      const customerMatches = conversation.customer.name.toLowerCase().includes(query);
      const conversationMatches = `${conversation.title} ${conversation.preview ?? ""}`
        .toLowerCase()
        .includes(query);

      if (query && !customerMatches && !conversationMatches) continue;

      const group = grouped.get(conversation.customer.id);
      if (group) group.conversations.push(conversation);
      else {
        grouped.set(conversation.customer.id, {
          customer: conversation.customer,
          conversations: [conversation],
        });
      }
    }

    return [...grouped.values()];
  }, [conversations, search]);

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-zinc-200/60 bg-zinc-50/70">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-semibold">Inbox</h1>
          <p className="text-xs text-zinc-400">
            {conversations.filter((item) => item.nextStepOwner === "owner").length} need you
          </p>
        </div>
        <div className="relative mt-2.5">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations"
            className="h-9 border-zinc-200/70 bg-white/90 pl-9 shadow-none"
          />
        </div>
      </div>
      <div className="scrollbar-subtle min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className="w-full min-w-0 overflow-hidden p-2">
          {groups.map((group) => (
            <section key={group.customer.id} className="mb-3 overflow-hidden">
              <div className="flex min-w-0 items-center gap-2.5 px-3 pt-2.5 pb-1.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="bg-zinc-200/60 text-[11px]">
                    {group.customer.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold" title={group.customer.name}>
                    {group.customer.name}
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    {group.conversations.length}{" "}
                    {group.conversations.length === 1 ? "conversation" : "conversations"}
                  </p>
                </div>
              </div>
              <div className="ml-[50px] min-w-0 pl-2">
                {group.conversations.map((conversation) => (
                  <button
                    type="button"
                    key={conversation.id}
                    onClick={() => onSelect(conversation.id)}
                    className={cn(
                      "mb-0.5 block w-full min-w-0 overflow-hidden rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/70",
                      selectedId === conversation.id && "bg-white hover:bg-white"
                    )}
                  >
                    <span
                      className="block overflow-hidden text-xs font-semibold text-ellipsis whitespace-nowrap text-zinc-800"
                      title={conversation.title}
                    >
                      {conversation.title}
                    </span>
                    {conversation.preview ? (
                      <span
                        className="mt-0.5 block overflow-hidden text-[11px] leading-4 text-ellipsis whitespace-nowrap text-zinc-500"
                        title={conversation.preview}
                      >
                        {conversation.preview}
                      </span>
                    ) : null}
                    <span className="mt-1.5 flex min-w-0 items-center gap-1.5">
                      <span
                        className={cn(
                          "max-w-full shrink overflow-hidden rounded-full px-2 py-0.5 text-[10px] font-medium text-ellipsis whitespace-nowrap",
                          nextStepTone(conversation.nextStepOwner)
                        )}
                      >
                        {ownerLabels[conversation.nextStepOwner]}
                      </span>
                      {conversation.attention ? (
                        <span className="min-w-0 overflow-hidden text-[10px] text-ellipsis whitespace-nowrap text-zinc-400">
                          {causeLabels[conversation.attention.cause]}
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0 text-[10px] text-zinc-400">
                        {relativeTime(conversation.updatedAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {!groups.length ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">No conversations match.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Annotation({
  summary,
  detail,
  kind,
  time,
}: {
  summary: string;
  detail: string | null;
  kind: string;
  time: string;
}) {
  const Icon = kind === "outcome" ? CheckCircle2 : kind === "failure" ? AlertTriangle : Bot;
  return (
    <div
      className="my-4 flex min-w-0 items-center justify-center gap-1.5 px-4 text-zinc-400"
      title={detail ?? summary}
      aria-label={detail ? `${summary}. ${detail}` : summary}
    >
      <Icon className="size-3 shrink-0" />
      <span className="max-w-[70%] overflow-hidden text-[11px] text-ellipsis whitespace-nowrap">
        {summary}
      </span>
      <span aria-hidden="true">·</span>
      <time className="shrink-0 text-[10px]">{relativeTime(time)}</time>
    </div>
  );
}

function AttentionCard({
  attention,
  deciding,
  onDecide,
}: {
  attention: InboxAttention;
  deciding: boolean;
  onDecide: (decision: "approve" | "decline") => void;
}) {
  const context = attention.context;
  const awaitingCustomer = attention.status === "approved";
  const bookingConfirmation = attention.actionType === "booking_confirmation";
  return (
    <div className="my-5 overflow-hidden rounded-xl bg-amber-50/90">
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-amber-900">
          <ShieldCheck className="size-4" />
          <span className="text-sm font-semibold">
            {bookingConfirmation
              ? awaitingCustomer
                ? "Confirmed · notifying customer"
                : "New pending booking"
              : awaitingCustomer
                ? "Authorized · waiting for customer"
                : causeLabels[attention.cause]}
          </span>
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-900">{attention.summary}</p>
        {attention.actionType === "booking_reschedule" ? (
          <div className="mt-4 grid gap-3 rounded-lg bg-white/70 p-3.5 text-xs text-zinc-600 sm:grid-cols-2">
            <div>
              <span className="block text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                Current
              </span>
              <span className="mt-1 block">{dateTime(context.currentStartTime)}</span>
            </div>
            <div>
              <span className="block text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
                Proposed
              </span>
              <span className="mt-1 block font-medium text-zinc-900">
                {dateTime(context.proposedStartTime)}
              </span>
            </div>
            <div className="sm:col-span-2">
              {String(context.service ?? "Booking")} · {String(context.staff ?? "Staff unassigned")}
            </div>
          </div>
        ) : null}
        {bookingConfirmation ? (
          <div className="mt-4 grid gap-2 rounded-lg bg-white/70 p-3.5 text-xs text-zinc-600">
            <span className="font-medium text-zinc-900">{dateTime(context.scheduledAt)}</span>
            <span>
              {String(context.service ?? "Booking")} · {String(context.staff ?? "Staff unassigned")}
            </span>
            <span>{Number(context.durationMinutes) || 0} minutes · Pending</span>
          </div>
        ) : null}
        {attention.outcomeSummary ? (
          <p className="mt-3 text-xs leading-5 text-zinc-600">{attention.outcomeSummary}</p>
        ) : null}
      </div>
      {attention.status === "pending" || (bookingConfirmation && awaitingCustomer) ? (
        <div className="flex gap-2 bg-amber-100/50 p-3 sm:px-5">
          <Button size="sm" onClick={() => onDecide("approve")} disabled={deciding}>
            <Check className="size-4" />
            {bookingConfirmation
              ? awaitingCustomer
                ? "Retry customer notice"
                : "Confirm booking"
              : "Authorize change"}
          </Button>
          {!bookingConfirmation ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecide("decline")}
              disabled={deciding}
            >
              Decline
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ConversationPanel({
  id,
  onOpenList,
  showContext,
  onToggleContext,
}: {
  id: string;
  onOpenList: () => void;
  showContext: boolean;
  onToggleContext: () => void;
}) {
  const queryClient = useQueryClient();
  const conversationQuery = useQuery(inboxConversationQueryOptions(id));
  const conversation = conversationQuery.data;
  const [draft, setDraft] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inboxConversation(id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings }),
    ]);
  };
  const ownershipMutation = useMutation({
    mutationFn: (handlingMode: "agent" | "owner") => api.inbox.setHandlingMode(id, handlingMode),
    onSuccess: refresh,
  });
  const messageMutation = useMutation({
    mutationFn: (message: string) => api.inbox.sendMessage(id, message),
    onSuccess: async () => {
      setDraft("");
      await refresh();
    },
  });
  const decisionMutation = useMutation({
    mutationFn: (decision: "approve" | "decline") => {
      if (!conversation?.attention) throw new Error("No attention item to decide.");
      return api.inbox.decideAttention(id, conversation.attention.id, decision);
    },
    onSuccess: refresh,
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.inbox.destroy(id),
    onSuccess: async () => {
      setDeleteOpen(false);
      queryClient.removeQueries({ queryKey: queryKeys.inboxConversation(id), exact: true });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inbox }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agentActivity }),
      ]);
    },
  });

  useEffect(() => {
    const viewport = scrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    );
    const frame = requestAnimationFrame(() => {
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [conversation?.messages.length, conversation?.annotations.length]);

  if (conversationQuery.isPending)
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading conversation…
      </div>
    );
  if (!conversation)
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        Unable to load conversation.
      </div>
    );

  const mutationError =
    ownershipMutation.error ??
    messageMutation.error ??
    decisionMutation.error ??
    deleteMutation.error;
  const ownerHasControl = conversation.handlingMode === "owner";
  const timeline = [
    ...conversation.messages.map((message) => ({
      type: "message" as const,
      id: message.id,
      occurredAt: message.createdAt,
      value: message,
    })),
    ...conversation.annotations.map((annotation) => ({
      type: "annotation" as const,
      id: annotation.id,
      occurredAt: annotation.createdAt,
      value: annotation,
    })),
  ].sort((left, right) => {
    if (!left.occurredAt) return -1;
    if (!right.occurredAt) return 1;
    return new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime();
  });
  const hasOutcome = Boolean(
    conversation.outcomeSummary && conversation.outcomeStatus !== "active"
  );
  const timelineIsEmpty = !timeline.length && !conversation.attention && !hasOutcome;
  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex min-h-[73px] shrink-0 items-center gap-3 px-4 py-3 sm:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenList}
          aria-label="Open conversations"
        >
          <ArrowLeft />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="bg-zinc-100 text-xs">
            {conversation.customer.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{conversation.customer.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <MessageSquare className="size-3" /> Website chat
            <span>·</span>
            <span>{ownerLabels[conversation.nextStepOwner]}</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden xl:inline-flex"
            onClick={onToggleContext}
            aria-label={showContext ? "Hide customer context" : "Show customer context"}
            aria-pressed={showContext}
            title={showContext ? "Hide customer context" : "Show customer context"}
          >
            {showContext ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
          <Button
            variant={ownerHasControl ? "outline" : "default"}
            size="sm"
            disabled={ownershipMutation.isPending}
            onClick={() => ownershipMutation.mutate(ownerHasControl ? "agent" : "owner")}
          >
            {ownerHasControl ? <Bot className="size-4" /> : <Hand className="size-4" />}
            {ownerHasControl ? "Return to agent" : "Take over"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-zinc-400 hover:bg-red-50 hover:text-red-700"
            onClick={() => {
              deleteMutation.reset();
              setDeleteOpen(true);
            }}
            aria-label="Delete conversation"
            title="Delete conversation"
          >
            <Trash2 />
          </Button>
        </div>
      </header>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>
              Messages and Inbox activity for {conversation.customer.name} will be permanently
              deleted. Their customer record and bookings will be kept.
            </DialogDescription>
          </DialogHeader>
          {deleteMutation.isError ? (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage(deleteMutation.error, "Unable to delete this conversation.")}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Keep conversation
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete conversation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {mutationError ? (
        <p className="bg-red-50 px-5 py-2 text-xs text-red-700" role="alert">
          {errorMessage(mutationError, "That action could not be completed.")}
        </p>
      ) : null}
      {ownerHasControl ? (
        <div className="flex items-center gap-2 bg-sky-50 px-5 py-2 text-xs text-sky-800">
          <Hand className="size-3.5" /> You have control. Automatic agent replies are paused.
        </div>
      ) : null}
      <ScrollArea ref={scrollRef} className="min-h-0 flex-1 bg-zinc-50/35">
        <div className="mx-auto w-full max-w-[720px] px-4 py-7 sm:px-7">
          {timelineIsEmpty ? (
            <div className="py-20 text-center sm:py-24">
              <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-white ring-1 ring-zinc-200/70">
                <MessageSquare className="size-4 text-zinc-400" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-zinc-900">No messages yet</h3>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-zinc-500">
                Messages with {conversation.customer.name.split(" ")[0]} will appear here once the
                conversation starts.
              </p>
            </div>
          ) : null}
          {timeline.map((entry) => {
            if (entry.type === "annotation") {
              return <Annotation key={entry.id} {...entry.value} time={entry.value.createdAt} />;
            }
            const message = entry.value;
            const business = message.sender === "business";
            const agentMessage = business && message.author !== "owner";
            return (
              <div
                key={message.id}
                className={cn("mb-4 flex", business ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[82%]", business && "text-right")}>
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-6",
                      business
                        ? "rounded-br-md bg-[#356653] text-white"
                        : "rounded-bl-md bg-zinc-100 text-zinc-900"
                    )}
                  >
                    {agentMessage ? (
                      <AgentMessageMarkdown>{message.body}</AgentMessageMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap">{message.body}</span>
                    )}
                  </div>
                  <div className="mt-1 px-1 text-[11px] text-zinc-500">
                    {business
                      ? message.author === "owner"
                        ? "You"
                        : "Agent"
                      : conversation.customer.name.split(" ")[0]}
                    {message.createdAt ? ` · ${relativeTime(message.createdAt)}` : ""}
                  </div>
                </div>
              </div>
            );
          })}
          {conversation.attention ? (
            <AttentionCard
              attention={conversation.attention}
              deciding={decisionMutation.isPending}
              onDecide={(decision) => decisionMutation.mutate(decision)}
            />
          ) : null}
          {hasOutcome ? (
            <div
              className={cn(
                "my-5 rounded-xl p-4 text-sm",
                conversation.outcomeStatus === "failed"
                  ? "bg-red-50 text-red-800"
                  : "bg-emerald-50 text-emerald-800"
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                {conversation.outcomeStatus === "failed" ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {conversation.outcomeStatus === "failed"
                  ? "Outcome incomplete"
                  : "Outcome completed"}
              </div>
              <p className="mt-1.5 text-xs leading-5">{conversation.outcomeSummary}</p>
            </div>
          ) : null}
        </div>
      </ScrollArea>
      {ownerHasControl ? (
        <div className="shrink-0 bg-zinc-50/35 p-3 sm:p-4">
          <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-xl bg-white p-2 shadow-sm ring-1 ring-zinc-200/70 focus-within:ring-2 focus-within:ring-emerald-700/25">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (draft.trim()) messageMutation.mutate(draft.trim());
                }
              }}
              placeholder={`Reply to ${conversation.customer.name.split(" ")[0]}…`}
              className="max-h-28 min-h-9 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon"
              disabled={!draft.trim() || messageMutation.isPending}
              onClick={() => messageMutation.mutate(draft.trim())}
              aria-label="Send reply"
            >
              <Send />
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CustomerContext({ conversation }: { conversation: InboxConversationSummary }) {
  const detailQuery = useQuery(inboxConversationQueryOptions(conversation.id));
  const booking = detailQuery.data?.bookings.find((item) => item.status !== "completed");
  return (
    <aside className="h-full min-h-0 border-l border-zinc-200/60 bg-zinc-50/75">
      <ScrollArea className="h-full">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-zinc-200/60 text-sm">
                {conversation.customer.initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{conversation.customer.name}</p>
              <p className="mt-0.5 text-xs text-zinc-500">Customer context</p>
            </div>
          </div>
          <section className="mt-8">
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">
              Next step
            </h3>
            <div className={cn("mt-3 rounded-xl p-4", nextStepTone(conversation.nextStepOwner))}>
              <p className="text-sm font-semibold">{ownerLabels[conversation.nextStepOwner]}</p>
              <p className="mt-1 text-xs leading-5">
                {conversation.nextStepOwner === "owner"
                  ? "The agent is waiting for a business decision or human intervention."
                  : conversation.nextStepOwner === "agent"
                    ? "The agent can continue without owner input."
                    : conversation.nextStepOwner === "customer"
                      ? "No owner action is needed while the customer decides."
                      : "There is no remaining responsibility."}
              </p>
            </div>
          </section>
          <section className="mt-8">
            <h3 className="text-sm font-semibold">Contact</h3>
            <div className="mt-3 space-y-2 text-xs leading-5 text-zinc-600">
              <p>{conversation.customer.phone}</p>
              <p className="break-all">{conversation.customer.email}</p>
              <p>{conversation.customer.address}</p>
            </div>
            {conversation.customer.notes ? (
              <p className="mt-4 text-xs leading-5 text-zinc-500 italic">
                {conversation.customer.notes}
              </p>
            ) : null}
          </section>
          <section className="mt-8">
            <h3 className="text-sm font-semibold">Upcoming booking</h3>
            {booking ? (
              <div className="mt-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{booking.service}</p>
                  <StatusBadge
                    status={
                      booking.status === "needs_approval"
                        ? "Pending"
                        : booking.status.replaceAll("_", " ")
                    }
                  />
                </div>
                <div className="mt-3 space-y-2 text-xs text-zinc-600">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="size-3.5" /> {dateTime(booking.scheduledAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock3 className="size-3.5" /> {booking.durationMinutes} minutes
                  </p>
                  <p className="flex items-center gap-2">
                    <UserRound className="size-3.5" /> {booking.staff}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">No upcoming booking.</p>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

export function InboxScreen({ selectedId: requestedId }: { selectedId?: string }) {
  const router = useRouter();
  const conversationsQuery = useQuery(inboxQueryOptions);
  const layoutRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const contextResizeHandleRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef(false);
  const contextResizingRef = useRef(false);
  const currentWidthRef = useRef<number>(inboxListWidth.default);
  const currentContextWidthRef = useRef<number>(inboxContextWidth.default);
  const conversations = conversationsQuery.data ?? [];
  const selectedId = conversations.some((item) => item.id === requestedId)
    ? requestedId!
    : (conversations[0]?.id ?? "");
  const selected = conversations.find((item) => item.id === selectedId);
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  const applyInboxListWidth = (width: number, persist = false) => {
    const nextWidth = clampInboxListWidth(width);
    currentWidthRef.current = nextWidth;
    layoutRef.current?.style.setProperty("--inbox-list-width", `${nextWidth}px`);
    resizeHandleRef.current?.setAttribute("aria-valuenow", String(nextWidth));

    if (persist) {
      try {
        localStorage.setItem(inboxListWidth.storageKey, String(nextWidth));
      } catch {
        // The layout still works when browser storage is unavailable.
      }
    }
  };

  const applyInboxContextWidth = (width: number, persist = false) => {
    const nextWidth = clampInboxContextWidth(width);
    currentContextWidthRef.current = nextWidth;
    layoutRef.current?.style.setProperty("--inbox-context-width", `${nextWidth}px`);
    contextResizeHandleRef.current?.setAttribute("aria-valuenow", String(nextWidth));

    if (persist) {
      try {
        localStorage.setItem(inboxContextWidth.storageKey, String(nextWidth));
      } catch {
        // The layout still works when browser storage is unavailable.
      }
    }
  };

  useEffect(() => {
    try {
      const storedWidth = Number(localStorage.getItem(inboxListWidth.storageKey));
      if (Number.isFinite(storedWidth) && storedWidth > 0) applyInboxListWidth(storedWidth);
      const storedContextWidth = Number(localStorage.getItem(inboxContextWidth.storageKey));
      if (Number.isFinite(storedContextWidth) && storedContextWidth > 0) {
        applyInboxContextWidth(storedContextWidth);
      }
    } catch {
      // Keep the default width when browser storage is unavailable.
    }
  }, [conversationsQuery.isPending]);

  useEffect(() => {
    if (contextOpen) applyInboxContextWidth(currentContextWidthRef.current);
  }, [contextOpen]);

  const resizeFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizingRef.current || !layoutRef.current) return;
    const left = layoutRef.current.getBoundingClientRect().left;
    applyInboxListWidth(event.clientX - left);
  };

  const resizeContextFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!contextResizingRef.current || !layoutRef.current) return;
    const right = layoutRef.current.getBoundingClientRect().right;
    applyInboxContextWidth(right - event.clientX);
  };

  useEffect(() => {
    if (selectedId && selectedId !== requestedId) {
      router.replace(`/inbox?conversation=${selectedId}`, { scroll: false });
    } else if (!selectedId && requestedId) {
      router.replace("/inbox", { scroll: false });
    }
  }, [requestedId, router, selectedId]);

  if (conversationsQuery.isPending)
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading Inbox…
      </div>
    );
  if (conversationsQuery.isError)
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        Unable to load the Inbox.
      </div>
    );
  if (!selected)
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <MessageSquare className="size-8 text-zinc-300" />
        <h1 className="mt-4 text-base font-semibold">No conversations yet</h1>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Website-chat conversations will appear here as customers contact the business.
        </p>
      </div>
    );

  const select = (id: string) => router.replace(`/inbox?conversation=${id}`, { scroll: false });
  return (
    <div
      ref={layoutRef}
      className={cn(
        "grid h-full min-h-0 grid-cols-1 [--inbox-list-width:350px] md:grid-cols-[var(--inbox-list-width)_minmax(0,1fr)]",
        contextOpen &&
          "xl:grid-cols-[var(--inbox-list-width)_minmax(480px,1fr)_var(--inbox-context-width)] 2xl:grid-cols-[var(--inbox-list-width)_minmax(520px,1fr)_var(--inbox-context-width)]",
        "[--inbox-context-width:300px]"
      )}
    >
      <div className="relative hidden min-h-0 md:block">
        <ConversationList conversations={conversations} selectedId={selectedId} onSelect={select} />
        <div
          ref={resizeHandleRef}
          role="separator"
          tabIndex={0}
          aria-label="Resize conversation list"
          aria-orientation="vertical"
          aria-valuemin={inboxListWidth.min}
          aria-valuemax={inboxListWidth.max}
          aria-valuenow={inboxListWidth.default}
          className="group absolute inset-y-0 -right-1 z-20 w-2 cursor-col-resize touch-none outline-none"
          onDoubleClick={() => applyInboxListWidth(inboxListWidth.default, true)}
          onPointerDown={(event) => {
            resizingRef.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={resizeFromPointer}
          onPointerUp={(event) => {
            if (!resizingRef.current) return;
            resizingRef.current = false;
            event.currentTarget.releasePointerCapture(event.pointerId);
            applyInboxListWidth(currentWidthRef.current, true);
          }}
          onPointerCancel={() => {
            resizingRef.current = false;
          }}
          onKeyDown={(event) => {
            let nextWidth = currentWidthRef.current;
            if (event.key === "ArrowLeft") nextWidth -= 12;
            else if (event.key === "ArrowRight") nextWidth += 12;
            else if (event.key === "Home") nextWidth = inboxListWidth.min;
            else if (event.key === "End") nextWidth = inboxListWidth.max;
            else return;

            event.preventDefault();
            applyInboxListWidth(nextWidth, true);
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-zinc-300 group-focus-visible:bg-zinc-500" />
        </div>
      </div>
      <ConversationPanel
        id={selectedId}
        onOpenList={() => setMobileListOpen(true)}
        showContext={contextOpen}
        onToggleContext={() => setContextOpen((open) => !open)}
      />
      {contextOpen ? (
        <div className="relative hidden min-h-0 xl:block">
          <div
            ref={contextResizeHandleRef}
            role="separator"
            tabIndex={0}
            aria-label="Resize customer context"
            aria-orientation="vertical"
            aria-valuemin={inboxContextWidth.min}
            aria-valuemax={inboxContextWidth.max}
            aria-valuenow={inboxContextWidth.default}
            className="group absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize touch-none outline-none"
            onDoubleClick={() => applyInboxContextWidth(inboxContextWidth.default, true)}
            onPointerDown={(event) => {
              contextResizingRef.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={resizeContextFromPointer}
            onPointerUp={(event) => {
              if (!contextResizingRef.current) return;
              contextResizingRef.current = false;
              event.currentTarget.releasePointerCapture(event.pointerId);
              applyInboxContextWidth(currentContextWidthRef.current, true);
            }}
            onPointerCancel={() => {
              contextResizingRef.current = false;
            }}
            onKeyDown={(event) => {
              let nextWidth = currentContextWidthRef.current;
              if (event.key === "ArrowLeft") nextWidth += 12;
              else if (event.key === "ArrowRight") nextWidth -= 12;
              else if (event.key === "Home") nextWidth = inboxContextWidth.min;
              else if (event.key === "End") nextWidth = inboxContextWidth.max;
              else return;

              event.preventDefault();
              applyInboxContextWidth(nextWidth, true);
            }}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-zinc-300 group-focus-visible:bg-zinc-500" />
          </div>
          <CustomerContext conversation={selected} />
        </div>
      ) : null}
      <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side="left" className="w-[350px] max-w-[92vw] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Conversations</SheetTitle>
          </SheetHeader>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(id) => {
              select(id);
              setMobileListOpen(false);
            }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
