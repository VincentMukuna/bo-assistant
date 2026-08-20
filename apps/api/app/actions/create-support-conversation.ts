import SupportConversation from "#models/support_conversation";
import {
  businessSupportAgent,
  type BusinessSupportAgentError,
} from "#services/business_support_agent";
import type Customer from "#models/customer";
import { Result, TaggedError, type Result as ResultType } from "better-result";

export class CreateSupportConversationFailed extends TaggedError(
  "CreateSupportConversationFailed"
)<{
  conversationId: string;
  cause: unknown;
  cleanupFailure?: BusinessSupportAgentError;
  message: string;
}> {}

export default async function createSupportConversation(
  customer: Customer
): Promise<
  ResultType<SupportConversation, BusinessSupportAgentError | CreateSupportConversationFailed>
> {
  const id = crypto.randomUUID();
  const title = "New conversation";
  const thread = await businessSupportAgent.createThread(customer, id, title);
  if (thread.status === "error") return Result.err(thread.error);

  const conversation = await Result.tryPromise({
    try: () =>
      SupportConversation.create({
        id,
        customerId: customer.id,
        title,
        status: "open",
      }),
    catch: (cause) => cause,
  });
  if (conversation.status === "ok") return Result.ok(conversation.value);

  const cleanup = await businessSupportAgent.deleteThread(customer, id);
  return Result.err(
    new CreateSupportConversationFailed({
      conversationId: id,
      cause: conversation.error,
      ...(cleanup.status === "error" ? { cleanupFailure: cleanup.error } : {}),
      message:
        cleanup.status === "error"
          ? `Unable to persist support conversation ${id}, and its Mastra thread cleanup also failed.`
          : `Unable to persist support conversation ${id}; its Mastra thread was removed.`,
    })
  );
}
