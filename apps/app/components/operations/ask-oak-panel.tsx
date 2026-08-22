"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, ChevronRight, Mic, Send, X } from "lucide-react";

import { OwnerAssistantMarkdown } from "@/components/overview/owner-assistant-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, type OwnerAssistantSurface } from "@/lib/api";
import { errorMessage } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Message = { id: string; role: "user" | "assistant"; body: string };

type AskOakConfig = {
  surface: Exclude<OwnerAssistantSurface, "overview">;
  customerId?: number;
  conversationId?: string;
  contextLabel: string;
  suggestions: string[];
};

type AskOakContextValue = {
  activeKey: string | null;
  close: () => void;
  open: (config: AskOakConfig) => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type NativeSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => NativeSpeechRecognition;

const AskOakContext = createContext<AskOakContextValue | null>(null);
let messageSequence = 0;

function messageId(role: Message["role"]) {
  messageSequence += 1;
  return `${role}-${Date.now()}-${messageSequence}`;
}

function configKey(config: AskOakConfig) {
  return `${config.surface}:${config.customerId ?? config.conversationId ?? "all"}`;
}

function nativeSpeechRecognition() {
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function AskOakWorkspace({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AskOakConfig>();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string>();
  const recognitionRef = useRef<NativeSpeechRecognition | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const speechSupported = typeof window !== "undefined" && Boolean(nativeSpeechRecognition());

  useEffect(() => {
    return () => recognitionRef.current?.abort();
  }, []);

  const askMutation = useMutation({
    mutationFn: ({ message, context }: { message: string; context: AskOakConfig }) =>
      api.ownerBrief.ask(message, {
        surface: context.surface,
        customerId: context.customerId,
        conversationId: context.conversationId,
      }),
    onSuccess: (result, { message }) => {
      setMessages((current) => [
        ...current,
        { id: messageId("user"), role: "user", body: message },
        { id: messageId("assistant"), role: "assistant", body: result.answer },
      ]);
    },
  });

  function open(nextConfig: AskOakConfig) {
    if (!config || configKey(config) !== configKey(nextConfig)) {
      recognitionRef.current?.abort();
      setQuestion("");
      setMessages([]);
      setListening(false);
      setSpeechError(undefined);
      askMutation.reset();
    }
    setConfig(nextConfig);
  }

  function close() {
    recognitionRef.current?.abort();
    setListening(false);
    setConfig(undefined);
  }

  function ask(value: string) {
    const message = value.trim();
    if (!message || !config || askMutation.isPending) return;
    setQuestion("");
    askMutation.mutate({ message, context: config });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  function toggleVoiceInput() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = nativeSpeechRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) {
        setQuestion((current) => [current.trim(), transcript].filter(Boolean).join(" "));
        inputRef.current?.focus();
      }
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") {
        setSpeechError(
          event.error === "not-allowed"
            ? "Microphone access was not allowed."
            : "Voice input could not hear that. Try again."
        );
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    setSpeechError(undefined);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const contextValue: AskOakContextValue = {
    activeKey: config ? configKey(config) : null,
    close,
    open,
  };

  return (
    <AskOakContext.Provider value={contextValue}>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1">{children}</main>
        {config ? (
          <div
            id="ask-oak-panel"
            className="fixed inset-y-[52px] right-0 z-40 w-full max-w-[420px] lg:static lg:inset-auto lg:z-auto lg:w-[400px] lg:max-w-none lg:shrink-0"
          >
            <aside
              className="bg-card flex h-full min-h-0 flex-col border-l border-zinc-200/70 shadow-[-12px_0_32px_-24px_rgba(0,0,0,0.35)]"
              aria-label={`Ask Oak about ${config.contextLabel}`}
            >
              <header className="flex shrink-0 items-start gap-3 border-b border-zinc-100 px-5 py-4">
                <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Bot className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-zinc-950">Ask Oak</h2>
                  <p className="mt-0.5 text-xs leading-5 text-zinc-500">
                    {config.surface === "bookings"
                      ? "Ask about bookings while you keep working."
                      : config.surface === "inbox"
                        ? "Ask about this conversation while you keep working."
                        : `Ask about ${config.contextLabel} while you keep working.`}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={close} aria-label="Close Ask Oak">
                  <X />
                </Button>
              </header>

              <div
                className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto px-5 py-5"
                aria-live="polite"
              >
                {messages.length ? (
                  <div className="space-y-5">
                    {messages.map((message) =>
                      message.role === "user" ? (
                        <div
                          key={message.id}
                          className="ml-8 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700"
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
                  <div>
                    <p className="mb-3 text-xs font-medium text-zinc-500">Try asking</p>
                    <div className="space-y-2">
                      {config.suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => ask(suggestion)}
                          disabled={askMutation.isPending}
                          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                        >
                          {suggestion}
                          <ChevronRight className="size-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {askMutation.isPending ? (
                  <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="bg-primary size-2 animate-pulse rounded-full" />
                    Asking Oak…
                  </div>
                ) : null}
                {askMutation.isError ? (
                  <p className="mt-5 text-sm text-red-700" role="alert">
                    {errorMessage(askMutation.error, "Ask Oak is unavailable right now.")}
                  </p>
                ) : null}
              </div>

              <form onSubmit={submit} className="shrink-0 border-t border-zinc-100 p-4">
                {speechError ? (
                  <p className="mb-2 text-xs text-red-700" role="alert">
                    {speechError}
                  </p>
                ) : null}
                <div className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm">
                  <Input
                    ref={inputRef}
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder={`Ask about ${config.contextLabel}`}
                    aria-label={`Ask Oak about ${config.contextLabel}`}
                    className="h-9 min-w-0 border-0 shadow-none focus-visible:ring-0"
                  />
                  {speechSupported ? (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      type="button"
                      onClick={toggleVoiceInput}
                      aria-label={listening ? "Stop voice input" : "Use voice input"}
                      aria-pressed={listening}
                      className={cn(listening && "bg-red-50 text-red-700 hover:bg-red-100")}
                    >
                      <Mic className={cn(listening && "animate-pulse")} />
                    </Button>
                  ) : null}
                  <Button
                    size="icon-sm"
                    type="submit"
                    disabled={!question.trim() || askMutation.isPending}
                    aria-label="Send question"
                  >
                    <Send />
                  </Button>
                </div>
                {listening ? (
                  <p className="mt-2 text-center text-xs text-zinc-500">Listening…</p>
                ) : null}
              </form>
            </aside>
          </div>
        ) : null}
      </div>
    </AskOakContext.Provider>
  );
}

export function AskOakPanel(config: AskOakConfig) {
  const context = useContext(AskOakContext);
  if (!context) throw new Error("AskOakPanel must be rendered inside AskOakWorkspace");

  const key = configKey(config);
  const open = context.activeKey === key;

  return (
    <Button
      variant="outline"
      className="bg-white"
      onClick={() => (open ? context.close() : context.open(config))}
      aria-expanded={open}
      aria-controls="ask-oak-panel"
    >
      <Bot /> {open ? "Close Ask Oak" : "Ask Oak"}
    </Button>
  );
}

export function useAskOakWorkspaceState() {
  const context = useContext(AskOakContext);
  if (!context) throw new Error("useAskOakWorkspaceState must be used inside AskOakWorkspace");
  return {
    closePanel: context.close,
    panelOpen: context.activeKey !== null,
  };
}
