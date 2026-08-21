"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Circle,
  Clock3,
  MessageCircle,
  MailCheck,
  Plus,
  Send,
  UserRound,
  X,
} from "lucide-react";
import type {
  ApprovalRequest,
  ConversationSummary,
} from "@/lib/business-support-agent";
import { useSupportConversations, type DecisionState } from "@/lib/use-support-conversations";

type ChatView = "account" | "conversation" | "threads" | "new";
const SUGGESTED_MESSAGES = [
  "I need to reschedule my appointment.",
  "I’d like to book an appointment.",
  "I have a question about your services.",
];

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
  const headerTitle =
    view === "conversation"
      ? (support.conversation?.title ?? "New conversation")
      : view === "threads"
        ? "Your conversations"
        : view === "new"
          ? "How can we help?"
          : "Personalized support";
  const hasHeaderBack = view !== "threads";
  const backActionLabel =
    view === "conversation" ? "View conversations" : "Back to conversation";
  const supportActionLabel = support.session?.isVerified
    ? "View personalized support"
    : "Unlock personalized support";

  function navigateBack() {
    setView(view === "conversation" ? "threads" : "conversation");
  }

  function submitReply(message: string) {
    support.sendReply(message);
  }

  async function submitNewRequest(message: string) {
    setView("conversation");
    await support.createRequest(message);
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (!email) return;
    await support.requestVerification(email, name || undefined).catch(() => undefined);
  }

  async function submitVerificationCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replace(/\D/g, "");
    if (code.length !== 6) return;
    await support.verifyEmailCode(code).catch(() => undefined);
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
            {hasHeaderBack ? (
              <button
                className="chat-header-back chat-icon-tooltip chat-icon-tooltip--start"
                type="button"
                onClick={navigateBack}
                aria-label={backActionLabel}
                data-tooltip={backActionLabel}
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <span className="chat-brand-mark">
                <MessageCircle size={18} />
              </span>
            )}
            <div className="chat-header-copy">
              <strong id="support-chat-title">{headerTitle}</strong>
              <span>
                <span className="chat-online-dot" /> Oak &amp; Pine is online
              </span>
            </div>
            <div className="chat-header-actions">
              {view === "conversation" || view === "threads" ? (
                <>
                  <button
                    className="chat-icon-tooltip"
                    type="button"
                    onClick={() => setView("account")}
                    aria-label={supportActionLabel}
                    data-tooltip={supportActionLabel}
                  >
                    <UserRound size={17} />
                  </button>
                  <button
                    className="chat-icon-tooltip"
                    type="button"
                    onClick={() => setView("new")}
                    aria-label="Create new request"
                    data-tooltip="New request"
                  >
                    <Plus size={17} />
                  </button>
                </>
              ) : null}
              <button
                className="chat-icon-tooltip chat-icon-tooltip--end"
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close support chat"
                data-tooltip="Close chat"
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
                setView("conversation");
                void support.selectConversation(id);
              }}
            />
          ) : null}
          {view === "account" ? (
            <AccountView
              session={support.session}
              sentTo={support.verificationSentTo}
              error={support.error}
              isSending={support.isRequestingVerification}
              isVerifying={support.isVerifyingEmail}
              onSubmit={submitAccount}
              onSubmitCode={submitVerificationCode}
              onResend={() => void support.resendVerification().catch(() => undefined)}
              onChangeEmail={support.changeVerificationEmail}
            />
          ) : null}
          {view === "new" ? (
            <NewRequestForm onStart={submitNewRequest} />
          ) : null}
          {view === "conversation" ? (
            <ConversationView
              key={support.activeId ?? "new"}
              messages={support.messages}
              approval={support.approval}
              error={support.error}
              isSending={support.isSending}
              decisionState={support.decisionState}
              onSend={submitReply}
              onDecision={support.submitDecision}
              isVerified={Boolean(support.session?.isVerified)}
              onVerify={() => setView("account")}
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
}: {
  threads: ConversationSummary[];
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="chat-view chat-thread-view">
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
  messages,
  approval,
  error,
  isSending,
  decisionState,
  onSend,
  onDecision,
  isVerified,
  onVerify,
}: {
  messages: Array<{ id: string; sender: "customer" | "business"; body: string }>;
  approval: ApprovalRequest | null;
  error: string;
  isSending: boolean;
  decisionState: DecisionState;
  onSend: (message: string) => void;
  onDecision: (decision: "approve" | "decline") => void;
  isVerified: boolean;
  onVerify: () => void;
}) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const replyUnavailable = isSending || decisionState !== "idle";
  useEffect(() => {
    const pane = messagesRef.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages, isSending]);

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (replyUnavailable) return;
    const form = event.currentTarget;
    const message = String(new FormData(form).get("message") ?? "").trim();
    if (!message) return;
    form.reset();
    onSend(message);
  }

  return (
    <div className="chat-view chat-conversation-view">
      <div
        className={messages.length ? "chat-messages" : "chat-messages chat-new-messages"}
        ref={messagesRef}
      >
        {messages.length ? (
          <>
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
          </>
        ) : (
          <ChatStarter onSelect={onSend} disabled={replyUnavailable} />
        )}
        {isSending && !messages.some((message) => message.id === "streaming-assistant") ? (
          <div
            className="chat-message chat-message--business chat-message--typing"
            role="status"
            aria-live="polite"
          >
            <span>O&amp;P</span>
            <div>
              <div className="chat-message-body chat-message-body--typing">
                Looking into that…
              </div>
            </div>
          </div>
        ) : null}
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
      {!approval ? (
        <div className="chat-compose">
          {!isVerified ? (
            <button className="chat-verify-prompt" type="button" onClick={onVerify}>
              Unlock personalized support
            </button>
          ) : null}
          <form className="chat-reply" onSubmit={submitMessage} aria-busy={isSending}>
            <label className="sr-only" htmlFor="chat-reply-input">
              Write a message
            </label>
            <input
              id="chat-reply-input"
              name="message"
              type="text"
              placeholder="Write a message…"
              autoComplete="off"
              enterKeyHint="send"
              required
              readOnly={replyUnavailable}
              aria-disabled={replyUnavailable}
            />
            <button
              className="chat-icon-tooltip chat-icon-tooltip--above chat-icon-tooltip--end"
              type="submit"
              disabled={replyUnavailable}
              aria-label="Send message"
              data-tooltip="Send message"
            >
              <Send size={17} />
            </button>
          </form>
        </div>
      ) : null}
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
  const awaitingOwner = approval.status === "awaiting_owner";
  const awaitingCustomer = approval.status === "awaiting_customer";
  return (
    <section className="chat-approval" aria-labelledby="booking-approval-heading" aria-busy={busy}>
      <span className="sr-only" aria-live="polite">
        {awaitingOwner
          ? "Oak and Pine is reviewing the booking change. No customer action is needed."
          : "A booking change is waiting for your confirmation."}
      </span>
      <div className="chat-approval-heading">
        <span>
          <CalendarClock size={16} />
        </span>
        <div>
          <strong id="booking-approval-heading">
            {awaitingOwner ? "Oak & Pine is on it" : "Does this new time work?"}
          </strong>
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
      {awaitingOwner ? (
        <p className="chat-approval-waiting">
          <Clock3 size={14} aria-hidden="true" />
          <span>
            Oak &amp; Pine is reviewing your request. There’s nothing you need to do, and your
            current booking stays unchanged for now.
          </span>
        </p>
      ) : null}
      {approval.status === "stale" ? (
        <p className="chat-approval-error">
          This time needs a refresh. Keep your current booking, then ask for another option.
        </p>
      ) : null}
      {error ? (
        <p className="chat-approval-error" role="alert">
          {error}
        </p>
      ) : null}
      {!awaitingOwner ? (
        <div className="chat-approval-actions">
          <button
            type="button"
            className="chat-approval-decline"
            onClick={() => onDecision("decline")}
            disabled={busy}
            aria-label={`Decline change for ${approval.service}`}
          >
            {decisionState === "declining" ? "Updating…" : "Keep current time"}
          </button>
          <button
            type="button"
            className="chat-approval-confirm"
            onClick={() => onDecision("approve")}
            disabled={busy || !awaitingCustomer}
            aria-label={`Confirm change for ${approval.service}`}
          >
            {decisionState === "confirming" ? "Confirming…" : "Confirm new time"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function NewRequestForm({ onStart }: { onStart: (message: string) => void }) {
  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = String(new FormData(event.currentTarget).get("message") ?? "").trim();
    if (message) onStart(message);
  }

  return (
    <div className="chat-view chat-new-view">
      <div className="chat-messages chat-new-messages">
        <ChatStarter onSelect={onStart} />
      </div>
      <form className="chat-reply" onSubmit={submitMessage}>
        <label className="sr-only" htmlFor="chat-new-reply-input">
          Write a message
        </label>
        <input
          id="chat-new-reply-input"
          name="message"
          type="text"
          placeholder="Write a message…"
          autoComplete="off"
          enterKeyHint="send"
          required
          autoFocus
        />
        <button
          className="chat-icon-tooltip chat-icon-tooltip--above chat-icon-tooltip--end"
          type="submit"
          aria-label="Start conversation"
          data-tooltip="Start conversation"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}

function ChatStarter({
  onSelect,
  disabled = false,
}: {
  onSelect: (message: string) => void;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="chat-message chat-message--business">
        <span>O&amp;P</span>
        <div>
          <div className="chat-message-body">
            <p>Hi! What can we take care of for you today?</p>
          </div>
        </div>
      </div>
      <div className="chat-starter-replies" aria-label="Suggested messages">
        {SUGGESTED_MESSAGES.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelect(suggestion)}
            disabled={disabled}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </>
  );
}

function AccountView({
  session,
  sentTo,
  error,
  isSending,
  isVerifying,
  onSubmit,
  onSubmitCode,
  onResend,
  onChangeEmail,
}: {
  session: { name: string | null; email: string | null; isVerified: boolean } | null;
  sentTo: string;
  error: string;
  isSending: boolean;
  isVerifying: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubmitCode: (event: FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  return (
    <div className="chat-view chat-account-view">
      <div className="chat-account-body">
        {session?.isVerified ? (
          <div className="chat-account-state">
            <span className="chat-account-check">
              <Check size={18} />
            </span>
            <strong>{session.name ? `Welcome, ${session.name}` : "You’re all set"}</strong>
            <p>{session.email}</p>
            <small>Personalized support is ready—you can manage appointments here.</small>
          </div>
        ) : sentTo ? (
          <div className="chat-account-code">
            <div className="chat-account-state">
              <MailCheck size={24} />
              <strong>Check your inbox</strong>
              <p>
                We sent a 6-digit code to <strong>{sentTo}</strong>.
              </p>
            </div>
            <form className="chat-account-form" onSubmit={onSubmitCode}>
              <label>
                <span>Verification code</span>
                <input
                  className="chat-account-code-input"
                  type="text"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  required
                />
              </label>
              {error ? <p role="alert">{error}</p> : null}
              <button type="submit" disabled={isVerifying}>
                {isVerifying ? "Verifying…" : "Verify and continue"}
              </button>
            </form>
            <small className="chat-account-expiry">The code expires in 15 minutes.</small>
            <div className="chat-account-code-actions">
              <button type="button" onClick={onResend} disabled={isSending || isVerifying}>
                {isSending ? "Sending…" : "Resend code"}
              </button>
              <button type="button" onClick={onChangeEmail} disabled={isSending || isVerifying}>
                Change email
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="chat-account-intro">
              <strong>Unlock personalized support</strong>
              <p>Verify your email to get tailored help and manage appointments right here.</p>
            </div>
            <form className="chat-account-form" onSubmit={onSubmit}>
              <label>
                <span>Email</span>
                <input type="email" name="email" autoComplete="email" required />
              </label>
              <label>
                <span>
                  Name <small>Optional</small>
                </span>
                <input type="text" name="name" autoComplete="name" maxLength={120} />
              </label>
              {error ? <p role="alert">{error}</p> : null}
              <button type="submit" disabled={isSending}>
                {isSending ? "Sending…" : "Email me a code"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
