import { buildOwnerAssistantPageContext } from "#services/owner_assistant_context";
import { buildOwnerBrief } from "#services/owner_brief";
import { ownerOperationsAgent } from "#services/owner_operations_agent";
import { createOwnerAssistantMessageValidator } from "#validators/owner_assistant";
import type { HttpContext } from "@adonisjs/core/http";

export default class OwnerAssistantMessagesController {
  async store({ auth, request, response, logger }: HttpContext) {
    const {
      message,
      surface = "overview",
      customerId,
      conversationId,
    } = await request.validateUsing(createOwnerAssistantMessageValidator);
    const brief = await buildOwnerBrief();
    const pageContext = await buildOwnerAssistantPageContext(surface, customerId, conversationId);

    try {
      const answer = await ownerOperationsAgent.answer(
        message,
        auth.user?.fullName ?? "Workspace user",
        brief,
        pageContext
      );
      return { answer, mode: "agent" as const, generatedAt: brief.generatedAt };
    } catch (error) {
      logger.warn({ err: error }, "Ask Oak model request failed");
      return response.serviceUnavailable({
        error: "Ask Oak is unavailable right now. Please try again in a moment.",
      });
    }
  }
}
