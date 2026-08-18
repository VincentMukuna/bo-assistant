import { parsePendingApproval, type PendingApproval } from "./business-support-agent";

export type Message = {
  id: string;
  sender: "customer" | "business";
  body: string;
  time: string;
};

export type SupportThread = {
  id: string;
  title: string;
  category: string;
  updatedAt: string;
  status: "Open" | "Closed";
  messages: Message[];
  pendingApproval?: PendingApproval;
};

type SupportState = {
  activeThreadId: string;
  threads: SupportThread[];
};

const STORAGE_KEY = "oak-and-pine-support:v3";
export const SUPPORT_STATE_VERSION = 3;

function parseMessage(value: unknown): Message | null {
  if (!value || typeof value !== "object") return null;
  const message = value as Record<string, unknown>;
  if (
    typeof message.id !== "string" ||
    (message.sender !== "customer" && message.sender !== "business") ||
    typeof message.body !== "string" ||
    typeof message.time !== "string"
  ) {
    return null;
  }

  return message as Message;
}

function parseThread(value: unknown): SupportThread | null {
  if (!value || typeof value !== "object") return null;
  const thread = value as Record<string, unknown>;
  if (
    typeof thread.id !== "string" ||
    typeof thread.title !== "string" ||
    typeof thread.category !== "string" ||
    typeof thread.updatedAt !== "string" ||
    (thread.status !== "Open" && thread.status !== "Closed") ||
    !Array.isArray(thread.messages)
  ) {
    return null;
  }

  const messages = thread.messages.map(parseMessage);
  if (messages.some((message) => !message)) return null;
  const approval = parsePendingApproval(thread.pendingApproval);

  return {
    id: thread.id,
    title: thread.title,
    category: thread.category,
    updatedAt: thread.updatedAt,
    status: thread.status,
    messages: messages as Message[],
    ...(approval ? { pendingApproval: approval } : {}),
  };
}

export function loadSupportState(): SupportState | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const stored = value as Record<string, unknown>;
    if (
      stored.version !== SUPPORT_STATE_VERSION ||
      typeof stored.activeThreadId !== "string" ||
      !Array.isArray(stored.threads)
    ) {
      return null;
    }

    const threads = stored.threads.map(parseThread);
    if (
      !threads.length ||
      threads.some((thread) => !thread) ||
      !threads.some((thread) => thread?.id === stored.activeThreadId)
    ) {
      return null;
    }

    return {
      activeThreadId: stored.activeThreadId,
      threads: threads as SupportThread[],
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveSupportState(state: SupportState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SUPPORT_STATE_VERSION, ...state }));
}

export function clearSupportState() {
  localStorage.removeItem(STORAGE_KEY);
}
