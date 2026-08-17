import type Customer from "#models/customer";
import type { UpdateCustomerPayload } from "#validators/customer";

export default async function updateCustomer(customer: Customer, input: UpdateCustomerPayload) {
  customer.merge(input);
  await customer.save();
  return customer;
}
