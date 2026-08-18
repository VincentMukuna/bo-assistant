import createSupportConversation, {
  CreateSupportConversationFailed,
} from "#actions/create-support-conversation";
import { reportBusinessSupportAgentError } from "#contracts/business_support_agent_failure";
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
    const created = await createSupportConversation(customer);
    if (created.status === "error") {
      if (CreateSupportConversationFailed.is(created.error)) {
        logger.error(
          { err: created.error, customerId: customer.id },
          "Unable to create support conversation"
        );
      } else {
        reportBusinessSupportAgentError(
          created.error,
          logger,
          { customerId: customer.id },
          "Unable to create Mastra conversation thread"
        );
      }
      return response.badGateway({ error: "A support conversation could not be created." });
    }
    const conversation = created.value;

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

    const messages = await businessSupportAgent.listMessages(customer, conversation.id);
    if (messages.status === "error") {
      reportBusinessSupportAgentError(
        messages.error,
        logger,
        { conversationId: conversation.id },
        "Unable to load conversation"
      );
      return response.badGateway({ error: "The conversation could not be loaded right now." });
    }
    return {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        lastMessagePreview: conversation.lastMessagePreview,
        status: conversation.status,
        updatedAt: conversation.updatedAt?.toISO() ?? conversation.createdAt.toISO(),
        messages: messages.value,
      },
    };
  }
}
