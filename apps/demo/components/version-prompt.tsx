"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

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
    const interval = window.setInterval(check, 45_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!isAvailable) return null;
  return (
    <div className="site-update" role="status">
      <span>A new version is ready.</span>
      <button type="button" onClick={() => window.location.reload()}>
        <RefreshCw size={14} /> Reload
      </button>
    </div>
  );
}
