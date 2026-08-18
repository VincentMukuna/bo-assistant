import InboxAnnotation from "#models/inbox_annotation";
import SupportConversation from "#models/support_conversation";
import { inboxEventStream } from "#services/inbox_event_stream";
import { updateConversationOwnershipValidator } from "#validators/inbox";
import type { HttpContext } from "@adonisjs/core/http";

export default class ConversationOwnershipsController {
  async update({ params, request, response }: HttpContext) {
    const { handlingMode } = await request.validateUsing(updateConversationOwnershipValidator);
    const conversation = await SupportConversation.find(params.id);
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    conversation.handlingMode = handlingMode;
    conversation.nextStepOwner = handlingMode === "owner" ? "owner" : "agent";
    await conversation.save();
    await InboxAnnotation.create({
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      kind: "handoff",
      summary: handlingMode === "owner" ? "Owner took over" : "Returned to agent",
      detail:
        handlingMode === "owner"
          ? "Automatic agent replies are paused until control is returned."
          : "The agent can respond to new customer messages again.",
    });
    inboxEventStream.publish(conversation.id);
    return { handlingMode: conversation.handlingMode, nextStepOwner: conversation.nextStepOwner };
  }
}
