import { createTuyau, TuyauError } from "@tuyau/core/client";
import { Result, TaggedError, type Result as ResultType } from "better-result";
import type { Data } from "api/data";
import { registry } from "api/registry";
import { z } from "zod";

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

export type InboxCustomer = {
  id: number;
  name: string;
  initials: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
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
  customer: InboxCustomer;
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
  customer: Pick<InboxCustomer, "id" | "name" | "initials">;
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

const inboxAttentionSchema = z.object({
  id: z.string(),
  cause: z.enum(["authority", "judgment", "relationship", "failure"]),
  actionType: z.string(),
  status: z.enum(["pending", "approved", "declined", "completed", "failed"]),
  summary: z.string(),
  context: z.record(z.string(), z.unknown()),
  outcomeSummary: z.string().nullable(),
  createdAt: z.string(),
});
const inboxCustomerSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  initials: z.string(),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  notes: z.string(),
  createdAt: z.string(),
});
const inboxConversationSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  preview: z.string().nullable(),
  status: z.string(),
  updatedAt: z.string(),
  nextStepOwner: z.enum(["agent", "owner", "customer", "none"]),
  handlingMode: z.enum(["agent", "owner"]),
  outcomeStatus: z.enum(["active", "completed", "failed"]),
  outcomeSummary: z.string().nullable(),
  attention: inboxAttentionSchema.nullable(),
  customer: inboxCustomerSchema,
});
const inboxConversationSchema = inboxConversationSummarySchema.extend({
  messages: z.array(
    z.object({
      id: z.string(),
      sender: z.enum(["customer", "business"]),
      body: z.string(),
      createdAt: z.string().nullable(),
      author: z.enum(["agent", "owner"]).nullable(),
    })
  ),
  annotations: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      summary: z.string(),
      detail: z.string().nullable(),
      createdAt: z.string(),
    })
  ),
  bookings: z.array(
    z.object({
      id: z.number().int().positive(),
      service: z.string(),
      staff: z.string(),
      scheduledAt: z.string(),
      durationMinutes: z.number().int().positive(),
      status: z.enum(["confirmed", "needs_approval", "in_progress", "completed"]),
      serviceAddress: z.string(),
    })
  ),
});
const agentActivityCategorySchema = z.enum([
  "attention",
  "decision",
  "handoff",
  "completed",
  "activity",
]);
const agentActivityFeedSchema = z.object({
  metrics: z.object({
    needsOwner: z.number(),
    agentHandling: z.number(),
    completedToday: z.number(),
    failures: z.number(),
  }),
  activities: z.array(
    z.object({
      id: z.string(),
      category: agentActivityCategorySchema,
      kind: z.string(),
      summary: z.string(),
      detail: z.string().nullable(),
      createdAt: z.string(),
      conversation: z.object({
        id: z.string(),
        title: z.string(),
        nextStepOwner: z.enum(["agent", "owner", "customer", "none"]),
        outcomeStatus: z.enum(["active", "completed", "failed"]),
      }),
      customer: z.object({
        id: z.number().int().positive(),
        name: z.string(),
        initials: z.string(),
      }),
    })
  ),
});

export class ApiUnavailable extends TaggedError("ApiUnavailable")<{
  operation: string;
  cause: unknown;
  retryable: true;
  message: string;
}> {}

export class ApiRejected extends TaggedError("ApiRejected")<{
  operation: string;
  status: number;
  code: string;
  retryable: boolean;
  details?: unknown;
  message: string;
}> {}

export class InvalidApiResponse extends TaggedError("InvalidApiResponse")<{
  operation: string;
  status?: number;
  cause: unknown;
  retryable: boolean;
  message: string;
}> {}

export type ApiError = ApiUnavailable | ApiRejected | InvalidApiResponse;

export function isApiError(error: unknown): error is ApiError {
  return ApiUnavailable.is(error) || ApiRejected.is(error) || InvalidApiResponse.is(error);
}

export function isUnauthorizedApiError(error: unknown) {
  return ApiRejected.is(error) && error.status === 401;
}

export function isRetryableApiError(error: unknown) {
  return isApiError(error) && error.retryable;
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
  if (typeof body.error === "object" && body.error !== null) {
    const message = (body.error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }

  const firstError = Array.isArray(body.errors) ? body.errors[0] : undefined;
  if (typeof firstError !== "object" || firstError === null) return undefined;

  const message = (firstError as Record<string, unknown>).message;
  return typeof message === "string" ? message : undefined;
}

function responseCode(details: unknown) {
  if (typeof details !== "object" || details === null) return "API_REQUEST_REJECTED";
  const error = (details as Record<string, unknown>).error;
  if (typeof error !== "object" || error === null) return "API_REQUEST_REJECTED";
  const code = (error as Record<string, unknown>).code;
  return typeof code === "string" ? code : "API_REQUEST_REJECTED";
}

function responseRetryable(details: unknown, status: number) {
  if (typeof details === "object" && details !== null) {
    const error = (details as Record<string, unknown>).error;
    if (typeof error === "object" && error !== null) {
      const retryable = (error as Record<string, unknown>).retryable;
      if (typeof retryable === "boolean") return retryable;
    }
  }
  return status >= 500;
}

async function execute<T>(
  request: PromiseLike<T>,
  operation: string
): Promise<ResultType<T, ApiError>> {
  try {
    return Result.ok(await request);
  } catch (error) {
    if (error instanceof TuyauError && error.status !== undefined) {
      return Result.err(
        new ApiRejected({
          operation,
          status: error.status,
          code: responseCode(error.response),
          retryable: responseRetryable(error.response, error.status),
          details: error.response,
          message: responseMessage(error.response) ?? `Request failed with status ${error.status}`,
        })
      );
    }
    return Result.err(
      new ApiUnavailable({
        operation,
        cause: error,
        retryable: true,
        message: "The API could not be reached. Check your connection and try again.",
      })
    );
  }
}

function data<T>(response: { data: T }) {
  return response.data;
}

function leaveApiResult<T>(result: ResultType<T, ApiError>): T {
  if (result.status === "ok") return result.value;
  // TanStack Query and mutation state use rejected promises as their framework error boundary.
  throw result.error;
}

async function jsonRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: RequestInit = {}
): Promise<ResultType<T, ApiError>> {
  const response = await Result.tryPromise({
    try: () =>
      fetch(path, {
        ...init,
        credentials: "include",
        headers: {
          "accept": "application/json",
          "content-type": "application/json",
          ...init.headers,
        },
      }),
    catch: (cause) =>
      new ApiUnavailable({
        operation: path,
        cause,
        retryable: true,
        message: "The API could not be reached. Check your connection and try again.",
      }),
  });
  if (response.status === "error") return Result.err(response.error);

  const body = await Result.tryPromise({
    try: () => response.value.json(),
    catch: (cause) =>
      new InvalidApiResponse({
        operation: path,
        status: response.value.status,
        cause,
        retryable: response.value.status >= 500,
        message: `The API returned an unreadable response for ${path}.`,
      }),
  });
  if (body.status === "error") return Result.err(body.error);
  if (!response.value.ok) {
    return Result.err(
      new ApiRejected({
        operation: path,
        status: response.value.status,
        code: responseCode(body.value),
        retryable: responseRetryable(body.value, response.value.status),
        details: body.value,
        message:
          responseMessage(body.value) ?? `Request failed with status ${response.value.status}`,
      })
    );
  }
  const parsed = schema.safeParse(body.value);
  return parsed.success
    ? Result.ok(parsed.data)
    : Result.err(
        new InvalidApiResponse({
          operation: path,
          status: response.value.status,
          cause: parsed.error,
          retryable: false,
          message: `The API response for ${path} did not match its expected contract.`,
        })
      );
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
      return leaveApiResult(
        (await execute(client.api.auth.sessions.store({ body: { email, password } }), "login")).map(
          data
        )
      );
    },
    async profile() {
      return leaveApiResult((await execute(client.api.profile.show({}), "profile.show")).map(data));
    },
    async logout() {
      leaveApiResult(await execute(client.api.sessions.destroy({}), "sessions.destroy"));
    },
    customers: {
      async index() {
        return leaveApiResult(
          (await execute(client.api.customers.index({}), "customers.index")).map(data)
        );
      },
      async show(id: number) {
        return leaveApiResult(
          (await execute(client.api.customers.show({ params: { id } }), "customers.show")).map(data)
        );
      },
      async store(input: CustomerInput) {
        return leaveApiResult(
          (await execute(client.api.customers.store({ body: input }), "customers.store")).map(data)
        );
      },
      async update(id: number, input: Partial<CustomerInput>) {
        return leaveApiResult(
          (
            await execute(
              client.api.customers.update({ params: { id }, body: input }),
              "customers.update"
            )
          ).map(data)
        );
      },
      async destroy(id: number) {
        leaveApiResult(
          await execute(client.api.customers.destroy({ params: { id } }), "customers.destroy")
        );
      },
    },
    bookings: {
      async index() {
        return leaveApiResult(
          (await execute(client.api.bookings.index({}), "bookings.index")).map(data)
        );
      },
      async store(input: BookingInput) {
        return leaveApiResult(
          (await execute(client.api.bookings.store({ body: input }), "bookings.store")).map(data)
        );
      },
      async update(id: number, input: Partial<BookingInput>) {
        return leaveApiResult(
          (
            await execute(
              client.api.bookings.update({ params: { id }, body: input }),
              "bookings.update"
            )
          ).map(data)
        );
      },
      async destroy(id: number) {
        leaveApiResult(
          await execute(client.api.bookings.destroy({ params: { id } }), "bookings.destroy")
        );
      },
    },
    inbox: {
      async index() {
        const result = leaveApiResult(
          await jsonRequest<{ conversations: InboxConversationSummary[] }>(
            "/api/v1/inbox/conversations",
            z.object({ conversations: z.array(inboxConversationSummarySchema) })
          )
        );
        return result.conversations;
      },
      async show(id: string) {
        const result = leaveApiResult(
          await jsonRequest<{ conversation: InboxConversation }>(
            `/api/v1/inbox/conversations/${encodeURIComponent(id)}`,
            z.object({ conversation: inboxConversationSchema })
          )
        );
        return result.conversation;
      },
      async setHandlingMode(id: string, handlingMode: "agent" | "owner") {
        return leaveApiResult(
          await jsonRequest<{ handlingMode: "agent" | "owner"; nextStepOwner: string }>(
            `/api/v1/inbox/conversations/${encodeURIComponent(id)}/ownership`,
            z.object({
              handlingMode: z.enum(["agent", "owner"]),
              nextStepOwner: z.string(),
            }),
            { method: "PUT", body: JSON.stringify({ handlingMode }) }
          )
        );
      },
      async sendMessage(id: string, message: string) {
        return leaveApiResult(
          await jsonRequest<{ message: string }>(
            `/api/v1/inbox/conversations/${encodeURIComponent(id)}/messages`,
            z.object({ message: z.string() }),
            { method: "POST", body: JSON.stringify({ message }) }
          )
        );
      },
      async decideAttention(
        conversationId: string,
        attentionId: string,
        decision: "approve" | "decline"
      ) {
        return leaveApiResult(
          await jsonRequest<{ attention: { id: string; status: string; outcomeSummary: string } }>(
            `/api/v1/inbox/conversations/${encodeURIComponent(conversationId)}/attention/${encodeURIComponent(attentionId)}/decisions`,
            z.object({
              attention: z.object({
                id: z.string(),
                status: z.string(),
                outcomeSummary: z.string(),
              }),
            }),
            { method: "POST", body: JSON.stringify({ decision }) }
          )
        );
      },
    },
    agentActivity: {
      async index() {
        return leaveApiResult(
          await jsonRequest<AgentActivityFeed>("/api/v1/agent-activities", agentActivityFeedSchema)
        );
      },
    },
  };
}

export const api = createApi();
