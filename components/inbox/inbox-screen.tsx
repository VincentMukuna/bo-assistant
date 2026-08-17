"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Ellipsis,
  FileText,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  conversations,
  customers,
  initialBookings,
  initialMessages,
  type ApprovalState,
  type Booking,
  type Conversation,
  type Customer,
  type Message,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function ConversationList({
  selected,
  onSelect,
  search,
  onSearch,
}: {
  selected: string;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (value: string) => void;
}) {
  const filtered = conversations.filter((conversation) =>
    `${conversation.name} ${conversation.preview} ${conversation.label}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-zinc-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search conversations"
            className="h-9 border-zinc-200 bg-zinc-50 pl-9 shadow-none"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="More inbox options">
              <Ellipsis />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Inbox options</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-2">
          {filtered.map((conversation) => (
            <button
              type="button"
              key={conversation.id}
              onClick={() => onSelect(conversation.id)}
              className={cn(
                "mb-0.5 flex w-full gap-3 rounded-xl px-3 py-3.5 text-left transition-colors hover:bg-zinc-50",
                selected === conversation.id && "bg-zinc-100 hover:bg-zinc-100",
              )}
            >
              <div className="relative mt-0.5">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-white text-xs font-medium ring-1 ring-zinc-200">
                    {conversation.initials}
                  </AvatarFallback>
                </Avatar>
                {conversation.unread ? (
                  <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white bg-zinc-950" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate text-sm", conversation.unread && "font-semibold")}>{conversation.name}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-zinc-600">{conversation.time}</span>
                </div>
                <p className="mt-1 truncate text-xs leading-5 text-zinc-600">{conversation.preview}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-zinc-600">
                  <span>{conversation.channel}</span>
                  <span className="size-0.5 rounded-full bg-zinc-400" />
                  <span>{conversation.label}</span>
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">No conversations found.</div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

function AssistantEvent({ message }: { message: Message }) {
  return (
    <div className="my-5 flex items-start gap-3 px-1 text-sm text-zinc-600">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-zinc-950 text-white">
        <Sparkles className="size-3" />
      </div>
      <div>
        <p className="leading-6">{message.text}</p>
        <span className="mt-1 block text-[11px] text-zinc-500">Assistant · {message.time}</span>
      </div>
    </div>
  );
}

function ApprovalCard({
  state,
  onApprove,
  onEdit,
  onTakeOver,
}: {
  state: ApprovalState;
  onApprove: () => void;
  onEdit: () => void;
  onTakeOver: () => void;
}) {
  if (state !== "pending") {
    const copy = {
      approved: "Approved and confirmed for Tuesday at 2:30 PM.",
      edited: "Proposal updated. Review the new time before sending.",
      "taken-over": "You’re now handling this conversation.",
    }[state];
    return (
      <div className="my-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          {state === "taken-over" ? <UserRound className="size-4" /> : <CheckCircle2 className="size-4" />}
          {copy}
        </div>
      </div>
    );
  }

  return (
    <div className="my-5 overflow-hidden rounded-xl border border-zinc-300 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <div className="border-b border-zinc-200 p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="size-4 text-zinc-700" />
          <span className="text-sm font-semibold">Approval needed</span>
        </div>
        <p className="text-sm leading-6 text-zinc-600">
          Reschedule Alice’s deep clean from Thursday, Aug 20 at 9:00 AM to:
        </p>
        <div className="mt-4 flex items-start gap-3 rounded-lg bg-zinc-50 p-3.5">
          <CalendarDays className="mt-0.5 size-4 text-zinc-600" />
          <div>
            <div className="text-sm font-medium">Tuesday, Aug 18 · 2:30 PM</div>
            <div className="mt-1 text-xs text-muted-foreground">Jamie + Rosa · Deep home clean · 3 hours</div>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          This changes an existing booking, so the assistant is waiting for your approval.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 bg-zinc-50/60 p-3 sm:px-5">
        <Button onClick={onApprove} className="h-9 px-4">
          <Check className="size-4" /> Approve
        </Button>
        <Button onClick={onEdit} variant="outline" className="h-9 bg-white px-4">
          <Pencil className="size-4" /> Edit
        </Button>
        <Button onClick={onTakeOver} variant="ghost" className="h-9 px-3 text-zinc-600">
          Take over
        </Button>
      </div>
    </div>
  );
}

function ConversationPanel({
  conversation,
  messages,
  approvalState,
  onApprove,
  onEdit,
  onTakeOver,
  onSend,
  onOpenList,
}: {
  conversation: Conversation;
  messages: Message[];
  approvalState: ApprovalState;
  onApprove: () => void;
  onEdit: () => void;
  onTakeOver: () => void;
  onSend: (text: string) => void;
  onOpenList: () => void;
}) {
  const [draft, setDraft] = useState("");
  const conversationScrollRef = useRef<HTMLDivElement>(null);
  const isAlice = conversation.id === "alice";

  useEffect(() => {
    const viewport = conversationScrollRef.current?.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    const frame = requestAnimationFrame(() => {
      if (viewport) viewport.scrollTop = viewport.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [conversation.id, messages.length, approvalState]);

  function submitMessage() {
    if (!draft.trim()) return;
    onSend(draft.trim());
    setDraft("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex h-[73px] shrink-0 items-center gap-3 border-b border-zinc-200 px-4 sm:px-5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onOpenList} aria-label="Open conversation list">
          <ArrowLeft />
        </Button>
        <Avatar className="size-9">
          <AvatarFallback className="bg-zinc-100 text-xs font-medium text-zinc-700">{conversation.initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{conversation.name}</h1>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{conversation.channel}</span>
            <span className="size-0.5 rounded-full bg-zinc-400" />
            <span>Typically replies in 5 min</span>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`Call ${conversation.name}`}><Phone /></Button>
            </TooltipTrigger>
            <TooltipContent>Call customer</TooltipContent>
          </Tooltip>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Conversation options"><Ellipsis /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Mark as unread</DropdownMenuItem>
              <DropdownMenuItem>Assign to teammate</DropdownMenuItem>
              <DropdownMenuItem>Close conversation</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ScrollArea ref={conversationScrollRef} className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[720px] px-4 py-7 sm:px-7">
          <div className="mb-7 flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            <Separator className="flex-1" /> Today <Separator className="flex-1" />
          </div>
          {messages.map((message) => {
            if (message.kind === "assistant") return <AssistantEvent key={message.id} message={message} />;
            const staff = message.kind === "staff";
            return (
              <div key={message.id} className={cn("mb-4 flex", staff ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%]", staff && "text-right")}>
                  <div
                    className={cn(
                      "inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-6",
                      staff ? "rounded-br-md bg-zinc-950 text-white" : "rounded-bl-md bg-zinc-100 text-zinc-900",
                    )}
                  >
                    {message.text}
                  </div>
                  <div className="mt-1 px-1 text-[11px] text-zinc-500">{staff ? "You" : conversation.name.split(" ")[0]} · {message.time}</div>
                </div>
              </div>
            );
          })}
          {isAlice ? (
            <ApprovalCard state={approvalState} onApprove={onApprove} onEdit={onEdit} onTakeOver={onTakeOver} />
          ) : conversation.id === "marcus" ? (
            <div className="my-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium"><FileText className="size-4" /> Suggested reply</div>
              <p className="text-sm leading-6 text-zinc-600">The $65 call-out fee covers diagnosis and is credited toward the repair if you go ahead with the work.</p>
              <Button size="sm" className="mt-3" onClick={() => onSend("The $65 call-out fee covers diagnosis and is credited toward the repair if you go ahead with the work.")}>Send reply</Button>
            </div>
          ) : null}
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t border-zinc-200 bg-white p-3 sm:p-4">
        <div className="mx-auto flex max-w-[720px] items-end gap-2 rounded-xl border border-zinc-200 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-zinc-200">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-zinc-500" aria-label="Attach file"><Paperclip /></Button>
            </TooltipTrigger>
            <TooltipContent>Attach file</TooltipContent>
          </Tooltip>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
            placeholder={`Reply to ${conversation.name.split(" ")[0]}…`}
            className="max-h-28 min-h-9 resize-none border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
          />
          <Button size="icon" onClick={submitMessage} disabled={!draft.trim()} aria-label="Send message"><Send /></Button>
        </div>
        <p className="mx-auto mt-2 max-w-[720px] text-center text-[11px] text-zinc-500">Enter to send · Shift + Enter for a new line</p>
      </div>
    </div>
  );
}

function CustomerContext({
  customer,
  booking,
  approvalState,
  onViewCustomer,
}: {
  customer: Customer;
  booking?: Booking;
  approvalState: ApprovalState;
  onViewCustomer: () => void;
}) {
  return (
    <aside className="hidden min-h-0 flex-col border-l border-zinc-200 bg-zinc-50/50 2xl:flex">
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-white text-sm font-medium ring-1 ring-zinc-200">{customer.initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{customer.name}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{customer.since}</div>
            </div>
          </div>
          <Button variant="outline" className="mt-4 w-full bg-white" onClick={onViewCustomer}>View customer</Button>

          <Separator className="my-6" />
          <h2 className="text-sm font-semibold">Contact</h2>
          <div className="mt-3 space-y-3 text-xs text-zinc-600">
            <div className="flex gap-3"><Phone className="size-4 shrink-0 text-zinc-400" /><span>{customer.phone}</span></div>
            <div className="flex gap-3"><MessageSquare className="size-4 shrink-0 text-zinc-400" /><span className="break-all">{customer.email}</span></div>
            <div className="flex gap-3"><Wrench className="size-4 shrink-0 text-zinc-400" /><span>{customer.address}</span></div>
          </div>

          <Separator className="my-6" />
          <h2 className="text-sm font-semibold">Upcoming booking</h2>
          {booking ? (
            <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-medium leading-5">{booking.service}</div>
                <StatusBadge status={approvalState === "approved" ? "Confirmed" : booking.status} />
              </div>
              <div className="mt-3 space-y-2 text-xs text-zinc-600">
                <div className="flex items-center gap-2"><CalendarDays className="size-3.5 text-zinc-400" />{booking.day}, {booking.date}</div>
                <div className="flex items-center gap-2"><Clock3 className="size-3.5 text-zinc-400" />{booking.time} · {booking.duration}</div>
                <div className="flex items-center gap-2"><UserRound className="size-3.5 text-zinc-400" />{booking.staff}</div>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">No upcoming bookings.</p>
          )}

          <Separator className="my-6" />
          <h2 className="text-sm font-semibold">Assistant activity</h2>
          <div className="mt-4 space-y-4">
            {[
              ["Found the booking", "Deep clean · Aug 20"],
              ["Checked availability", "Jamie + Rosa · Aug 18"],
              [approvalState === "approved" ? "Change completed" : "Waiting for approval", approvalState === "approved" ? "Customer will be notified" : "Reschedule booking"],
            ].map(([title, detail], index) => (
              <div key={title} className="relative flex gap-3">
                {index < 2 ? <span className="absolute left-[5px] top-3 h-8 w-px bg-zinc-200" /> : null}
                <div className={cn("mt-1 size-3 shrink-0 rounded-full border border-zinc-400 bg-white", index < 2 && "border-zinc-950 bg-zinc-950")} />
                <div>
                  <div className="text-xs font-medium">{title}</div>
                  <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

function InboxLayout({
  selectedId,
  onSelect,
  messages,
  approvalState,
  onApprove,
  onEdit,
  onTakeOver,
  onSend,
  onViewCustomer,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  messages: Record<string, Message[]>;
  approvalState: ApprovalState;
  onApprove: () => void;
  onEdit: () => void;
  onTakeOver: () => void;
  onSend: (text: string) => void;
  onViewCustomer: (customerId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [mobileListOpen, setMobileListOpen] = useState(false);
  const conversation = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  const customer = customers.find((item) => item.id === conversation.customerId) ?? customers[0];
  const booking = initialBookings.find((item) => item.customerId === customer.id && item.status !== "Completed");

  return (
    <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[350px_minmax(0,1fr)] 2xl:grid-cols-[350px_minmax(520px,1fr)_300px]">
      <div className="hidden min-h-0 md:block">
        <ConversationList selected={selectedId} onSelect={onSelect} search={search} onSearch={setSearch} />
      </div>
      <ConversationPanel
        conversation={conversation}
        messages={messages[conversation.id] ?? []}
        approvalState={approvalState}
        onApprove={onApprove}
        onEdit={onEdit}
        onTakeOver={onTakeOver}
        onSend={onSend}
        onOpenList={() => setMobileListOpen(true)}
      />
      <CustomerContext customer={customer} booking={booking} approvalState={approvalState} onViewCustomer={() => onViewCustomer(customer.id)} />
      <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side="left" className="w-[340px] max-w-[90vw] p-0">
          <SheetHeader className="sr-only"><SheetTitle>Conversations</SheetTitle></SheetHeader>
          <ConversationList
            selected={selectedId}
            onSelect={(id) => {
              onSelect(id);
              setMobileListOpen(false);
            }}
            search={search}
            onSearch={setSearch}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
function EditProposalDialog({ open, onOpenChange, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (time: string) => void }) {
  const [time, setTime] = useState("3:30 PM");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Edit proposed time</DialogTitle><DialogDescription>Change the time before approving the reschedule.</DialogDescription></DialogHeader>
        <label className="grid gap-2 py-3 text-sm font-medium">Tuesday, August 18<Input value={time} onChange={(event) => setTime(event.target.value)} /></label>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => { onSave(time); onOpenChange(false); }}>Save change</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InboxScreen({ selectedId }: { selectedId: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [approvalState, setApprovalState] = useState<ApprovalState>("pending");
  const [editProposalOpen, setEditProposalOpen] = useState(false);

  function appendAliceMessage(text: string) {
    setMessages((current) => ({
      ...current,
      alice: [
        ...current.alice,
        { id: `alice-${Date.now()}`, kind: "assistant", text, time: "Now" },
      ],
    }));
  }

  function approveReschedule() {
    setApprovalState("approved");
    appendAliceMessage(
      "Booking updated and confirmation sent to Alice. Tuesday at 2:30 PM is now confirmed.",
    );
  }

  function takeOver() {
    setApprovalState("taken-over");
    appendAliceMessage("Assistant paused. Kim took over the conversation.");
  }

  function saveEditedProposal(time: string) {
    setApprovalState("edited");
    appendAliceMessage(
      `Proposal changed to Tuesday at ${time}. It is ready for your review.`,
    );
  }

  function sendMessage(text: string) {
    setMessages((current) => ({
      ...current,
      [selectedId]: [
        ...(current[selectedId] ?? []),
        { id: `message-${Date.now()}`, kind: "staff", text, time: "Now" },
      ],
    }));
  }

  function selectConversation(id: string) {
    router.replace(`/inbox?conversation=${id}`, { scroll: false });
  }

  return (
    <>
      <InboxLayout
        selectedId={selectedId}
        onSelect={selectConversation}
        messages={messages}
        approvalState={approvalState}
        onApprove={approveReschedule}
        onEdit={() => setEditProposalOpen(true)}
        onTakeOver={takeOver}
        onSend={sendMessage}
        onViewCustomer={(customerId) => router.push(`/customers/${customerId}`)}
      />
      <EditProposalDialog
        open={editProposalOpen}
        onOpenChange={setEditProposalOpen}
        onSave={saveEditedProposal}
      />
    </>
  );
}
