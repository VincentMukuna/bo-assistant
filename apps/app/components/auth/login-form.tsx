"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const [email, setEmail] = useState("owner@oakandpine.test");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/customers");
  }, [loading, router, user]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await api.login(email, password);
      await refresh();
      router.replace("/customers");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to sign in right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm">
      <div className="mb-7 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-950 font-semibold text-white">O</div>
        <div>
          <h1 className="font-semibold tracking-[-0.02em]">Oak &amp; Pine</h1>
          <p className="text-sm text-muted-foreground">Sign in to operations</p>
        </div>
      </div>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Email
          <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Password
          <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
        <Button type="submit" className="mt-1 w-full" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
