import Customer from "#models/customer";
import type { CreateCustomerPayload } from "#validators/customer";

export default function createCustomer(input: CreateCustomerPayload) {
  return Customer.create(input);
}
