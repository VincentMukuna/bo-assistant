"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { errorMessage, queryKeys } from "@/lib/queries";

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("kim@oakandpine.test");
  const [password, setPassword] = useState("password123");
  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      api.login(email, password),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
      queryClient.removeQueries({ queryKey: queryKeys.customers });
      queryClient.removeQueries({ queryKey: queryKeys.bookings });
      queryClient.removeQueries({ queryKey: queryKeys.ownerBrief });
      router.replace("/overview");
    },
  });

  useEffect(() => {
    if (!loading && user) router.replace("/overview");
  }, [loading, router, user]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm"
    >
      <div className="mb-7 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-950 font-semibold text-white">
          O
        </div>
        <div>
          <h1 className="font-semibold tracking-[-0.02em]">Oak &amp; Pine</h1>
          <p className="text-muted-foreground text-sm">Sign in to operations</p>
        </div>
      </div>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm font-medium">
          Email
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Password
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {loginMutation.isError ? (
          <p className="text-sm text-red-600" role="alert">
            {errorMessage(loginMutation.error, "Unable to sign in right now.")}
          </p>
        ) : null}
        <Button type="submit" className="mt-1 w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </div>
    </form>
  );
}
