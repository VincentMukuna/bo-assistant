import Customer from '#models/customer'

export type CreateCustomerInput = {
  name: string
  email: string
  phone: string
  address: string
  notes: string
}

export default function createCustomer(input: CreateCustomerInput) {
  return Customer.create(input)
}
