import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import type { SupportIdentity } from "#contracts/support_identity";

export default async function createSupportConversation(identity: SupportIdentity) {
  const id = crypto.randomUUID();
  const title = "New conversation";
  const memoryResourceId = `conversation:${id}`;
  await businessSupportAgent.createThread(id, memoryResourceId, title);

  try {
    return await SupportConversation.create({
      id,
      customerId: identity.customer?.id ?? null,
      visitorId: identity.customer ? null : identity.visitorId,
      memoryResourceId,
      title,
      status: "open",
    });
  } catch (error) {
    await businessSupportAgent.deleteThread(id, memoryResourceId).catch(() => undefined);
    throw error;
  }
}
