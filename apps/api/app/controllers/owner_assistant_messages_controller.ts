import { answerFromOwnerBrief, buildOwnerBrief } from "#services/owner_brief";
import { ownerOperationsAgent } from "#services/owner_operations_agent";
import { createOwnerAssistantMessageValidator } from "#validators/owner_assistant";
import type { HttpContext } from "@adonisjs/core/http";

export default class OwnerAssistantMessagesController {
  async store({ auth, request, logger }: HttpContext) {
    const { message } = await request.validateUsing(createOwnerAssistantMessageValidator);
    const brief = await buildOwnerBrief();
    const deterministicAnswer = answerFromOwnerBrief(message, brief);

    if (deterministicAnswer) {
      return {
        answer: deterministicAnswer,
        mode: "brief" as const,
        generatedAt: brief.generatedAt,
      };
    }

    try {
      const answer = await ownerOperationsAgent.answer(
        message,
        auth.user?.fullName ?? "Owner",
        brief
      );
      return { answer, mode: "agent" as const, generatedAt: brief.generatedAt };
    } catch (error) {
      logger.warn(
        { err: error },
        "Owner operations agent unavailable; returning grounded fallback"
      );
      return {
        answer:
          "I don’t have enough information to answer that yet. Ask me about **today’s bookings**, **what is waiting on you**, **what changed since yesterday**, or **what needs follow-up**. Pricing, payments, margins, and staff availability are not tracked here yet.",
        mode: "fallback" as const,
        generatedAt: brief.generatedAt,
      };
    }
  }
}
