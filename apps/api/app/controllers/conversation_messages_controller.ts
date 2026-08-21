import sendConversationMessage from "#actions/send-conversation-message";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { createConversationMessageValidator } from "#validators/support";
import type { HttpContext } from "@adonisjs/core/http";

export default class ConversationMessagesController {
  async store({ customer, visitorId, params, request, response, logger }: HttpContext) {
    const { message } = await request.validateUsing(createConversationMessageValidator);
    const conversation = await SupportConversation.forIdentity({ customer, visitorId })
      .where("id", params.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });
    if (conversation.handlingMode === "owner") {
      return response.conflict({
        error: "The business owner is handling this conversation and will reply shortly.",
      });
    }

    try {
      const pending = await businessSupportAgent.listPendingReschedules(conversation);
      if (pending.length) {
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
      response.header("content-type", agentStream.contentType);
      response.header("cache-control", "no-cache, no-transform");
      response.header("x-accel-buffering", "no");
      return response.stream(agentStream.body);
    } catch (error) {
      logger.error({ err: error, conversationId: conversation.id }, "Unable to stream assistant");
      return response.badGateway({ error: "The assistant is unavailable right now." });
    }
  }
}
