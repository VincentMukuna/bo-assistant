import Booking from "#models/booking";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import type SupportConversation from "#models/support_conversation";
import { businessSupportAgent, type PendingRescheduleCall } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";
import { DateTime } from "luxon";

export default async function syncRescheduleAttention(
  conversation: SupportConversation,
  pendingCall?: PendingRescheduleCall
) {
  if (!conversation.customerId) return null;
  await conversation.load("customer");
  let call = pendingCall;
  if (!call) {
    const pending = await businessSupportAgent.listPendingReschedules(conversation);
    if (pending.length !== 1) return null;
    call = pending[0];
  }
  if (!call) return null;
  const existing = await InboxAttentionItem.findBy("externalKey", call.toolCallId);
  if (existing) return existing;

  const booking = await Booking.query()
    .where("id", call.bookingId)
    .where("customerId", conversation.customerId)
    .first();
  const expected = DateTime.fromISO(call.expectedStartTime, { setZone: true });
  const proposed = DateTime.fromISO(call.proposedStartTime, { setZone: true });
  const valid =
    booking &&
    expected.isValid &&
    proposed.isValid &&
    proposed > DateTime.now() &&
    booking.scheduledAt.toUTC().toMillis() === expected.toUTC().toMillis();

  const item = await InboxAttentionItem.create({
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    cause: valid ? "authority" : "failure",
    actionType: "booking_reschedule",
    status: valid ? "pending" : "failed",
    externalKey: call.toolCallId,
    summary: valid
      ? `${conversation.customer.name} wants to reschedule ${booking.service}`
      : "A proposed booking change is no longer safe to apply",
    contextJson: JSON.stringify({
      runId: call.runId,
      toolCallId: call.toolCallId,
      bookingId: call.bookingId,
      service: booking?.service ?? "Booking unavailable",
      staff: booking?.staff ?? "",
      currentStartTime: call.expectedStartTime,
      proposedStartTime: call.proposedStartTime,
    }),
    outcomeSummary: valid ? null : "The booking or proposed time changed before approval.",
  });

  conversation.nextStepOwner = valid ? "owner" : "none";
  conversation.outcomeStatus = valid ? "active" : "failed";
  conversation.outcomeSummary = valid ? null : item.outcomeSummary;
  await conversation.save();
  await InboxAnnotation.create({
    id: crypto.randomUUID(),
    conversationId: conversation.id,
    kind: valid ? "attention" : "failure",
    summary: valid ? "Business approval needed" : "Booking change needs review",
    detail: valid
      ? "The customer selected a time. The calendar will not change until the owner authorizes it."
      : item.outcomeSummary,
  });
  inboxEventStream.publish(conversation.id);
  return item;
}
