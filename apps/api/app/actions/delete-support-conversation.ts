import type SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";

export default async function deleteSupportConversation(conversation: SupportConversation) {
  await businessSupportAgent.deleteThread(conversation.id, conversation.memoryResourceId);
  await conversation.delete();
  inboxEventStream.publish(conversation.id);
}
