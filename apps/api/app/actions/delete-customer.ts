import type Customer from "#models/customer";

export default async function deleteCustomer(customer: Customer) {
  await customer.delete();
}
