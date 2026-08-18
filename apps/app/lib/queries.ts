import { queryOptions } from "@tanstack/react-query";

import { api, ApiError } from "@/lib/api";

export const queryKeys = {
  profile: ["auth", "profile"] as const,
  customers: ["customers"] as const,
  bookings: ["bookings"] as const,
  inbox: ["inbox", "conversations"] as const,
  inboxConversation: (id: string) => ["inbox", "conversations", id] as const,
  agentActivity: ["agent-activity"] as const,
};

export const profileQueryOptions = queryOptions({
  queryKey: queryKeys.profile,
  queryFn: async () => {
    try {
      return await api.profile();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  retry: false,
});

export const customersQueryOptions = queryOptions({
  queryKey: queryKeys.customers,
  queryFn: api.customers.index,
});

export const bookingsQueryOptions = queryOptions({
  queryKey: queryKeys.bookings,
  queryFn: api.bookings.index,
});

export const inboxQueryOptions = queryOptions({
  queryKey: queryKeys.inbox,
  queryFn: api.inbox.index,
});

export const agentActivityQueryOptions = queryOptions({
  queryKey: queryKeys.agentActivity,
  queryFn: api.agentActivity.index,
});

export function inboxConversationQueryOptions(id: string) {
  return queryOptions({
    queryKey: queryKeys.inboxConversation(id),
    queryFn: () => api.inbox.show(id),
    enabled: Boolean(id),
  });
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}
