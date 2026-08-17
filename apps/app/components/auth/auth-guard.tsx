"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-zinc-50 text-sm text-zinc-500">
        Loading workspace…
      </div>
    );
  }

  return children;
}
