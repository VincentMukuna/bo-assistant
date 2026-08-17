export type User = {
  id: number;
  fullName: string | null;
  email: string;
  initials: string;
  createdAt: string;
  updatedAt: string | null;
};

export type Customer = {
  id: number;
  name: string;
  initials: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string | null;
};

export type BookingStatus =
  | "confirmed"
  | "needs_approval"
  | "in_progress"
  | "completed";

export type Booking = {
  id: number;
  customerId: number;
  customer: Customer;
  service: string;
  staff: string;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  serviceAddress: string;
  createdAt: string;
  updatedAt: string | null;
};

export type CustomerInput = Pick<
  Customer,
  "name" | "email" | "phone" | "address" | "notes"
>;

export type BookingInput = Pick<
  Booking,
  | "customerId"
  | "service"
  | "staff"
  | "scheduledAt"
  | "durationMinutes"
  | "status"
  | "serviceAddress"
>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body?.message ??
      body?.errors?.[0]?.message ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, body);
  }

  return (body?.data ?? body) as T;
}

export const api = {
  login(email: string, password: string) {
    return request<User>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  profile() {
    return request<User>("/profile");
  },
  logout() {
    return request<void>("/session", { method: "DELETE" });
  },
  customers: {
    index: () => request<Customer[]>("/customers"),
    show: (id: number) => request<Customer & { bookings: Booking[] }>(`/customers/${id}`),
    store: (input: CustomerInput) =>
      request<Customer>("/customers", { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, input: Partial<CustomerInput>) =>
      request<Customer>(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    destroy: (id: number) => request<void>(`/customers/${id}`, { method: "DELETE" }),
  },
  bookings: {
    index: () => request<Booking[]>("/bookings"),
    store: (input: BookingInput) =>
      request<Booking>("/bookings", { method: "POST", body: JSON.stringify(input) }),
    update: (id: number, input: Partial<BookingInput>) =>
      request<Booking>(`/bookings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    destroy: (id: number) => request<void>(`/bookings/${id}`, { method: "DELETE" }),
  },
};
