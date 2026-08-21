import { createTuyau, TuyauError } from "@tuyau/core/client";
import type { Data } from "api/data";
import { registry } from "api/registry";

type Routes = typeof registry.routes;
type RouteBody<Name extends keyof Routes> = Routes[Name]["types"]["body"];

export type User = Data.User;
export type Customer = Data.Customer;
export type CustomerDetails = Data.CustomerDetails;
export type Booking = Data.Booking;
export type BookingSummary = Data.BookingSummary;

export type CustomerInput = RouteBody<"customers.store">;
export type BookingInput = RouteBody<"bookings.store">;
export type BookingStatus = BookingInput["status"];

export type InboxAttention = {
  id: string;
  cause: "authority" | "judgment" | "relationship" | "failure";
  actionType: string;
  status: "pending" | "approved" | "declined" | "completed" | "failed";
  summary: string;
  context: Record<string, unknown>;
  outcomeSummary: string | null;
  createdAt: string;
};

export type InboxContact = {
  kind: "customer" | "visitor";
  id: number | null;
  name: string;
  initials: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
};

export type InboxConversationSummary = {
  id: string;
  title: string;
  preview: string | null;
  status: string;
  updatedAt: string;
  nextStepOwner: "agent" | "owner" | "customer" | "none";
  handlingMode: "agent" | "owner";
  outcomeStatus: "active" | "completed" | "failed";
  outcomeSummary: string | null;
  attention: InboxAttention | null;
  bookingNotifications: InboxAttention[];
  contact: InboxContact;
};

export type InboxConversation = InboxConversationSummary & {
  messages: Array<{
    id: string;
    sender: "customer" | "business";
    body: string;
    createdAt: string | null;
    author: "agent" | "owner" | null;
  }>;
  annotations: Array<{
    id: string;
    kind: string;
    summary: string;
    detail: string | null;
    createdAt: string;
  }>;
  bookings: Array<{
    id: number;
    service: string;
    staff: string;
    scheduledAt: string;
    durationMinutes: number;
    status: BookingStatus;
    serviceAddress: string;
  }>;
};

export type AgentActivityCategory = "attention" | "decision" | "handoff" | "completed" | "activity";
export type AgentActivityFilter = "all" | AgentActivityCategory;

export type AgentActivity = {
  id: string;
  category: AgentActivityCategory;
  kind: string;
  summary: string;
  detail: string | null;
  createdAt: string;
  conversation: {
    id: string;
    title: string;
    nextStepOwner: InboxConversationSummary["nextStepOwner"];
    outcomeStatus: InboxConversationSummary["outcomeStatus"];
  };
  contact: Pick<InboxContact, "kind" | "id" | "name" | "initials">;
};

export type AgentActivityFeed = {
  metrics: {
    needsOwner: number;
    agentHandling: number;
    completedToday: number;
    failures: number;
  };
  activities: AgentActivity[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

type CreateApiOptions = {
  baseUrl?: string;
  cache?: RequestCache;
  headers?: HeadersInit;
};

function responseMessage(details: unknown) {
  if (typeof details !== "object" || details === null) return undefined;

  const body = details as Record<string, unknown>;
  if (typeof body.message === "string") return body.message;
  if (typeof body.error === "string") return body.error;

  const firstError = Array.isArray(body.errors) ? body.errors[0] : undefined;
  if (typeof firstError !== "object" || firstError === null) return undefined;

  const message = (firstError as Record<string, unknown>).message;
  return typeof message === "string" ? message : undefined;
}

async function execute<T>(request: PromiseLike<T>): Promise<T> {
  try {
    return await request;
  } catch (error) {
    if (error instanceof TuyauError && error.status !== undefined) {
      throw new ApiError(
        error.status,
        responseMessage(error.response) ?? `Request failed with status ${error.status}`,
        error.response
      );
    }
    throw error;
  }
}

function data<T>(response: { data: T }) {
  return response.data;
}

async function jsonRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "accept": "application/json", "content-type": "application/json", ...init.headers },
  });
  const body = (await response.json().catch(() => null)) as T | Record<string, unknown> | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      responseMessage(body) ?? `Request failed with status ${response.status}`,
      body
    );
  }
  return body as T;
}

export function createApi({ baseUrl = "/", cache, headers }: CreateApiOptions = {}) {
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");

  const client = createTuyau({
    registry,
    baseUrl,
    cache,
    credentials: "include",
    headers: requestHeaders,
  });

  return {
    async login(email: string, password: string) {
      return data(await execute(client.api.auth.sessions.store({ body: { email, password } })));
    },
    async profile() {
      return data(await execute(client.api.profile.show({})));
    },
    async logout() {
      await execute(client.api.sessions.destroy({}));
    },
    customers: {
      async index() {
        return data(await execute(client.api.customers.index({})));
      },
      async show(id: number) {
        return data(await execute(client.api.customers.show({ params: { id } })));
      },
      async store(input: CustomerInput) {
        return data(await execute(client.api.customers.store({ body: input })));
      },
      async update(id: number, input: Partial<CustomerInput>) {
        return data(await execute(client.api.customers.update({ params: { id }, body: input })));
      },
      async destroy(id: number) {
        await execute(client.api.customers.destroy({ params: { id } }));
      },
    },
    bookings: {
      async index() {
        return data(await execute(client.api.bookings.index({})));
      },
      async store(input: BookingInput) {
        return data(await execute(client.api.bookings.store({ body: input })));
      },
      async update(id: number, input: Partial<BookingInput>) {
        return data(await execute(client.api.bookings.update({ params: { id }, body: input })));
      },
      async destroy(id: number) {
        await execute(client.api.bookings.destroy({ params: { id } }));
      },
    },
    inbox: {
      async index() {
        const result = await jsonRequest<{ conversations: InboxConversationSummary[] }>(
          "/api/v1/inbox/conversations"
        );
        return result.conversations;
      },
      async show(id: string) {
        const result = await jsonRequest<{ conversation: InboxConversation }>(
          `/api/v1/inbox/conversations/${encodeURIComponent(id)}`
        );
        return result.conversation;
      },
      async destroy(id: string) {
        const response = await fetch(`/api/v1/inbox/conversations/${encodeURIComponent(id)}`, {
          method: "DELETE",
          credentials: "include",
          headers: { accept: "application/json" },
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
          throw new ApiError(
            response.status,
            responseMessage(body) ?? `Request failed with status ${response.status}`,
            body
          );
        }
      },
      async setHandlingMode(id: string, handlingMode: "agent" | "owner") {
        return jsonRequest<{ handlingMode: "agent" | "owner"; nextStepOwner: string }>(
          `/api/v1/inbox/conversations/${encodeURIComponent(id)}/ownership`,
          { method: "PUT", body: JSON.stringify({ handlingMode }) }
        );
      },
      async sendMessage(id: string, message: string) {
        return jsonRequest<{ message: string }>(
          `/api/v1/inbox/conversations/${encodeURIComponent(id)}/messages`,
          { method: "POST", body: JSON.stringify({ message }) }
        );
      },
      async decideAttention(
        conversationId: string,
        attentionId: string,
        decision: "approve" | "decline"
      ) {
        return jsonRequest<{ attention: { id: string; status: string; outcomeSummary: string } }>(
          `/api/v1/inbox/conversations/${encodeURIComponent(conversationId)}/attention/${encodeURIComponent(attentionId)}/decisions`,
          { method: "POST", body: JSON.stringify({ decision }) }
        );
      },
    },
    agentActivity: {
      async index() {
        return jsonRequest<AgentActivityFeed>("/api/v1/agent-activities");
      },
    },
  };
}

export const api = createApi();
