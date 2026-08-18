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

  async store({ request, response, serialize, logger }: HttpContext) {
    const payload = await request.validateUsing(createCustomerValidator);
    const created = await createCustomer(payload);
    if (created.status === "error") {
      logger.error({ err: created.error }, "Unable to create customer");
      return response.serviceUnavailable({ error: "The customer could not be created right now." });
    }
    const customer = created.value;
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

  async update({ params, request, response, serialize, logger }: HttpContext) {
    const customer = await Customer.findOrFail(params.id);
    const payload = await request.validateUsing(updateCustomerValidator);
    const updated = await updateCustomer(customer, payload);
    if (updated.status === "error") {
      logger.error({ err: updated.error, customerId: customer.id }, "Unable to update customer");
      return response.serviceUnavailable({ error: "The customer could not be updated right now." });
    }
    return serialize(CustomerTransformer.transform(updated.value));
  }

  async destroy({ params, response, logger }: HttpContext) {
    const customer = await Customer.findOrFail(params.id);
    const deleted = await deleteCustomer(customer);
    if (deleted.status === "error") {
      logger.error({ err: deleted.error, customerId: customer.id }, "Unable to delete customer");
      return response.serviceUnavailable({ error: "The customer could not be deleted right now." });
    }
    return response.noContent();
  }
}
