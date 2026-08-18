import type Customer from "#models/customer";
import type { UpdateCustomerPayload } from "#validators/customer";
import { CustomerStoreUnavailable } from "#actions/customer_failures";
import { Result } from "better-result";

export default async function updateCustomer(customer: Customer, input: UpdateCustomerPayload) {
  customer.merge(input);
  return Result.tryPromise({
    try: async () => {
      await customer.save();
      return customer;
    },
    catch: (cause) =>
      new CustomerStoreUnavailable({
        operation: "update",
        customerId: customer.id,
        cause,
        message: `Unable to update customer ${customer.id}.`,
      }),
  });
}
