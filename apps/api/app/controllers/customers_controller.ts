import createCustomer from "#actions/create-customer";
import deleteCustomer from "#actions/delete-customer";
import updateCustomer from "#actions/update-customer";
import Customer from "#models/customer";
import { createCustomerValidator, updateCustomerValidator } from "#validators/customer";
import type { HttpContext } from "@adonisjs/core/http";

export default class CustomersController {
  async index() {
    return Customer.query().orderBy("name");
  }

  async store({ request, response }: HttpContext) {
    const payload = await request.validateUsing(createCustomerValidator);
    const customer = await createCustomer(payload);
    return response.status(201).send(customer);
  }

  async show({ params }: HttpContext) {
    return Customer.query()
      .where("id", params.id)
      .preload("bookings", (query) => query.orderBy("scheduledAt"))
      .firstOrFail();
  }

  async update({ params, request }: HttpContext) {
    const customer = await Customer.findOrFail(params.id);
    const payload = await request.validateUsing(updateCustomerValidator);
    return updateCustomer(customer, payload);
  }

  async destroy({ params, response }: HttpContext) {
    const customer = await Customer.findOrFail(params.id);
    await deleteCustomer(customer);
    return response.noContent();
  }
}
