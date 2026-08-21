import type Customer from "#models/customer";

export type SupportIdentity = {
  customer: Customer | null;
  visitorId: string;
};
