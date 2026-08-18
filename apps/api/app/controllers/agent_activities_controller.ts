import InboxAnnotation from "#models/inbox_annotation";
import SupportConversation from "#models/support_conversation";
import { DateTime } from "luxon";

function categoryFor(kind: string, summary: string) {
  if (kind === "attention" || kind === "failure") return "attention" as const;
  if (kind === "decision") return "decision" as const;
  if (kind === "handoff" || summary.startsWith("Owner ") || summary === "Returned to agent") {
    return "handoff" as const;
  }
  if (kind === "outcome" || kind === "milestone") return "completed" as const;
  return "activity" as const;
}

export default class AgentActivitiesController {
  async index() {
    const today = DateTime.now().startOf("day").toSQL();
    const [annotations, needsOwner, agentHandling, completedToday, failures] = await Promise.all([
      InboxAnnotation.query()
        .preload("conversation", (query) => query.preload("customer"))
        .orderBy("createdAt", "desc")
        .limit(100),
      SupportConversation.query().where("nextStepOwner", "owner").count("* as total"),
      SupportConversation.query()
        .where("handlingMode", "agent")
        .where("nextStepOwner", "agent")
        .where("outcomeStatus", "active")
        .count("* as total"),
      InboxAnnotation.query()
        .whereIn("kind", ["milestone", "outcome"])
        .where("createdAt", ">=", today)
        .count("* as total"),
      SupportConversation.query().where("outcomeStatus", "failed").count("* as total"),
    ]);

    return {
      metrics: {
        needsOwner: Number(needsOwner[0].$extras.total),
        agentHandling: Number(agentHandling[0].$extras.total),
        completedToday: Number(completedToday[0].$extras.total),
        failures: Number(failures[0].$extras.total),
      },
      activities: annotations.map((annotation) => ({
        id: annotation.id,
        category: categoryFor(annotation.kind, annotation.summary),
        kind: annotation.kind,
        summary: annotation.summary,
        detail: annotation.detail,
        createdAt: annotation.createdAt.toISO(),
        conversation: {
          id: annotation.conversation.id,
          title: annotation.conversation.title,
          nextStepOwner: annotation.conversation.nextStepOwner,
          outcomeStatus: annotation.conversation.outcomeStatus,
        },
        customer: {
          id: annotation.conversation.customer.id,
          name: annotation.conversation.customer.name,
          initials: annotation.conversation.customer.initials,
        },
      })),
    };
  }
}
