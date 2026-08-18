import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import type Customer from "#models/customer";

export default async function createSupportConversation(customer: Customer) {
  const id = crypto.randomUUID();
  const title = "Business support";
  await businessSupportAgent.createThread(customer, id, title);

  try {
    return await SupportConversation.create({
      id,
      customerId: customer.id,
      title,
      status: "open",
    });
  } catch (error) {
    await businessSupportAgent.deleteThread(customer, id).catch(() => undefined);
    throw error;
  }
}
