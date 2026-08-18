import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { createConversationMessageValidator } from "#validators/support";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

export default class ConversationMessagesController {
  async store({ customer, params, request, response, logger }: HttpContext) {
    const { message } = await request.validateUsing(createConversationMessageValidator);
    const conversation = await SupportConversation.query()
      .where("id", params.id)
      .where("customerId", customer.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    try {
      const pending = await businessSupportAgent.listPendingReschedules(customer, conversation.id);
      if (pending.length) {
        return response.conflict({
          error: "Decide the pending booking change before sending another message.",
        });
      }
      const agentStream = await businessSupportAgent.streamMessage(
        customer,
        conversation.id,
        message
      );
      conversation.updatedAt = DateTime.now();
      await conversation.save();
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
