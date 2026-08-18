"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Circle,
  Clock3,
  List,
  MessageCircle,
  Plus,
  Send,
  X,
} from "lucide-react";
import type {
  ApprovalRequest,
  ConversationSummary,
  SupportConversation,
} from "@/lib/business-support-agent";
import { useSupportConversations, type DecisionState } from "@/lib/use-support-conversations";

type ChatView = "conversation" | "threads" | "new";
function formatBookingTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "Recently"
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

export function SupportStudio() {
  const support = useSupportConversations();
  const [view, setView] = useState<ChatView>("conversation");
  const [isOpen, setIsOpen] = useState(false);
  const [reply, setReply] = useState("");

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = reply.trim();
    if (!message) return;
    setReply("");
    await support.sendReply(message);
  }

  async function submitNewRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();
    if (!message) return;
    setView("conversation");
    await support.createRequest(message);
  }

  return (
    <>
      <button
        className="support-inline-trigger"
        type="button"
        onClick={() => {
          setView("new");
          setIsOpen(true);
        }}
      >
        Start a conversation <MessageCircle size={16} />
      </button>

      {isOpen ? (
        <aside
          className="chat-window"
          id="support-chat-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby="support-chat-title"
        >
          <header className="chat-header">
            <span className="chat-brand-mark">
              <MessageCircle size={18} />
            </span>
            <div>
              <strong id="support-chat-title">Oak & Pine</strong>
              <span>
                <span className="chat-online-dot" /> Support is online
              </span>
            </div>
            <div className="chat-header-actions">
              <button
                type="button"
                onClick={() => setView("threads")}
                aria-label="View conversations"
              >
                <List size={17} />
              </button>
              <button type="button" onClick={() => setView("new")} aria-label="Create new request">
                <Plus size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close support chat"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          {view === "threads" ? (
            <ThreadList
              threads={support.threads}
              activeId={support.activeId}
              onSelect={(id) => {
                setReply("");
                setView("conversation");
                void support.selectConversation(id);
              }}
              onNew={() => setView("new")}
            />
          ) : null}
          {view === "new" ? (
            <NewRequestForm onCancel={() => setView("conversation")} onSubmit={submitNewRequest} />
          ) : null}
          {view === "conversation" ? (
            <ConversationView
              conversation={support.conversation}
              messages={support.messages}
              approval={support.approval}
              reply={reply}
              error={support.error}
              isSending={support.isSending}
              decisionState={support.decisionState}
              onReplyChange={setReply}
              onSubmit={submitReply}
              onBack={() => setView("threads")}
              onDecision={support.submitDecision}
            />
          ) : null}
          <div
            className={`chat-notice ${support.notice ? "chat-notice--visible" : ""}`}
            role="status"
            aria-live="polite"
          >
            <Check size={14} /> {support.notice}
          </div>
        </aside>
      ) : (
        <button
          className="chat-launcher"
          id="support-chat"
          type="button"
          aria-label="Open customer support chat"
          aria-controls="support-chat-window"
          onClick={() => setIsOpen(true)}
        >
          <span className="chat-launcher-icon">
            <MessageCircle size={21} />
          </span>
          <span>
            <strong>Need a hand?</strong>
            <small>Chat with us</small>
          </span>
          <span className="chat-online-dot" />
        </button>
      )}
    </>
  );
}

function ThreadList({
  threads,
  activeId,
  onSelect,
  onNew,
}: {
  threads: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="chat-view chat-thread-view">
      <div className="chat-view-heading">
        <h3>Your conversations</h3>
        <button type="button" onClick={onNew}>
          <Plus size={15} /> New
        </button>
      </div>
      <div className="chat-thread-list">
        {threads.map((thread) => (
          <button
            className={thread.id === activeId ? "chat-thread chat-thread--active" : "chat-thread"}
            key={thread.id}
            type="button"
            onClick={() => onSelect(thread.id)}
          >
            <span className={`chat-thread-status chat-thread-status--${thread.status}`}>
              {thread.status === "open" ? (
                <Circle size={8} fill="currentColor" />
              ) : (
                <Check size={11} />
              )}
            </span>
            <span className="chat-thread-copy">
              <strong>{thread.title}</strong>
              {thread.lastMessagePreview ? (
                <span className="chat-thread-preview">{thread.lastMessagePreview}</span>
              ) : null}
              <small>{formatUpdatedAt(thread.updatedAt)}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConversationView({
  conversation,
  messages,
  approval,
  reply,
  error,
  isSending,
  decisionState,
  onReplyChange,
  onSubmit,
  onBack,
  onDecision,
}: {
  conversation: SupportConversation | null;
  messages: Array<{ id: string; sender: "customer" | "business"; body: string }>;
  approval: ApprovalRequest | null;
  reply: string;
  error: string;
  isSending: boolean;
  decisionState: DecisionState;
  onReplyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onDecision: (decision: "approve" | "decline") => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isSending]);

  return (
    <div className="chat-view chat-conversation-view">
      <div className="chat-conversation-heading">
        <button type="button" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft size={17} />
        </button>
        <div>
          <h3>{conversation?.title ?? "New conversation"}</h3>
        </div>
      </div>
      <div className="chat-messages">
        <div className="chat-status chat-status--open">Open</div>
        {messages.map((message) => (
          <div className={`chat-message chat-message--${message.sender}`} key={message.id}>
            {message.sender === "business" ? <span>O&amp;P</span> : null}
            <div>
              <div className="chat-message-body">
                <ReactMarkdown>{message.body}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isSending && !messages.some((message) => message.id === "streaming-assistant") ? (
          <div
            className="chat-message chat-message--business chat-message--typing"
            aria-label="Oak and Pine is typing"
          >
            <span>O&amp;P</span>
            <div>
              <div className="chat-message-body chat-message-body--typing">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
      {approval ? (
        <ApprovalCard
          approval={approval}
          decisionState={decisionState}
          error={error}
          onDecision={onDecision}
        />
      ) : error ? (
        <p className="chat-approval-error" role="alert">
          {error}
        </p>
      ) : null}
      <form className="chat-reply" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="chat-reply-input">
          Write a message
        </label>
        <textarea
          id="chat-reply-input"
          rows={2}
          placeholder={approval ? "Decline and suggest a correction…" : "Write a message…"}
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          disabled={isSending || decisionState !== "idle"}
        />
        <button
          type="submit"
          disabled={!reply.trim() || isSending || decisionState !== "idle"}
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}

function ApprovalCard({
  approval,
  decisionState,
  error,
  onDecision,
}: {
  approval: ApprovalRequest;
  decisionState: DecisionState;
  error: string;
  onDecision: (decision: "approve" | "decline") => void;
}) {
  const busy = decisionState !== "idle";
  return (
    <section className="chat-approval" aria-labelledby="booking-approval-heading" aria-busy={busy}>
      <span className="sr-only" aria-live="polite">
        A booking change is waiting for your confirmation.
      </span>
      <div className="chat-approval-heading">
        <span>
          <CalendarClock size={16} />
        </span>
        <div>
          <strong id="booking-approval-heading">Confirm booking change?</strong>
          <small>
            {approval.service}
            {approval.staff ? ` with ${approval.staff}` : ""}
          </small>
        </div>
      </div>
      <div className="chat-approval-change">
        <span>{formatBookingTime(approval.currentStartTime)}</span>
        <span>→</span>
        <strong>{formatBookingTime(approval.proposedStartTime)}</strong>
      </div>
      {approval.status === "stale" ? (
        <p className="chat-approval-error">
          This request is stale. Decline it and ask for a new time.
        </p>
      ) : null}
      {error ? (
        <p className="chat-approval-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="chat-approval-actions">
        <button
          type="button"
          className="chat-approval-decline"
          onClick={() => onDecision("decline")}
          disabled={busy}
          aria-label={`Decline change for ${approval.service}`}
        >
          {decisionState === "declining" ? "Declining…" : "Decline"}
        </button>
        <button
          type="button"
          className="chat-approval-confirm"
          onClick={() => onDecision("approve")}
          disabled={busy || !approval.canApprove}
          aria-label={`Confirm change for ${approval.service}`}
        >
          {decisionState === "confirming" ? "Confirming…" : "Confirm"}
        </button>
      </div>
    </section>
  );
}

function NewRequestForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="chat-view chat-new-view">
      <div className="chat-conversation-heading">
        <button type="button" onClick={onCancel} aria-label="Cancel new request">
          <ArrowLeft size={17} />
        </button>
        <div>
          <h3>How can we help?</h3>
        </div>
      </div>
      <form className="chat-request-form" onSubmit={onSubmit}>
        <div className="chat-customer">
          <span>AM</span>
          <div>
            <small>Requesting as</small>
            <strong>Alice Morgan</strong>
          </div>
        </div>
        <label>
          <span>Message</span>
          <textarea
            name="message"
            required
            rows={5}
            defaultValue="I need to reschedule my next appointment."
            placeholder="Share the details…"
          />
        </label>
        <p>
          <Clock3 size={14} /> We usually reply in a few moments.
        </p>
        <div className="chat-request-actions">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">
            Start conversation <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
}
