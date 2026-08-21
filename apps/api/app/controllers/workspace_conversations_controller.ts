import deleteSupportConversation from "#actions/delete-support-conversation";
import SupportConversation from "#models/support_conversation";
import type InboxAttentionItem from "#models/inbox_attention_item";
import { businessSupportAgent } from "#services/business_support_agent";
import { formatOwnerScheduledAt } from "#services/owner_assistant_context";
import type { HttpContext } from "@adonisjs/core/http";

function presentAttention(item: InboxAttentionItem) {
  return {
    id: item.id,
    cause: item.cause,
    actionType: item.actionType,
    status: item.status,
    summary: item.summary,
    context: item.context,
    outcomeSummary: item.outcomeSummary,
    createdAt: item.createdAt.toISO(),
  };
}

function presentConversation(conversation: SupportConversation) {
  const attention = conversation.attentionItems.find((item) =>
    ["pending", "approved", "failed"].includes(item.status)
  );
  const bookingNotifications = conversation.attentionItems.filter(
    (item) =>
      item.actionType === "booking_confirmation" && ["pending", "approved"].includes(item.status)
  );
  return {
    id: conversation.id,
    title: conversation.title,
    preview: conversation.lastMessagePreview,
    status: conversation.status,
    updatedAt: conversation.updatedAt?.toISO() ?? conversation.createdAt.toISO(),
    nextStepOwner: conversation.nextStepOwner,
    handlingMode: conversation.handlingMode,
    outcomeStatus: conversation.outcomeStatus,
    outcomeSummary: conversation.outcomeSummary,
    attention: attention ? presentAttention(attention) : null,
    bookingNotifications: bookingNotifications.map(presentAttention),
    contact: conversation.customerId
      ? {
          kind: "customer" as const,
          id: conversation.customer.id,
          name: conversation.customer.name,
          initials: conversation.customer.initials,
          phone: conversation.customer.phone,
          email: conversation.customer.email,
          address: conversation.customer.address,
          notes: conversation.customer.notes,
          createdAt: conversation.customer.createdAt.toISO(),
        }
      : {
          kind: "visitor" as const,
          id: null,
          name: "Website visitor",
          initials: "WV",
          phone: null,
          email: null,
          address: null,
          notes: null,
          createdAt: conversation.createdAt.toISO(),
        },
  };
}

function workspaceConversationQuery() {
  return SupportConversation.query()
    .preload("customer")
    .preload("attentionItems", (query) => query.orderBy("createdAt", "desc"));
}

export default class WorkspaceConversationsController {
  async index() {
    const conversations = await workspaceConversationQuery()
      .orderByRaw(
        "case when next_step_owner = 'owner' then 0 when outcome_status = 'failed' then 1 else 2 end"
      )
      .orderBy("updatedAt", "desc");
    return { conversations: conversations.map(presentConversation) };
  }

  async show({ params, response, logger }: HttpContext) {
    const conversation = await workspaceConversationQuery()
      .where("id", params.id)
      .preload("annotations", (query) => query.orderBy("createdAt", "asc"))
      .first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    try {
      const [messages, bookings] = await Promise.all([
        businessSupportAgent.listMessages(conversation),
        conversation.customerId
          ? conversation.customer.related("bookings").query().orderBy("scheduledAt", "asc")
          : [],
      ]);
      return {
        conversation: {
          ...presentConversation(conversation),
          messages,
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
            scheduledAtDisplay: formatOwnerScheduledAt(booking.scheduledAt),
            durationMinutes: booking.durationMinutes,
            status: booking.status,
            serviceAddress: booking.serviceAddress,
          })),
        },
      };
    } catch (error) {
      logger.error(
        { err: error, conversationId: conversation.id },
        "Unable to load workspace conversation"
      );
      return response.badGateway({ error: "The conversation could not be loaded right now." });
    }
  }

  async destroy({ params, response, logger }: HttpContext) {
    const conversation = await SupportConversation.query().where("id", params.id).first();
    if (!conversation) return response.notFound({ error: "Conversation not found." });

    try {
      await deleteSupportConversation(conversation);
      return response.noContent();
    } catch (error) {
      logger.error({ err: error, conversationId: params.id }, "Unable to delete conversation");
      return response.badGateway({ error: "The conversation could not be deleted right now." });
    }
  }
}
