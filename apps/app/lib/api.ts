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

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

const client = createTuyau({
  registry,
  baseUrl: "/",
  credentials: "include",
  headers: {
    Accept: "application/json",
  },
});

function responseMessage(details: unknown) {
  if (typeof details !== "object" || details === null) return undefined;

  const body = details as Record<string, unknown>;
  if (typeof body.message === "string") return body.message;

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

export const api = {
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
      return data(
        await execute(client.api.customers.update({ params: { id }, body: input }))
      );
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
};
