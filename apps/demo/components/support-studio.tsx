"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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
    title: "Move Tuesday’s deep clean",
    category: "Booking change",
    updatedAt: "4 min ago",
    status: "Open",
    messages: [
      {
        id: "alice-1",
        sender: "customer",
        body: "Hi, I need to move my deep clean this Tuesday. Do you have anything early next week?",
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

let localIdSequence = 0;

function createLocalId() {
  localIdSequence += 1;
  return `local-${Date.now().toString(36)}-${localIdSequence.toString(36)}`;
}

export function SupportStudio() {
  const [threads, setThreads] = useState<SupportThread[]>(initialThreads);
  const [activeThreadId, setActiveThreadId] = useState(initialThreads[0].id);
  const [view, setView] = useState<ChatView>("conversation");
  const [isOpen, setIsOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);

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

  async function askAssistant(threadId: string, messages: Message[]) {
    setIsSending(true);
    const assistantMessageId = createLocalId();
    const assistantMessageTime = currentTime();
    let assistantText = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((message) => ({
            role: message.sender === "customer" ? "user" : "assistant",
            content: message.body,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Assistant unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      function appendAssistantText(text: string) {
        if (!text) return;

        const isFirstChunk = assistantText.length === 0;
        assistantText += text;
        setThreads((current) =>
          current.map((thread) => {
            if (thread.id !== threadId) return thread;

            if (isFirstChunk) {
              return {
                ...thread,
                messages: [
                  ...thread.messages,
                  {
                    id: assistantMessageId,
                    sender: "business",
                    body: assistantText,
                    time: assistantMessageTime,
                  },
                ],
                updatedAt: "Just now",
              };
            }

            return {
              ...thread,
              messages: thread.messages.map((message) =>
                message.id === assistantMessageId ? { ...message, body: assistantText } : message,
              ),
            };
          }),
        );
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        appendAssistantText(decoder.decode(value, { stream: true }));
      }
      appendAssistantText(decoder.decode());

      if (!assistantText.trim()) {
        throw new Error("Assistant returned an empty response");
      }

      announce("Oak & Pine replied");
    } catch {
      announce(
        assistantText
          ? "Response interrupted — please try again"
          : "Assistant unavailable — try again",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = reply.trim();
    if (!body || !activeThread || isSending) return;

    const message: Message = {
      id: createLocalId(),
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
    await askAssistant(activeThread.id, [...activeThread.messages, message]);
  }

  async function createThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("message") ?? "").trim();
    const category = String(form.get("category") ?? "General question");
    if (!title || !body) return;

    const id = createLocalId();
    const nextThread: SupportThread = {
      id,
      title,
      category,
      updatedAt: "Just now",
      status: "Open",
      messages: [{ id: createLocalId(), sender: "customer", body, time: currentTime() }],
    };

    setThreads((current) => [nextThread, ...current]);
    setActiveThreadId(id);
    setView("conversation");
    await askAssistant(id, nextThread.messages);
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
              <span><span className="chat-online-dot" aria-hidden="true" /> Support is online</span>
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
              isSending={isSending}
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
          aria-label="Open customer support chat"
          aria-expanded="false"
          aria-controls="support-chat-window"
          onClick={() => openChat()}
        >
          <span className="chat-launcher-icon"><MessageCircle size={21} /></span>
          <span><strong>Need a hand?</strong><small>Chat with us</small></span>
          <span className="chat-online-dot" aria-hidden="true" />
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
  isSending,
}: {
  thread: SupportThread;
  reply: string;
  onReplyChange: (value: string) => void;
  onSend: (event: FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  onClear: () => void;
  onToggleStatus: () => void;
  isSending: boolean;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessage = thread.messages[thread.messages.length - 1];
  const isWaitingForAssistant = isSending && lastMessage?.sender !== "business";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [isSending, thread.messages]);

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
              <div><div className="chat-message-body"><ReactMarkdown>{message.body}</ReactMarkdown></div><small>{message.time}</small></div>
            </div>
          ))
        ) : (
          <div className="chat-empty"><Trash2 size={20} /><strong>Messages cleared</strong><span>Send a message to begin again.</span></div>
        )}
        {isWaitingForAssistant ? (
          <div className="chat-message chat-message--business chat-message--typing" aria-label="Oak and Pine is typing">
            <span>O&amp;P</span><div><div className="chat-message-body chat-message-body--typing"><i /><i /><i /></div></div>
          </div>
        ) : null}
        <div ref={messagesEndRef} aria-hidden="true" />
      </div>
      <form className="chat-reply" onSubmit={onSend}>
        <label className="sr-only" htmlFor="chat-reply-input">Write a message</label>
        <textarea
          id="chat-reply-input"
          rows={2}
          placeholder={thread.status === "Closed" ? "Reply to reopen…" : "Write a message…"}
          value={reply}
          onChange={(event) => onReplyChange(event.target.value)}
          disabled={isSending}
        />
        <button type="submit" disabled={!reply.trim() || isSending} aria-label="Send message"><Send size={17} /></button>
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
        <label><span>Request title</span><input name="title" required defaultValue="Reschedule my booking" placeholder="A short summary" /></label>
        <label><span>Message</span><textarea name="message" required rows={4} defaultValue="I need to reschedule my next appointment." placeholder="Share the details…" /></label>
        <p><Clock3 size={14} /> Typical reply time is under 10 minutes.</p>
        <button type="submit">Create request <Send size={14} /></button>
      </form>
    </div>
  );
}
