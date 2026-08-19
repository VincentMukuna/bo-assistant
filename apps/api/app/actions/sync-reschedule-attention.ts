import Booking from "#models/booking";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import type SupportConversation from "#models/support_conversation";
import { businessSupportAgent } from "#services/business_support_agent";
import { inboxEventStream } from "#services/inbox_event_stream";
import { DateTime } from "luxon";
import { Result, TaggedError } from "better-result";

export class AttentionStoreUnavailable extends TaggedError("AttentionStoreUnavailable")<{
  conversationId: string;
  operation:
    | "load-conversation-customer"
    | "load-attention"
    | "load-booking"
    | "create-attention"
    | "save-conversation"
    | "create-annotation";
  cause: unknown;
  message: string;
}> {}

function storeFailure(
  conversationId: string,
  operation: AttentionStoreUnavailable["operation"],
  cause: unknown
) {
  return new AttentionStoreUnavailable({
    conversationId,
    operation,
    cause,
    message: `Unable to ${operation.replaceAll("-", " ")} while synchronizing booking attention for conversation ${conversationId}.`,
  });
}

export default async function syncRescheduleAttention(conversation: SupportConversation) {
  return Result.gen(async function* () {
    yield* Result.await(
      Result.tryPromise({
        try: () => conversation.load("customer"),
        catch: (cause) => storeFailure(conversation.id, "load-conversation-customer", cause),
      })
    );
    const pendingResult = await businessSupportAgent.listPendingReschedules(
      conversation.customer,
      conversation.id
    );
    if (pendingResult.status === "error") return Result.err(pendingResult.error);
    const pending = pendingResult.value;
    if (pending.length !== 1) return Result.ok(null);

    const call = pending[0];
    const existing = yield* Result.await(
      Result.tryPromise({
        try: () => InboxAttentionItem.findBy("externalKey", call.toolCallId),
        catch: (cause) => storeFailure(conversation.id, "load-attention", cause),
      })
    );
    if (existing) return Result.ok(existing);

    const booking = yield* Result.await(
      Result.tryPromise({
        try: () =>
          Booking.query()
            .where("id", call.bookingId)
            .where("customerId", conversation.customerId)
            .first(),
        catch: (cause) => storeFailure(conversation.id, "load-booking", cause),
      })
    );
    const expected = DateTime.fromISO(call.expectedStartTime, { setZone: true });
    const proposed = DateTime.fromISO(call.proposedStartTime, { setZone: true });
    const valid =
      booking &&
      expected.isValid &&
      proposed.isValid &&
      proposed > DateTime.now() &&
      booking.scheduledAt.toUTC().toMillis() === expected.toUTC().toMillis();

    const item = yield* Result.await(
      Result.tryPromise({
        try: () =>
          InboxAttentionItem.create({
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
          }),
        catch: (cause) => storeFailure(conversation.id, "create-attention", cause),
      })
    );

    conversation.nextStepOwner = valid ? "owner" : "none";
    conversation.outcomeStatus = valid ? "active" : "failed";
    conversation.outcomeSummary = valid ? null : item.outcomeSummary;
    yield* Result.await(
      Result.tryPromise({
        try: () => conversation.save(),
        catch: (cause) => storeFailure(conversation.id, "save-conversation", cause),
      })
    );
    yield* Result.await(
      Result.tryPromise({
        try: () =>
          InboxAnnotation.create({
            id: crypto.randomUUID(),
            conversationId: conversation.id,
            kind: valid ? "attention" : "failure",
            summary: valid ? "Business approval needed" : "Booking change needs review",
            detail: valid
              ? "The customer selected a time. The calendar will not change until the owner authorizes it."
              : item.outcomeSummary,
          }),
        catch: (cause) => storeFailure(conversation.id, "create-annotation", cause),
      })
    );
    inboxEventStream.publish(conversation.id);
    return Result.ok(item);
  });
}
