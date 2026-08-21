import { buildOwnerAssistantPageContext } from "#services/owner_assistant_context";
import type { HttpContext } from "@adonisjs/core/http";

export default class AgentOperationsConversationsController {
  async show({ params, response, ownerOperationsCapability }: HttpContext) {
    const conversationId = String(params.id);
    if (!ownerOperationsCapability.conversationIds.includes(conversationId)) {
      return response.forbidden({ error: "That conversation is outside this operations context." });
    }

    const context = await buildOwnerAssistantPageContext("inbox", undefined, conversationId);
    if (!("conversation" in context) || !context.conversation) {
      return response.notFound({ error: "Conversation not found." });
    }

    return { conversation: context.conversation };
  }
}
