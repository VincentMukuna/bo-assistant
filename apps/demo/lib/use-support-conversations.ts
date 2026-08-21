"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  bootstrapCustomerSession,
  createConversation,
  decideApproval,
  listConversations,
  readApprovalRequest,
  readBusinessSupportStream,
  readConversation,
  requestEmailVerification,
  sendConversationMessage,
  verifyEmail,
  type ApprovalRequest,
  type ConversationSummary,
  type SupportConversation,
} from "./business-support-agent";

export type DecisionState = "idle" | "confirming" | "declining";

export const supportQueryKeys = {
  all: ["support"] as const,
  session: () => [...supportQueryKeys.all, "session"] as const,
  conversations: () => [...supportQueryKeys.all, "conversations"] as const,
  conversation: (id: string) => [...supportQueryKeys.all, "conversation", id] as const,
  approval: (id: string) => [...supportQueryKeys.all, "approval", id] as const,
};

type PendingExchange = {
  conversationId: string;
  customerMessage: string;
  assistantText: string;
};

type MessageMutation = {
  conversationId: string;
  message: string;
};

type DecisionMutation = {
  conversationId: string;
  decision: "approve" | "decline";
};

export function useSupportConversations() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingExchange, setPendingExchange] = useState<PendingExchange | null>(null);
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    name?: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const noticeTimeoutRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    },
    []
  );

  const sessionQuery = useQuery({
    queryKey: supportQueryKeys.session(),
    queryFn: bootstrapCustomerSession,
    staleTime: Infinity,
  });
  const conversationsQuery = useQuery({
    queryKey: supportQueryKeys.conversations(),
    queryFn: listOrCreateConversations,
    enabled: sessionQuery.isSuccess,
  });
  const threads = conversationsQuery.data ?? [];
  const activeId = selectedId ?? threads[0]?.id;
  const conversationQuery = useQuery({
    queryKey: supportQueryKeys.conversation(activeId ?? "none"),
    queryFn: () => readConversation(activeId!),
    enabled: Boolean(activeId),
  });
  const approvalQuery = useQuery({
    queryKey: supportQueryKeys.approval(activeId ?? "none"),
    queryFn: () => readApprovalRequest(activeId!),
    enabled: Boolean(activeId),
    refetchInterval: (query) => (query.state.data?.status === "awaiting_owner" ? 2_500 : false),
  });

  function announce(message: string) {
    setNotice(message);
    if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = window.setTimeout(() => setNotice(""), 2400);
  }

  async function consume(response: Response, conversationId: string) {
    let assistantText = "";
    await readBusinessSupportStream(response, (delta) => {
      assistantText += delta;
      setPendingExchange((current) =>
        current?.conversationId === conversationId ? { ...current, assistantText } : current
      );
    });
  }

  async function reconcile(conversationId: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: supportQueryKeys.conversations() }),
      queryClient.invalidateQueries({ queryKey: supportQueryKeys.conversation(conversationId) }),
      queryClient.invalidateQueries({ queryKey: supportQueryKeys.approval(conversationId) }),
    ]);
  }

  const messageMutation = useMutation({
    mutationFn: async (variables: MessageMutation) => {
      const response = await sendConversationMessage(variables.conversationId, variables.message);
      await consume(response, variables.conversationId);
    },
    onMutate: (variables) => {
      setPendingExchange({
        conversationId: variables.conversationId,
        customerMessage: variables.message,
        assistantText: "",
      });
    },
    onSuccess: () => announce("Oak & Pine replied"),
    onSettled: async (_result, _error, variables) => {
      await reconcile(variables.conversationId).catch(() => undefined);
      setPendingExchange((current) =>
        current?.conversationId === variables.conversationId ? null : current
      );
    },
  });

  const decisionMutation = useMutation({
    mutationFn: async (variables: DecisionMutation) => {
      const response = await decideApproval(variables.conversationId, variables.decision);
      await consume(response, variables.conversationId);
    },
    onMutate: (variables) => {
      setPendingExchange({
        conversationId: variables.conversationId,
        customerMessage: "",
        assistantText: "",
      });
    },
    onSuccess: (_result, variables) => {
      announce(
        variables.decision === "approve" ? "Booking change confirmed" : "Booking change declined"
      );
    },
    onSettled: async (_result, _error, variables) => {
      await reconcile(variables.conversationId).catch(() => undefined);
      setPendingExchange((current) =>
        current?.conversationId === variables.conversationId ? null : current
      );
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: createConversation,
    onSuccess: (created) => {
      queryClient.setQueryData<ConversationSummary[]>(
        supportQueryKeys.conversations(),
        (current = []) => [created, ...current.filter((item) => item.id !== created.id)]
      );
      queryClient.setQueryData<SupportConversation>(supportQueryKeys.conversation(created.id), {
        ...created,
        messages: [],
      });
      queryClient.setQueryData<ApprovalRequest | null>(supportQueryKeys.approval(created.id), null);
      setSelectedId(created.id);
    },
  });

  const requestVerificationMutation = useMutation({
    mutationFn: ({ email, name }: { email: string; name?: string }) =>
      requestEmailVerification(email, name),
    onSuccess: (result, variables) => {
      if (result.customer) {
        setPendingVerification(null);
        queryClient.setQueryData(supportQueryKeys.session(), result);
        announce("Email verified");
        return;
      }
      setPendingVerification(variables);
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) => verifyEmail(email, code),
    onSuccess: async (result) => {
      queryClient.setQueryData(supportQueryKeys.session(), result);
      setPendingVerification(null);
      setSelectedId(null);
      await queryClient.invalidateQueries({ queryKey: supportQueryKeys.conversations() });
      announce("Email verified");
    },
  });

  const conversation = conversationQuery.data ?? null;
  const approval = approvalQuery.data ?? null;
  const activeExchange = pendingExchange?.conversationId === activeId ? pendingExchange : null;
  const messages = useMemo(() => {
    const persisted = conversation?.messages ?? [];
    return [
      ...persisted,
      ...(activeExchange?.customerMessage
        ? [
            {
              id: "optimistic-customer",
              sender: "customer" as const,
              body: activeExchange.customerMessage,
            },
          ]
        : []),
      ...(activeExchange?.assistantText
        ? [
            {
              id: "streaming-assistant",
              sender: "business" as const,
              body: activeExchange.assistantText,
            },
          ]
        : []),
    ];
  }, [activeExchange, conversation?.messages]);

  const isSending =
    messageMutation.isPending || decisionMutation.isPending || createConversationMutation.isPending;
  const decisionState: DecisionState = decisionMutation.isPending
    ? decisionMutation.variables.decision === "approve"
      ? "confirming"
      : "declining"
    : "idle";
  const error = firstErrorMessage(
    sessionQuery.error,
    conversationsQuery.error,
    conversationQuery.error,
    approvalQuery.error,
    createConversationMutation.error,
    messageMutation.error,
    decisionMutation.error,
    requestVerificationMutation.error,
    verifyEmailMutation.error
  );

  function resetMutationErrors() {
    createConversationMutation.reset();
    messageMutation.reset();
    decisionMutation.reset();
    requestVerificationMutation.reset();
    verifyEmailMutation.reset();
  }

  function selectConversation(id: string) {
    resetMutationErrors();
    setSelectedId(id);
  }

  function sendReply(message: string) {
    if (!activeId || isSending || approval) return;
    resetMutationErrors();
    messageMutation.mutate({
      conversationId: activeId,
      message,
    });
  }

  function submitDecision(decision: "approve" | "decline") {
    if (
      !activeId ||
      !approval ||
      isSending ||
      approval.status === "awaiting_owner" ||
      (decision === "approve" && approval.status !== "awaiting_customer")
    )
      return;
    resetMutationErrors();
    decisionMutation.mutate({ conversationId: activeId, decision });
  }

  async function createRequest(message: string) {
    if (isSending) return;
    resetMutationErrors();
    try {
      const created = await createConversationMutation.mutateAsync();
      await messageMutation.mutateAsync({
        conversationId: created.id,
        message,
      });
    } catch {
      // Mutation state carries the error to the UI.
    }
  }

  async function requestVerification(email: string, name?: string) {
    requestVerificationMutation.reset();
    verifyEmailMutation.reset();
    setPendingVerification(null);
    await requestVerificationMutation.mutateAsync({ email, name });
  }

  async function resendVerification() {
    if (!pendingVerification) return;
    requestVerificationMutation.reset();
    verifyEmailMutation.reset();
    await requestVerificationMutation.mutateAsync(pendingVerification);
    announce("New code sent");
  }

  async function verifyEmailCode(code: string) {
    if (!pendingVerification) return;
    verifyEmailMutation.reset();
    await verifyEmailMutation.mutateAsync({ email: pendingVerification.email, code });
  }

  function changeVerificationEmail() {
    resetMutationErrors();
    setPendingVerification(null);
  }

  return {
    session: sessionQuery.data?.customer ?? null,
    threads,
    conversation,
    approval,
    activeId,
    messages,
    notice,
    error,
    isSending,
    decisionState,
    isRequestingVerification: requestVerificationMutation.isPending,
    isVerifyingEmail: verifyEmailMutation.isPending,
    verificationSentTo: pendingVerification?.email ?? "",
    selectConversation,
    sendReply,
    submitDecision,
    createRequest,
    requestVerification,
    resendVerification,
    verifyEmailCode,
    changeVerificationEmail,
  };
}

async function listOrCreateConversations() {
  const conversations = await listConversations();
  if (conversations.length) return conversations;
  return [await createConversation()];
}

function firstErrorMessage(...causes: unknown[]) {
  const cause = causes.find(Boolean);
  if (!cause) return "";
  return cause instanceof Error ? cause.message : "Support is unavailable.";
}
