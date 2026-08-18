import type Customer from "#models/customer";
import { CustomerStoreUnavailable } from "#actions/customer_failures";
import { Result } from "better-result";

export default async function deleteCustomer(customer: Customer) {
  return Result.tryPromise({
    try: () => customer.delete(),
    catch: (cause) =>
      new CustomerStoreUnavailable({
        operation: "delete",
        customerId: customer.id,
        cause,
        message: `Unable to delete customer ${customer.id}.`,
      }),
  });
}
