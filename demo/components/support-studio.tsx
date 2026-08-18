"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  Check,
  Circle,
  Clock3,
  List,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
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

type ChatView = "conversation" | "threads" | "new";

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
  const [view, setView] = useState<ChatView>("conversation");
  const [isOpen, setIsOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? threads[0],
    [activeThreadId, threads],
  );

  function announce(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }

  function openChat(nextView: ChatView = "conversation") {
    setView(nextView);
    setIsOpen(true);
  }

  function selectThread(id: string) {
    setActiveThreadId(id);
    setReply("");
    setView("conversation");
  }

  function clearMessages() {
    if (!activeThread) return;
    setThreads((current) =>
      current.map((thread) => (thread.id === activeThread.id ? { ...thread, messages: [] } : thread)),
    );
    announce("Messages cleared");
  }

  function toggleStatus() {
    if (!activeThread) return;
    const nextStatus = activeThread.status === "Open" ? "Closed" : "Open";
    setThreads((current) =>
      current.map((thread) =>
        thread.id === activeThread.id ? { ...thread, status: nextStatus, updatedAt: "Just now" } : thread,
      ),
    );
    announce(nextStatus === "Closed" ? "Request closed" : "Request reopened");
  }

  function resetDemo() {
    setThreads(initialThreads);
    setActiveThreadId(initialThreads[0].id);
    setReply("");
    setView("conversation");
    announce("Demo restored");
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
    announce("Message sent locally");
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
    setView("conversation");
    announce("New request created");
  }

  return (
    <>
      <button className="support-inline-trigger" type="button" onClick={() => openChat("new")}>
        Start a conversation <MessageCircle size={16} />
      </button>

      {isOpen ? (
        <aside
          className="chat-window"
          id="support-chat-window"
          role="dialog"
          aria-modal="false"
          aria-labelledby="support-chat-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        >
          <header className="chat-header">
            <span className="chat-brand-mark"><MessageCircle size={18} /></span>
            <div>
              <strong id="support-chat-title">Oak & Pine</strong>
              <span><i /> Support is online</span>
            </div>
            <div className="chat-header-actions">
              <button type="button" onClick={() => setView("threads")} aria-label="View conversations">
                <List size={17} />
              </button>
              <button type="button" onClick={() => setView("new")} aria-label="Create new request">
                <Plus size={17} />
              </button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close support chat">
                <X size={18} />
              </button>
            </div>
          </header>

          {view === "threads" ? (
            <ThreadList
              threads={threads}
              activeThreadId={activeThreadId}
              onSelect={selectThread}
              onNew={() => setView("new")}
              onReset={resetDemo}
            />
          ) : null}

          {view === "new" ? (
            <NewRequestForm onCancel={() => setView("conversation")} onSubmit={createThread} />
          ) : null}

          {view === "conversation" && activeThread ? (
            <Conversation
              thread={activeThread}
              reply={reply}
              onReplyChange={setReply}
              onSend={sendReply}
              onBack={() => setView("threads")}
              onClear={clearMessages}
              onToggleStatus={toggleStatus}
            />
          ) : null}

          <div className={`chat-notice ${notice ? "chat-notice--visible" : ""}`} role="status" aria-live="polite">
            <Check size={14} /> {notice}
          </div>
        </aside>
      ) : (
        <button
          className="chat-launcher"
          id="support-chat"
          type="button"
          aria-expanded="false"
          aria-controls="support-chat-window"
          onClick={() => openChat()}
        >
          <span className="chat-launcher-icon"><MessageCircle size={21} /></span>
          <span><strong>Need a hand?</strong><small>Chat with us</small></span>
          <i aria-hidden="true" />
        </button>
      )}
    </>
  );
}

function ThreadList({
  threads,
  activeThreadId,
  onSelect,
  onNew,
  onReset,
}: {
  threads: SupportThread[];
  activeThreadId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onReset: () => void;
}) {
  return (
    <div className="chat-view chat-thread-view">
      <div className="chat-view-heading">
        <div><h3>Your conversations</h3></div>
        <button type="button" onClick={onNew}><Plus size={15} /> New</button>
      </div>
      <div className="chat-thread-list">
        {threads.map((thread) => (
          <button
            className={thread.id === activeThreadId ? "chat-thread chat-thread--active" : "chat-thread"}
            key={thread.id}
            type="button"
            onClick={() => onSelect(thread.id)}
          >
            <span className={`chat-thread-status chat-thread-status--${thread.status.toLowerCase()}`}>
              {thread.status === "Open" ? <Circle size={8} fill="currentColor" /> : <Check size={11} />}
            </span>
            <span><strong>{thread.title}</strong><small>{thread.category} · {thread.updatedAt}</small></span>
          </button>
        ))}
      </div>
      <button className="chat-reset" type="button" onClick={onReset}>
        <RotateCcw size={14} /> Reset demo conversations
      </button>
    </div>
  );
}

function Conversation({
  thread,
  reply,
  onReplyChange,
  onSend,
  onBack,
  onClear,
  onToggleStatus,
}: {
  thread: SupportThread;
  reply: string;
  onReplyChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onClear: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div className="chat-view chat-conversation-view">
      <div className="chat-conversation-heading">
        <button type="button" onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={17} /></button>
        <div><h3>{thread.title}</h3></div>
        <button type="button" onClick={onToggleStatus} aria-label={thread.status === "Open" ? "Close request" : "Reopen request"}>
          <Archive size={16} />
        </button>
        <button type="button" onClick={onClear} aria-label="Clear messages"><Trash2 size={16} /></button>
      </div>
      <div className="chat-messages">
        <div className={`chat-status chat-status--${thread.status.toLowerCase()}`}>{thread.status}</div>
        {thread.messages.length > 0 ? (
          thread.messages.map((message) => (
            <div className={`chat-message chat-message--${message.sender}`} key={message.id}>
              {message.sender === "business" ? <span>O&P</span> : null}
              <div><p>{message.body}</p><small>{message.time}</small></div>
            </div>
          ))
        ) : (
          <div className="chat-empty"><Trash2 size={20} /><strong>Messages cleared</strong><span>Send a message to begin again.</span></div>
        )}
      </div>
      <form className="chat-reply" onSubmit={onSend}>
        <label className="sr-only" htmlFor="chat-reply-input">Write a message</label>
        <textarea
          id="chat-reply-input"
          rows={2}
          placeholder={thread.status === "Closed" ? "Reply to reopen…" : "Write a message…"}
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
        />
        <button type="submit" disabled={!reply.trim()} aria-label="Send message"><Send size={17} /></button>
      </form>
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
    <div className="chat-view chat-new-view">
      <div className="chat-conversation-heading">
        <button type="button" onClick={onCancel} aria-label="Cancel new request"><ArrowLeft size={17} /></button>
        <div><h3>How can we help?</h3></div>
      </div>
      <form className="chat-request-form" onSubmit={onSubmit}>
        <div className="chat-customer"><span>AM</span><div><small>Requesting as</small><strong>Alice Morgan</strong></div></div>
        <label><span>Topic</span><select name="category" defaultValue="Booking change"><option>Booking change</option><option>New service</option><option>Repair request</option><option>Billing question</option><option>General question</option></select></label>
        <label><span>Request title</span><input name="title" required placeholder="A short summary" /></label>
        <label><span>Message</span><textarea name="message" required rows={4} placeholder="Share the details…" /></label>
        <p><Clock3 size={14} /> Typical reply time is under 10 minutes.</p>
        <button type="submit">Create request <Send size={14} /></button>
      </form>
    </div>
  );
}
