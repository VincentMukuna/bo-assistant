"use client";

import { useEffect, useRef, useState } from "react";

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
          window.location.reload();
          return;
        }

        setReset(result.reset.status === "ready" ? null : result.reset);
      } catch {
        // Keep the current page usable when the API itself is temporarily unavailable.
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

  return (
    <div className="demo-reset-backdrop">
      <div className="demo-reset-card" role="status" aria-live="polite">
        <div className={`demo-reset-spinner${reset.status === "failed" ? "is-failed" : ""}`} />
        <p className="demo-reset-title">
          {reset.status === "failed" ? "Demo reset needs attention" : "Refreshing the demo"}
        </p>
        <p className="demo-reset-message">{reset.message}</p>
        <div
          className="demo-reset-track"
          role="progressbar"
          aria-label="Demo reset progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={reset.progress}
        >
          <div className="demo-reset-fill" style={{ width: `${reset.progress}%` }} />
        </div>
        <div className="demo-reset-meta">
          <span>Everyone has been signed out</span>
          <span>{reset.progress}%</span>
        </div>
      </div>
    </div>
  );
}
