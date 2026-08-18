import sendConversationMessage, {
  ConversationStoreUnavailable,
} from "#actions/send-conversation-message";
import { reportBusinessSupportAgentError } from "#contracts/business_support_agent_failure";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { createConversationMessageValidator } from "#validators/support";
import type { HttpContext } from "@adonisjs/core/http";

export default class ConversationMessagesController {
  async store({ customer, params, request, response, logger }: HttpContext) {
    const { message } = await request.validateUsing(createConversationMessageValidator);
    const conversation = await SupportConversation.query()
      .where("id", params.id)
      .where("customerId", customer.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });
    if (conversation.handlingMode === "owner") {
      return response.conflict({
        error: "The business owner is handling this conversation and will reply shortly.",
      });
    }

    const pending = await businessSupportAgent.listPendingReschedules(customer, conversation.id);
    if (pending.status === "error") {
      reportBusinessSupportAgentError(
        pending.error,
        logger,
        { conversationId: conversation.id },
        "Unable to inspect pending booking changes"
      );
      return response.badGateway({ error: "The assistant is unavailable right now." });
    }
    if (pending.value.length) {
      return response.conflict({
        error: "Decide the pending booking change before sending another message.",
      });
    }

    const agentStream = await sendConversationMessage({
      customer,
      conversation,
      message,
      logger,
    });
    if (agentStream.status === "error") {
      if (ConversationStoreUnavailable.is(agentStream.error)) {
        logger.error(
          { err: agentStream.error, conversationId: conversation.id },
          "Unable to record customer message"
        );
      } else {
        reportBusinessSupportAgentError(
          agentStream.error,
          logger,
          { conversationId: conversation.id },
          "Unable to stream assistant"
        );
      }
      return response.badGateway({ error: "The assistant is unavailable right now." });
    }
    response.header("content-type", agentStream.value.contentType);
    response.header("cache-control", "no-cache, no-transform");
    response.header("x-accel-buffering", "no");
    return response.stream(agentStream.value.body);
  }
}
