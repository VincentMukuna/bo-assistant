"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, type User } from "@/lib/api";
import { profileQueryOptions, queryKeys } from "@/lib/queries";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
  logout: () => void;
  loggingOut: boolean;
  logoutError: Error | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profileQuery = useQuery(profileQueryOptions);
  const {
    mutate: mutateLogout,
    isPending: loggingOut,
    error: logoutError,
  } = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.profile, null);
      queryClient.removeQueries({ queryKey: queryKeys.customers });
      queryClient.removeQueries({ queryKey: queryKeys.bookings });
      queryClient.removeQueries({ queryKey: queryKeys.ownerBrief });
      router.replace("/login");
    },
  });

  const refresh = useCallback(async () => {
    return queryClient.fetchQuery({ ...profileQueryOptions, staleTime: 0 });
  }, [queryClient]);
  const logout = useCallback(() => mutateLogout(), [mutateLogout]);

  const value = useMemo(
    () => ({
      user: profileQuery.data ?? null,
      loading: profileQuery.isPending,
      refresh,
      logout,
      loggingOut,
      logoutError,
    }),
    [profileQuery.data, profileQuery.isPending, refresh, logout, loggingOut, logoutError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
