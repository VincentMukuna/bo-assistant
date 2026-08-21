import Booking from "#models/booking";
import Customer from "#models/customer";
import SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { DateTime } from "luxon";

const BUSINESS_TIME_ZONE = "America/Los_Angeles";

const nextStepLabels = {
  owner: "Needs your response",
  agent: "Oak is handling it",
  customer: "Waiting for the customer",
  none: "No action needed",
} as const;

const handlingLabels = {
  owner: "You are handling this conversation",
  agent: "Oak is handling this conversation",
} as const;

const outcomeLabels = {
  active: "In progress",
  completed: "Completed",
  failed: "Needs follow-up",
} as const;

const attentionReasonLabels = {
  authority: "Needs your approval",
  judgment: "Needs your judgment",
  relationship: "Needs a personal response",
  failure: "Needs recovery",
} as const;

const attentionStatusLabels = {
  pending: "Waiting for you",
  approved: "Approved",
  declined: "Declined",
  completed: "Completed",
  failed: "Needs follow-up",
} as const;

function directOperationalText(value: string | null) {
  if (!value) return value;

  return value
    .replace(/owner attention needed/gi, "Needs your attention")
    .replace(/business approval needed/gi, "Your approval is needed")
    .replace(/owner confirmation/gi, "your confirmation")
    .replace(/owner decision/gi, "your decision")
    .replace(/owner input/gi, "your input")
    .replace(/owner action/gi, "action from you")
    .replace(/business approval/gi, "your approval")
    .replace(/business decision/gi, "your decision")
    .replace(
      /sent it to the business for final confirmation/gi,
      "prepared it for your confirmation"
    )
    .replace(/sent to the business for final confirmation/gi, "prepared for your confirmation")
    .replace(/routed to the business/gi, "ready for your review")
    .replace(/the business owner/gi, "you")
    .replace(/the owner/gi, "you");
}

export function formatOwnerScheduledAt(value: Booking["scheduledAt"]) {
  return value.setZone(BUSINESS_TIME_ZONE).toFormat("ccc, LLL d 'at' h:mm a ZZZZ");
}

function displayAttentionContext(context: Record<string, unknown>, actionType: string) {
  return Object.fromEntries(
    Object.entries(context).flatMap(([key, value]) => {
      if (/(?:id$|run|tool|capability|token|external)/i.test(key)) return [];
      if (
        actionType === "booking_confirmation" &&
        ["service", "staff", "scheduledAt", "durationMinutes"].includes(key)
      ) {
        return [];
      }
      if (typeof value !== "string" || !/(?:at|date|time)$/i.test(key)) return [[key, value]];
      const isoDate = DateTime.fromISO(value);
      const date = isoDate.isValid ? isoDate : DateTime.fromSQL(value, { zone: "utc" });
      if (!date.isValid) return [[key, value]];
      return [
        [`${key}Display`, date.setZone(BUSINESS_TIME_ZONE).toFormat("ccc, LLL d 'at' h:mm a ZZZZ")],
      ];
    })
  );
}

function contextNumber(context: Record<string, unknown>, key: string) {
  const value = context[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export type OwnerAssistantSurface = "overview" | "bookings" | "customer" | "inbox";

export async function buildOwnerAssistantPageContext(
  surface: OwnerAssistantSurface,
  customerId?: number,
  conversationId?: string
) {
  if (surface === "bookings") {
    const bookings = await Booking.query()
      .preload("customer")
      .orderBy("scheduledAt", "desc")
      .limit(50);

    return {
      surface,
      bookings: bookings.map((booking) => ({
        id: booking.id,
        customer: booking.customer.name,
        service: booking.service,
        staff: booking.staff,
        scheduledAtDisplay: formatOwnerScheduledAt(booking.scheduledAt),
        durationMinutes: booking.durationMinutes,
        status: booking.status,
        serviceAddress: booking.serviceAddress,
        href: `/bookings?view=agenda&booking=${booking.id}`,
      })),
    };
  }

  if (surface === "customer" && customerId) {
    const customer = await Customer.query()
      .where("id", customerId)
      .preload("bookings", (query) => query.orderBy("scheduledAt", "desc").limit(30))
      .preload("supportConversations", (query) => query.orderBy("updatedAt", "desc").limit(10))
      .first();

    if (!customer) return { surface, customer: null };

    return {
      surface,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
        bookings: customer.bookings.map((booking) => ({
          id: booking.id,
          service: booking.service,
          staff: booking.staff,
          scheduledAtDisplay: formatOwnerScheduledAt(booking.scheduledAt),
          durationMinutes: booking.durationMinutes,
          status: booking.status,
          serviceAddress: booking.serviceAddress,
          href: `/bookings?view=agenda&booking=${booking.id}`,
        })),
        recentConversations: customer.supportConversations.map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          preview: conversation.lastMessagePreview,
          status: conversation.status,
          nextStep: conversation.nextStepOwner,
          outcome: conversation.outcomeStatus,
          outcomeSummary: conversation.outcomeSummary,
          updatedAt: (conversation.updatedAt ?? conversation.createdAt).toISO(),
          href: `/inbox?conversation=${conversation.id}`,
        })),
      },
    };
  }

  if (surface === "inbox" && conversationId) {
    const conversation = await SupportConversation.query()
      .where("id", conversationId)
      .preload("customer")
      .preload("attentionItems", (query) => query.orderBy("createdAt", "desc"))
      .preload("annotations", (query) => query.orderBy("createdAt", "asc"))
      .first();

    if (!conversation) return { surface, conversation: null };

    const messages = await businessSupportAgent.listMessages(conversation);
    return {
      surface,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        contact: conversation.customer?.name ?? "Website visitor",
        status: conversation.status,
        nextStep: nextStepLabels[conversation.nextStepOwner],
        handling: handlingLabels[conversation.handlingMode],
        outcome: outcomeLabels[conversation.outcomeStatus],
        outcomeSummary: directOperationalText(conversation.outcomeSummary),
        attentionItems: conversation.attentionItems.map((attention) => {
          const bookingId = contextNumber(attention.context, "bookingId");
          return {
            reason: attentionReasonLabels[attention.cause],
            status: attentionStatusLabels[attention.status],
            summary: directOperationalText(attention.summary),
            context: displayAttentionContext(attention.context, attention.actionType),
            outcomeSummary: directOperationalText(attention.outcomeSummary),
            link:
              bookingId === null
                ? {
                    label: "Open conversation",
                    href: `/inbox?conversation=${conversation.id}`,
                  }
                : {
                    label: "Open booking",
                    href: `/bookings?view=agenda&booking=${bookingId}`,
                  },
          };
        }),
        annotations: conversation.annotations.map((annotation) => ({
          kind: annotation.kind,
          summary: directOperationalText(annotation.summary),
          detail: directOperationalText(annotation.detail),
          createdAt: annotation.createdAt.toISO(),
        })),
        messages: messages.map((message) => ({
          sender: message.sender,
          author: message.author,
          body: message.sender === "business" ? directOperationalText(message.body) : message.body,
          createdAt: message.createdAt,
        })),
        href: `/inbox?conversation=${conversation.id}`,
      },
    };
  }

  return { surface: "overview" as const };
}
