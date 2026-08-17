import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Sign in · Oak & Pine" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-zinc-50 p-5">
      <LoginForm />
    </main>
  );
}
