import { conversationPreview } from "#actions/send-conversation-message";
import InboxAnnotation from "#models/inbox_annotation";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";
import { createOwnerMessageValidator } from "#validators/inbox";
import type { HttpContext } from "@adonisjs/core/http";
import { DateTime } from "luxon";

export default class OwnerConversationMessagesController {
  async store({ params, request, response, logger }: HttpContext) {
    const { message } = await request.validateUsing(createOwnerMessageValidator);
    const conversation = await SupportConversation.query().where("id", params.id).first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });
    if (conversation.handlingMode !== "owner") {
      return response.conflict({ error: "Take over this conversation before replying." });
    }

    try {
      await businessSupportAgent.appendOwnerMessage(conversation, message);
      conversation.lastMessagePreview = conversationPreview(message);
      conversation.nextStepOwner = "customer";
      conversation.updatedAt = DateTime.now();
      await conversation.save();
      await InboxAnnotation.create({
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        kind: "milestone",
        summary: "Owner replied to the customer",
        detail: "The agent remains paused while the owner has control.",
      });
      inboxEventStream.publish(conversation.id);
      return response.created({ message: "Reply sent." });
    } catch (error) {
      logger.error({ err: error, conversationId: conversation.id }, "Unable to save owner reply");
      return response.badGateway({ error: "The reply could not be sent right now." });
    }
  }
}
