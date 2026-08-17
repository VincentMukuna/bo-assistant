import type { ReactNode } from "react";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getQueryClient } from "@/lib/query-client";
import { profileQueryOptions } from "@/lib/queries";
import { getServerProfile } from "@/lib/server-api";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  const user = await queryClient.fetchQuery({
    ...profileQueryOptions,
    queryFn: getServerProfile,
  });

  if (!user) redirect("/login");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AuthProvider>
        <AppShell>{children}</AppShell>
      </AuthProvider>
    </HydrationBoundary>
  );
}
