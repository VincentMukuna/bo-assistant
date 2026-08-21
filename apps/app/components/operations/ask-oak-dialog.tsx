"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, ChevronRight, Send } from "lucide-react";

import { OwnerAssistantMarkdown } from "@/components/overview/owner-assistant-markdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api, type OwnerAssistantSurface } from "@/lib/api";
import { errorMessage } from "@/lib/queries";

type Message = { id: string; role: "user" | "assistant"; body: string };

export function AskOakDialog({
  surface,
  customerId,
  contextLabel,
  suggestions,
}: {
  surface: Exclude<OwnerAssistantSurface, "overview">;
  customerId?: number;
  contextLabel: string;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const askMutation = useMutation({
    mutationFn: (message: string) => api.ownerBrief.ask(message, { surface, customerId }),
    onSuccess: (result, askedQuestion) => {
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: "user", body: askedQuestion },
        { id: `assistant-${Date.now()}`, role: "assistant", body: result.answer },
      ]);
    },
  });

  function ask(value: string) {
    const message = value.trim();
    if (!message || askMutation.isPending) return;
    setQuestion("");
    askMutation.mutate(message);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-white">
          <Bot /> Ask Oak
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b border-zinc-100 px-5 py-5 sm:px-6">
          <DialogTitle>Ask Oak about {contextLabel}</DialogTitle>
          <DialogDescription>
            {surface === "bookings"
              ? "Oak can read your bookings but cannot change them."
              : `Oak can read ${contextLabel}’s details but cannot change them.`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55dvh] min-h-[280px] overflow-y-auto px-5 py-5 sm:px-6">
          {messages.length ? (
            <div className="space-y-5">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div
                    key={message.id}
                    className="ml-10 rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700"
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
              {suggestions.map((suggestion) => (
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
          )}
          {askMutation.isPending ? (
            <div className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
              <span className="size-2 animate-pulse rounded-full bg-emerald-700" />
              Asking Oak…
            </div>
          ) : null}
          {askMutation.isError ? (
            <p className="mt-5 text-sm text-red-700" role="alert">
              {errorMessage(askMutation.error, "Ask Oak is unavailable right now.")}
            </p>
          ) : null}
        </div>

        <form onSubmit={submit} className="border-t border-zinc-100 p-4 sm:px-6">
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder={`Ask about ${contextLabel}`}
              aria-label={`Ask Oak about ${contextLabel}`}
              className="h-9 border-0 shadow-none focus-visible:ring-0"
            />
            <Button
              size="icon-sm"
              type="submit"
              disabled={!question.trim() || askMutation.isPending}
              aria-label="Send question"
            >
              <Send />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
