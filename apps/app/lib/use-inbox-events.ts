"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queries";

export function useInboxEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource("/api/v1/inbox/events");
    const reconcile = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox });
      queryClient.invalidateQueries({ queryKey: queryKeys.agentActivity });
      queryClient.invalidateQueries({ queryKey: queryKeys.ownerBrief });
    };
    const handleChange = (event: MessageEvent<string>) => {
      reconcile();
      try {
        const payload = JSON.parse(event.data) as { conversationId?: unknown };
        if (typeof payload.conversationId === "string") {
          queryClient.invalidateQueries({
            queryKey: queryKeys.inboxConversation(payload.conversationId),
          });
        }
      } catch {
        // A malformed event is harmless because reconnect/open performs a full reconciliation.
      }
    };
    source.addEventListener("open", reconcile);
    source.addEventListener("inbox.changed", handleChange as EventListener);
    return () => source.close();
  }, [queryClient]);
}
