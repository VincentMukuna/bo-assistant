import SupportConversation from "#models/support_conversation";
import { reportBusinessSupportAgentError } from "#contracts/business_support_agent_failure";
import type InboxAttentionItem from "#models/inbox_attention_item";
import { businessSupportAgent } from "#services/business_support_agent";
import type { HttpContext } from "@adonisjs/core/http";
import { Result } from "better-result";

function presentAttention(item: InboxAttentionItem) {
  return item.readContext().map((context) => ({
    id: item.id,
    cause: item.cause,
    actionType: item.actionType,
    status: item.status,
    summary: item.summary,
    context,
    outcomeSummary: item.outcomeSummary,
    createdAt: item.createdAt.toISO(),
  }));
}

function presentConversation(conversation: SupportConversation) {
  const attention = conversation.attentionItems.find((item) =>
    ["pending", "approved", "failed"].includes(item.status)
  );
  const base = {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.lastMessagePreview,
    status: conversation.status,
    updatedAt: conversation.updatedAt?.toISO() ?? conversation.createdAt.toISO(),
    nextStepOwner: conversation.nextStepOwner,
    handlingMode: conversation.handlingMode,
    outcomeStatus: conversation.outcomeStatus,
    outcomeSummary: conversation.outcomeSummary,
    customer: {
      id: conversation.customer.id,
      name: conversation.customer.name,
      initials: conversation.customer.initials,
      phone: conversation.customer.phone,
      email: conversation.customer.email,
      address: conversation.customer.address,
      notes: conversation.customer.notes,
      createdAt: conversation.customer.createdAt.toISO(),
    },
  };
  return attention
    ? presentAttention(attention).map((presented) => ({ ...base, attention: presented }))
    : Result.ok({ ...base, attention: null });
}

function workspaceConversationQuery() {
  return SupportConversation.query()
    .preload("customer")
    .preload("attentionItems", (query) => query.orderBy("createdAt", "desc"));
}

export default class WorkspaceConversationsController {
  async index({ response, logger }: HttpContext) {
    const conversations = await workspaceConversationQuery()
      .orderByRaw(
        "case when next_step_owner = 'owner' then 0 when outcome_status = 'failed' then 1 else 2 end"
      )
      .orderBy("updatedAt", "desc");
    const presented = Result.all(conversations.map(presentConversation));
    if (presented.status === "error") {
      logger.error({ err: presented.error }, "Unable to decode Inbox attention context");
      return response.internalServerError({
        error: "The Inbox contains an attention item that needs repair.",
      });
    }
    return { conversations: presented.value };
  }

  async show({ params, response, logger }: HttpContext) {
    const conversation = await workspaceConversationQuery()
      .where("id", params.id)
      .preload("annotations", (query) => query.orderBy("createdAt", "asc"))
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    const presented = presentConversation(conversation);
    if (presented.status === "error") {
      logger.error(
        { err: presented.error, conversationId: conversation.id },
        "Unable to decode Inbox attention context"
      );
      return response.internalServerError({
        error: "This conversation contains an attention item that needs repair.",
      });
    }

    const messages = await businessSupportAgent.listMessages(
      conversation.customer,
      conversation.id
    );
    if (messages.status === "error") {
      reportBusinessSupportAgentError(
        messages.error,
        logger,
        { conversationId: conversation.id },
        "Unable to load workspace conversation messages"
      );
      return response.badGateway({ error: "The conversation could not be loaded right now." });
    }
    const bookings = await conversation.customer
      .related("bookings")
      .query()
      .orderBy("scheduledAt", "asc");
    return {
      conversation: {
        ...presented.value,
        messages: messages.value,
        annotations: conversation.annotations.map((annotation) => ({
          id: annotation.id,
          kind: annotation.kind,
          summary: annotation.summary,
          detail: annotation.detail,
          createdAt: annotation.createdAt.toISO(),
        })),
        bookings: bookings.map((booking) => ({
          id: booking.id,
          service: booking.service,
          staff: booking.staff,
          scheduledAt: booking.scheduledAt.toISO(),
          durationMinutes: booking.durationMinutes,
          status: booking.status,
          serviceAddress: booking.serviceAddress,
        })),
      },
    };
  }
}
