import Booking from "#models/booking";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import SupportConversation from "#models/support_conversation";
import { DateTime } from "luxon";

export const OWNER_TIMEZONE = "America/Los_Angeles";

export type OwnerBriefPriority = "urgent" | "important" | "watch";

export type OwnerBriefLink = {
  label: string;
  href: string;
};

export type OwnerBriefAttentionItem = {
  id: string;
  kind: "conversation" | "booking";
  priority: OwnerBriefPriority;
  eyebrow: string;
  title: string;
  detail: string;
  customerName: string;
  createdAt: string;
  link: OwnerBriefLink;
};

export type OwnerBriefScheduleItem = {
  id: number;
  time: string;
  scheduledAt: string;
  service: string;
  customerName: string;
  customerInitials: string;
  staff: string;
  durationMinutes: number;
  status: string;
  note: string | null;
  link: OwnerBriefLink;
};

export type OwnerBriefWatchItem = {
  id: string;
  tone: "risk" | "notice";
  title: string;
  detail: string;
  link: OwnerBriefLink;
};

export type OwnerBriefWin = {
  id: string;
  summary: string;
  detail: string | null;
  customerName: string;
  createdAt: string;
  link: OwnerBriefLink;
};

export type OwnerBrief = {
  generatedAt: string;
  businessDate: string;
  greeting: string;
  headline: string;
  summary: string;
  metrics: {
    needsDecision: number;
    bookingsToday: number;
    operationalRisks: number;
    handledRecently: number;
  };
  attentionItems: OwnerBriefAttentionItem[];
  todaySchedule: OwnerBriefScheduleItem[];
  watchItems: OwnerBriefWatchItem[];
  recentWins: OwnerBriefWin[];
  suggestedQuestions: string[];
};

function customerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function relevantVisitNote(notes: string | null) {
  if (!notes) return null;
  const useful = notes
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) =>
      /\b(access|arrival|buzzer|call|code|dog|door|gate|key|parking|tenant)\b/i.test(sentence)
    );
  return useful.length ? useful.join(" ") : null;
}

function greetingFor(now: DateTime) {
  if (now.hour < 12) return "Good morning";
  if (now.hour < 17) return "Good afternoon";
  return "Good evening";
}

function plural(count: number, singular: string, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function contextNumber(context: Record<string, unknown>, key: string) {
  const value = context[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function buildOwnerBrief(now = DateTime.now().setZone(OWNER_TIMEZONE)) {
  const startOfToday = now.startOf("day");
  const endOfToday = now.endOf("day");
  const recentCutoff = now.minus({ hours: 24 });

  const [bookings, ownerConversations, pendingAttention, failedConversations, recentAnnotations] =
    await Promise.all([
      Booking.query()
        .preload("customer")
        .where("scheduledAt", "<=", now.plus({ days: 14 }).toSQL()!)
        .orderBy("scheduledAt", "asc"),
      SupportConversation.query()
        .preload("customer")
        .preload("attentionItems", (query) =>
          query.whereIn("status", ["pending", "approved"]).orderBy("createdAt", "asc")
        )
        .where("nextStepOwner", "owner")
        .orderBy("updatedAt", "asc"),
      InboxAttentionItem.query()
        .preload("conversation", (query) => query.preload("customer"))
        .whereIn("status", ["pending", "approved"])
        .orderBy("createdAt", "asc"),
      SupportConversation.query()
        .preload("customer")
        .where("outcomeStatus", "failed")
        .orderBy("updatedAt", "desc")
        .limit(10),
      InboxAnnotation.query()
        .preload("conversation", (query) => query.preload("customer"))
        .whereIn("kind", ["milestone", "outcome"])
        .where("createdAt", ">=", recentCutoff.toSQL()!)
        .orderBy("createdAt", "desc")
        .limit(8),
    ]);

  const attentionItems: OwnerBriefAttentionItem[] = ownerConversations.map((conversation) => {
    const attention = conversation.attentionItems[0];
    const cause = attention?.cause ?? "judgment";
    const detail =
      attention?.outcomeSummary ??
      attention?.summary ??
      conversation.outcomeSummary ??
      "The next step is waiting for your decision or response.";
    return {
      id: `conversation:${conversation.id}`,
      kind: "conversation",
      priority: cause === "failure" || cause === "relationship" ? "urgent" : "important",
      eyebrow:
        cause === "authority"
          ? "Approval needed"
          : cause === "relationship"
            ? "Customer needs you"
            : cause === "failure"
              ? "Recovery needed"
              : "Judgment needed",
      title: conversation.title,
      detail,
      customerName: conversation.customer.name,
      createdAt: (
        attention?.createdAt ??
        conversation.updatedAt ??
        conversation.createdAt
      ).toISO()!,
      link: {
        label: "Open conversation",
        href: `/inbox?conversation=${encodeURIComponent(conversation.id)}`,
      },
    };
  });

  const representedBookingIds = new Set<number>();
  for (const attention of pendingAttention) {
    const bookingId = contextNumber(attention.context, "bookingId");
    if (bookingId !== null) representedBookingIds.add(bookingId);
  }

  const pendingBookings = bookings.filter(
    (booking) => booking.status === "needs_approval" && !representedBookingIds.has(booking.id)
  );
  for (const booking of pendingBookings) {
    const isPastDue = booking.scheduledAt < now;
    attentionItems.push({
      id: `booking:${booking.id}`,
      kind: "booking",
      priority: isPastDue ? "urgent" : "important",
      eyebrow: isPastDue ? "Approval overdue" : "Booking approval",
      title: `${booking.service} for ${booking.customer.name}`,
      detail: `${booking.scheduledAt.setZone(OWNER_TIMEZONE).toFormat("ccc, LLL d 'at' h:mm a")} · ${booking.staff}`,
      customerName: booking.customer.name,
      createdAt: booking.createdAt.toISO()!,
      link: {
        label: "Review booking",
        href: `/bookings?view=agenda&booking=${booking.id}`,
      },
    });
  }

  const attentionBookingIds = new Set([
    ...representedBookingIds,
    ...pendingBookings.map((booking) => booking.id),
  ]);

  attentionItems.sort((left, right) => {
    const rank = { urgent: 0, important: 1, watch: 2 } as const;
    return (
      rank[left.priority] - rank[right.priority] || left.createdAt.localeCompare(right.createdAt)
    );
  });

  const todaySchedule: OwnerBriefScheduleItem[] = bookings
    .filter((booking) => booking.scheduledAt >= startOfToday && booking.scheduledAt <= endOfToday)
    .map((booking) => ({
      id: booking.id,
      time: booking.scheduledAt.setZone(OWNER_TIMEZONE).toFormat("h:mm a"),
      scheduledAt: booking.scheduledAt.toISO()!,
      service: booking.service,
      customerName: booking.customer.name,
      customerInitials: customerInitials(booking.customer.name),
      staff: booking.staff,
      durationMinutes: booking.durationMinutes,
      status: booking.status,
      note: relevantVisitNote(booking.customer.notes),
      link: {
        label: "Open booking",
        href: `/bookings?view=agenda&booking=${booking.id}`,
      },
    }));

  const overdueBookings = bookings.filter(
    (booking) =>
      booking.scheduledAt < startOfToday &&
      booking.status !== "completed" &&
      !attentionBookingIds.has(booking.id)
  );
  const watchItems: OwnerBriefWatchItem[] = overdueBookings.slice(0, 6).map((booking) => ({
    id: `overdue-booking:${booking.id}`,
    tone: "risk",
    title: `${booking.service} is still marked ${booking.status.replaceAll("_", " ")}`,
    detail: `${booking.customer.name} · scheduled ${booking.scheduledAt
      .setZone(OWNER_TIMEZONE)
      .toFormat("LLL d 'at' h:mm a")}`,
    link: {
      label: "Check booking",
      href: `/bookings?view=agenda&booking=${booking.id}`,
    },
  }));

  for (const conversation of failedConversations) {
    watchItems.push({
      id: `failed-conversation:${conversation.id}`,
      tone: "risk",
      title: conversation.title,
      detail:
        conversation.outcomeSummary ?? `${conversation.customer.name}'s request did not complete.`,
      link: {
        label: "Recover conversation",
        href: `/inbox?conversation=${encodeURIComponent(conversation.id)}`,
      },
    });
  }

  const recentWins: OwnerBriefWin[] = recentAnnotations.map((annotation) => ({
    id: annotation.id,
    summary: annotation.summary,
    detail: annotation.detail,
    customerName: annotation.conversation.customer.name,
    createdAt: annotation.createdAt.toISO()!,
    link: {
      label: "View outcome",
      href: `/inbox?conversation=${encodeURIComponent(annotation.conversation.id)}`,
    },
  }));

  const headline = attentionItems.length
    ? `${plural(attentionItems.length, "item")} waiting for you`
    : watchItems.length
      ? `${plural(watchItems.length, "item")} to follow up`
      : todaySchedule.length
        ? `${plural(todaySchedule.length, "booking")} on today's schedule`
        : "No open work today";

  const summaryParts = [
    todaySchedule.length ? `${plural(todaySchedule.length, "booking")} scheduled today` : null,
    attentionItems.length
      ? `${plural(attentionItems.length, "item")} ${attentionItems.length === 1 ? "needs" : "need"} your decision`
      : null,
    watchItems.length ? `${plural(watchItems.length, "item")} may need follow-up` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    generatedAt: now.toISO()!,
    businessDate: now.toISODate()!,
    greeting: greetingFor(now),
    headline,
    summary: summaryParts.length
      ? `${summaryParts.join("; ")}.`
      : "No bookings or follow-up today.",
    metrics: {
      needsDecision: attentionItems.length,
      bookingsToday: todaySchedule.length,
      operationalRisks: watchItems.length,
      handledRecently: recentWins.length,
    },
    attentionItems,
    todaySchedule,
    watchItems,
    recentWins,
    suggestedQuestions: [
      "Prepare me for today",
      "What needs my attention first?",
      "What changed in the last 24 hours?",
    ],
  } satisfies OwnerBrief;
}

export function answerFromOwnerBrief(question: string, brief: OwnerBrief) {
  const normalized = question.toLowerCase();

  if (normalized.includes("today") || normalized.includes("prepare")) {
    const schedule = brief.todaySchedule.length
      ? brief.todaySchedule
          .map(
            (item) =>
              `- **${item.time}** — ${item.service} for ${item.customerName} with ${item.staff} ([schedule](${item.link.href}))`
          )
          .join("\n")
      : "- No bookings are scheduled today.";
    const firstRisk = brief.watchItems[0];
    const risk = firstRisk
      ? `\n\n**Also check:** ${firstRisk.title}. ${firstRisk.detail} ([open](${firstRisk.link.href}))`
      : "\n\nNothing else needs follow-up.";
    return `**Today**\n\n${schedule}${risk}`;
  }

  if (
    normalized.includes("attention") ||
    normalized.includes("decision") ||
    normalized.includes("first")
  ) {
    if (!brief.attentionItems.length) {
      return brief.watchItems.length
        ? "Nothing is waiting for your decision. The items that may need follow-up are listed below."
        : "Nothing needs your decision right now.";
    }
    return brief.attentionItems
      .slice(0, 5)
      .map(
        (item, index) =>
          `${index + 1}. **${item.title}** — ${item.detail} ([${item.link.label}](${item.link.href}))`
      )
      .join("\n");
  }

  if (
    normalized.includes("changed") ||
    normalized.includes("last 24") ||
    normalized.includes("handled")
  ) {
    if (!brief.recentWins.length) {
      return "No completed work was recorded since yesterday. Anything still open is listed under **Needs your attention** or **Needs follow-up**.";
    }
    return brief.recentWins
      .slice(0, 5)
      .map(
        (item) =>
          `- **${item.summary}** for ${item.customerName}${item.detail ? ` — ${item.detail}` : ""} ([view](${item.link.href}))`
      )
      .join("\n");
  }

  if (normalized.includes("blocked") || normalized.includes("risk")) {
    if (!brief.watchItems.length) return "No blocked or failed work is visible right now.";
    return brief.watchItems
      .slice(0, 6)
      .map(
        (item) => `- **${item.title}** — ${item.detail} ([${item.link.label}](${item.link.href}))`
      )
      .join("\n");
  }

  return null;
}
