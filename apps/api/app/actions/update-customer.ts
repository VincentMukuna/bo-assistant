import type Customer from "#models/customer";
import type { CreateCustomerInput } from "#actions/create-customer";

export default async function updateCustomer(
  customer: Customer,
  input: Partial<CreateCustomerInput>
) {
  customer.merge(input);
  await customer.save();
  return customer;
}
