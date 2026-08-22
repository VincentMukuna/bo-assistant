"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";

type ResetState = {
  status: "ready" | "resetting" | "failed";
  progress: number;
  message: string;
};

export function DemoResetGuard() {
  const [reset, setReset] = useState<ResetState | null>(null);
  const sawReset = useRef(false);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function check() {
      try {
        const response = await fetch("/api/v1/demo/reset", { cache: "no-store" });
        if (!response.ok) return;

        const result = (await response.json()) as { reset?: ResetState };
        if (!active || !result.reset) return;

        const sessionWasReset = response.headers.get("x-demo-session-reset") === "true";
        if (result.reset.status !== "ready") sawReset.current = true;

        if (result.reset.status === "ready" && (sawReset.current || sessionWasReset)) {
          window.location.replace("/login");
          return;
        }

        setReset(result.reset.status === "ready" ? null : result.reset);
      } catch {
        // A failed status check must not replace the current app with a false reset screen.
      } finally {
        if (active) timeout = setTimeout(check, 750);
      }
    }

    void check();
    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  if (!reset) return null;

  const failed = reset.status === "failed";
  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-zinc-950/35 p-5 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-7 shadow-2xl"
        role="status"
        aria-live="polite"
      >
        <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-zinc-950 text-white">
          {failed ? (
            <RotateCcw className="size-5" aria-hidden="true" />
          ) : (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          )}
        </div>
        <p className="font-semibold tracking-[-0.02em]">
          {failed ? "Demo reset needs attention" : "Refreshing the demo"}
        </p>
        <p className="text-muted-foreground mt-2 text-sm leading-6">{reset.message}</p>
        <div
          className="mt-6 h-2 overflow-hidden rounded-full bg-zinc-100"
          role="progressbar"
          aria-label="Demo reset progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={reset.progress}
        >
          <div
            className="h-full rounded-full bg-zinc-950 transition-[width] duration-500"
            style={{ width: `${reset.progress}%` }}
          />
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between font-mono text-[11px]">
          <span>Everyone has been signed out</span>
          <span>{reset.progress}%</span>
        </div>
      </div>
    </div>
  );
}
