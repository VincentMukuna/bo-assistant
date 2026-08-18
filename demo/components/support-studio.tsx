"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  MoreHorizontal,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

type Message = {
  id: string;
  sender: "customer" | "business";
  body: string;
  time: string;
};

type SupportThread = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  status: "Open" | "Closed";
  messages: Message[];
};

const initialThreads: SupportThread[] = [
  {
    id: "reschedule-clean",
    title: "Move Thursday’s deep clean",
    category: "Booking change",
    updatedAt: "4 min ago",
    status: "Open",
    messages: [
      {
        id: "alice-1",
        sender: "customer",
        body: "Hi, I need to move my deep clean this Thursday. Do you have anything early next week?",
        time: "9:42 AM",
      },
      {
        id: "oak-1",
        sender: "business",
        body: "Absolutely. We can keep your usual cleaning team and offer Monday morning or Tuesday afternoon. Which would you prefer?",
        time: "9:44 AM",
      },
      {
        id: "alice-2",
        sender: "customer",
        body: "Tuesday afternoon would be perfect.",
        time: "9:48 AM",
      },
    ],
  },
  {
    id: "window-track",
    title: "Window track repair",
    category: "Repair request",
    updatedAt: "2 days ago",
    status: "Closed",
    messages: [
      {
        id: "alice-3",
        sender: "customer",
        body: "The living room window has started sticking again. Could Noah take a look this week?",
        time: "Mon, 11:12 AM",
      },
      {
        id: "oak-2",
        sender: "business",
        body: "You’re booked with Noah for Friday at 11:30 AM. We’ve added the note about the living room window.",
        time: "Mon, 11:18 AM",
      },
    ],
  },
];

function currentTime() {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());
}

export function SupportStudio() {
  const [threads, setThreads] = useState<SupportThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id);
  const [isCreating, setIsCreating] = useState(false);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [activeThreadId, threads],
  );

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2800);
  }

  function selectThread(id: string) {
    setActiveThreadId(id);
    setIsCreating(false);
    setReply("");
  }

  function clearMessages() {
    if (!activeThread) return;
    setThreads((current) =>
      current.map((thread) => (thread.id === activeThread.id ? { ...thread, messages: [] } : thread)),
    );
    announce("Messages cleared from this thread");
  }

  function toggleStatus() {
    if (!activeThread) return;
    const nextStatus = activeThread.status === "Open" ? "Closed" : "Open";
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id ? { ...thread, status: nextStatus, updatedAt: "Just now" } : thread,
      ),
    );
    announce(nextStatus === "Closed" ? "Thread closed" : "Thread reopened");
  }

  function resetDemo() {
    setThreads(initialThreads);
    setActiveThreadId(initialThreads[0].id);
    setIsCreating(false);
    setReply("");
    announce("Demo conversations restored");
  }

  function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reply.trim();
    if (!body || !activeThread) return;

    const message: Message = {
      id: crypto.randomUUID(),
      sender: "customer",
      body,
      time: currentTime(),
    };

    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id
          ? { ...thread, messages: [...thread.messages, message], status: "Open", updatedAt: "Just now" }
          : thread,
      ),
    );
    setReply("");
    announce("Message added to the local thread");
  }

  function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("message") ?? "").trim();
    const category = String(form.get("category") ?? "General question");
    if (!title || !body) return;

    const id = crypto.randomUUID();
    const nextThread: SupportThread = {
      id,
      title,
      category,
      updatedAt: "Just now",
      status: "Open",
      messages: [{ id: crypto.randomUUID(), sender: "customer", body, time: currentTime() }],
    };

    setThreads((current) => [nextThread, ...current]);
    setActiveThreadId(id);
    setIsCreating(false);
    announce("New support thread created");
  }

  return (
    <div className="support-studio">
      <div className="studio-toolbar">
        <div className="studio-identity">
          <span className="customer-avatar">AM</span>
          <span>
            <small>Signed in as</small>
            <strong>Alice Morgan</strong>
          </span>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <div className="demo-status"><span /> Local demo · no API connected</div>
        <button className="toolbar-action" type="button" onClick={resetDemo}>
          <RotateCcw size={14} /> Reset demo
        </button>
      </div>

      <div className="studio-layout">
        <aside className="thread-sidebar" aria-label="Support conversations">
          <div className="thread-sidebar__heading">
            <div><small>Customer area</small><h3>My requests</h3></div>
            <button
              className="icon-button icon-button--dark"
              type="button"
              aria-label="Create new support request"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} />
            </button>
          </div>
          <button className="new-request-button" type="button" onClick={() => setIsCreating(true)}>
            <Plus size={16} /> New support request
          </button>
          <div className="thread-list">
            {threads.map((thread) => (
              <button
                className={`thread-item ${!isCreating && activeThread?.id === thread.id ? "thread-item--active" : ""}`}
                key={thread.id}
                type="button"
                onClick={() => selectThread(thread.id)}
              >
                <span className={`thread-state thread-state--${thread.status.toLowerCase()}`}>
                  {thread.status === "Open" ? <Circle size={8} fill="currentColor" /> : <Check size={11} />}
                </span>
                <span className="thread-copy">
                  <strong>{thread.title}</strong>
                  <small>{thread.category} · {thread.updatedAt}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="sidebar-help">
            <Sparkles size={16} />
            <p><strong>Need urgent help?</strong><br />Call us at (415) 555-0140</p>
          </div>
        </aside>

        <section className="conversation-panel" aria-label="Selected support conversation">
          {isCreating ? (
            <NewRequestForm onCancel={() => setIsCreating(false)} onSubmit={createThread} />
          ) : activeThread ? (
            <>
              <div className="conversation-header">
                <button
                  className="mobile-back"
                  type="button"
                  aria-label="Create new support request"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus size={18} />
                </button>
                <div>
                  <div className="conversation-meta">
                    <span className={`status-pill status-pill--${activeThread.status.toLowerCase()}`}>
                      {activeThread.status}
                    </span>
                    <span>Request #{activeThread.id.slice(0, 6).toUpperCase()}</span>
                  </div>
                  <h3>{activeThread.title}</h3>
                </div>
                <div className="conversation-actions">
                  <button type="button" onClick={toggleStatus} title={activeThread.status === "Open" ? "Close thread" : "Reopen thread"}>
                    <Archive size={15} /> {activeThread.status === "Open" ? "Close" : "Reopen"}
                  </button>
                  <button type="button" onClick={clearMessages} title="Clear all messages in this thread">
                    <Trash2 size={15} /> Clear messages
                  </button>
                  <button className="more-button" type="button" aria-label="More actions"><MoreHorizontal size={18} /></button>
                </div>
              </div>

              <div className="message-area">
                <div className="date-divider"><span>Recent conversation</span></div>
                {activeThread.messages.length > 0 ? (
                  <div className="message-list">
                    {activeThread.messages.map((message) => (
                      <div className={`message-row message-row--${message.sender}`} key={message.id}>
                        {message.sender === "business" ? <span className="message-avatar">O&P</span> : null}
                        <div>
                          <span className="message-sender">
                            {message.sender === "customer" ? "You" : "Oak & Pine support"}
                          </span>
                          <p>{message.body}</p>
                          <small>{message.time}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-messages">
                    <span><Trash2 size={22} /></span>
                    <h4>This thread is clear</h4>
                    <p>Send a message below to begin this conversation again.</p>
                  </div>
                )}
              </div>

              <form className="reply-form" onSubmit={sendReply}>
                <label className="sr-only" htmlFor="support-reply">Reply to support</label>
                <textarea
                  id="support-reply"
                  placeholder={activeThread.status === "Closed" ? "Reply to reopen this request…" : "Write a message…"}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  rows={2}
                />
                <div className="reply-actions">
                  <button className="attachment-button" type="button" aria-label="Attach a file"><Paperclip size={17} /></button>
                  <span>Messages stay in this browser session</span>
                  <button className="send-button" type="submit" disabled={!reply.trim()}>
                    Send <Send size={15} />
                  </button>
                </div>
              </form>
            </>
          ) : null}
        </section>
      </div>
      <div className={`studio-notice ${notice ? "studio-notice--visible" : ""}`} role="status" aria-live="polite">
        <Check size={15} /> {notice}
      </div>
    </div>
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
    <div className="new-request-view">
      <div className="new-request-heading">
        <button type="button" onClick={onCancel} aria-label="Cancel new request"><ArrowLeft size={18} /></button>
        <div><span className="kicker">New conversation</span><h3>How can we help?</h3></div>
      </div>
      <form className="request-form" onSubmit={onSubmit}>
        <div className="customer-context">
          <span className="customer-avatar customer-avatar--large">AM</span>
          <span><small>Requesting as</small><strong>Alice Morgan</strong><em>alice.morgan@example.com</em></span>
        </div>
        <label>
          <span>What can we help with?</span>
          <select name="category" defaultValue="Booking change">
            <option>Booking change</option>
            <option>New service</option>
            <option>Repair request</option>
            <option>Billing question</option>
            <option>General question</option>
          </select>
        </label>
        <label>
          <span>Request title</span>
          <input name="title" required placeholder="A short summary of your request" />
        </label>
        <label>
          <span>Message</span>
          <textarea name="message" required rows={5} placeholder="Share the details our team should know…" />
        </label>
        <div className="form-note"><Clock3 size={15} /> Our typical reply time is under 10 minutes during business hours.</div>
        <div className="form-actions">
          <button className="button button--ghost" type="button" onClick={onCancel}>Cancel</button>
          <button className="button button--primary" type="submit">Create request <ArrowLeft className="arrow-forward" size={16} /></button>
        </div>
      </form>
    </div>
  );
}
