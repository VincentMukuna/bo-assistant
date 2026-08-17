import createCustomer from "#actions/create-customer";
import deleteCustomer from "#actions/delete-customer";
import updateCustomer from "#actions/update-customer";
import Customer from "#models/customer";
import CustomerDetailsTransformer from "#transformers/customer_details_transformer";
import CustomerTransformer from "#transformers/customer_transformer";
import { createCustomerValidator, updateCustomerValidator } from "#validators/customer";
import type { HttpContext } from "@adonisjs/core/http";

export default class CustomersController {
  async index({ serialize }: HttpContext) {
    const customers = await Customer.query().orderBy("name");
    return serialize(CustomerTransformer.transform(customers));
  }

  async store({ request, response, serialize }: HttpContext) {
    const payload = await request.validateUsing(createCustomerValidator);
    const customer = await createCustomer(payload);
    response.status(201);
    return serialize(CustomerTransformer.transform(customer));
  }

  async show({ params, serialize }: HttpContext) {
    const customer = await Customer.query()
      .where("id", params.id)
      .preload("bookings", (query) => query.orderBy("scheduledAt"))
      .firstOrFail();
    return serialize(CustomerDetailsTransformer.transform(customer));
  }

  async update({ params, request, serialize }: HttpContext) {
    const customer = await Customer.findOrFail(params.id);
    const payload = await request.validateUsing(updateCustomerValidator);
    const updatedCustomer = await updateCustomer(customer, payload);
    return serialize(CustomerTransformer.transform(updatedCustomer));
  }

  async destroy({ params, response }: HttpContext) {
    const customer = await Customer.findOrFail(params.id);
    await deleteCustomer(customer);
    return response.noContent();
  }
}
