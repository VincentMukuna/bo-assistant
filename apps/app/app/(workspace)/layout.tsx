import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
