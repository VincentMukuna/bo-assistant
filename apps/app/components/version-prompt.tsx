"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "development";

export function VersionPrompt() {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    async function check() {
      const response = await fetch("/version", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;

      const result = (await response.json()) as { version?: unknown };
      if (typeof result.version === "string" && result.version !== currentVersion) {
        setIsAvailable(true);
      }
    }

    void check();
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!isAvailable) return null;

  return (
    <div
      className="bg-foreground text-background fixed bottom-5 left-1/2 z-[100] flex min-h-11 max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full py-1.5 pr-1.5 pl-4 text-xs whitespace-nowrap shadow-xl"
      role="status"
    >
      <span>A new version is ready.</span>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="rounded-full"
        onClick={() => window.location.reload()}
      >
        <RefreshCw /> Reload
      </Button>
    </div>
  );
}
