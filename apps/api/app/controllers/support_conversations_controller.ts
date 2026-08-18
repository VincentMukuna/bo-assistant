import createSupportConversation from "#actions/create-support-conversation";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import type { HttpContext } from "@adonisjs/core/http";

export default class SupportConversationsController {
  async index({ customer }: HttpContext) {
    const conversations = await SupportConversation.query()
      .where("customerId", customer.id)
      .orderBy("updatedAt", "desc");

    return {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        lastMessagePreview: conversation.lastMessagePreview,
        status: conversation.status,
        updatedAt: conversation.updatedAt?.toISO() ?? conversation.createdAt.toISO(),
      })),
    };
  }

  async store({ customer, response, logger }: HttpContext) {
    let conversation: SupportConversation;
    try {
      conversation = await createSupportConversation(customer);
    } catch (error) {
      logger.error(
        { err: error, customerId: customer.id },
        "Unable to create support conversation"
      );
      return response.badGateway({ error: "A support conversation could not be created." });
    }

    return response.created({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        lastMessagePreview: conversation.lastMessagePreview,
        status: conversation.status,
        updatedAt: conversation.createdAt.toISO(),
      },
    });
  }

  async show({ customer, params, response, logger }: HttpContext) {
    const conversation = await SupportConversation.query()
      .where("id", params.id)
      .where("customerId", customer.id)
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    try {
      const messages = await businessSupportAgent.listMessages(customer, conversation.id);
      return {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          lastMessagePreview: conversation.lastMessagePreview,
          status: conversation.status,
          updatedAt: conversation.updatedAt?.toISO() ?? conversation.createdAt.toISO(),
          messages,
        },
      };
    } catch (error) {
      logger.error({ err: error, conversationId: conversation.id }, "Unable to load conversation");
      return response.badGateway({ error: "The conversation could not be loaded right now." });
    }
  }
}
