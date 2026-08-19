import Customer from "#models/customer";
import type { CreateCustomerPayload } from "#validators/customer";
import { CustomerStoreUnavailable } from "#actions/customer_failures";
import { Result } from "better-result";

export default function createCustomer(input: CreateCustomerPayload) {
  return Result.tryPromise({
    try: () => Customer.create(input),
    catch: (cause) =>
      new CustomerStoreUnavailable({
        operation: "create",
        cause,
        message: "Unable to create the customer record.",
      }),
  });
}
