import { InboxAttentionItemSchema } from "#database/schema";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";
import { Result, TaggedError, type Result as ResultType } from "better-result";
import { z } from "zod";

export type AttentionCause = "authority" | "judgment" | "relationship" | "failure";
export type AttentionStatus = "pending" | "approved" | "declined" | "completed" | "failed";

export class InvalidAttentionContext extends TaggedError("InvalidAttentionContext")<{
  attentionId: string;
  cause: unknown;
  message: string;
}> {}

const bookingRescheduleContextSchema = z
  .object({
    runId: z.string(),
    toolCallId: z.string(),
    bookingId: z.number().int().positive(),
    service: z.string(),
    staff: z.string(),
    currentStartTime: z.string(),
    proposedStartTime: z.string(),
  })
  .loose();

export default class InboxAttentionItem extends InboxAttentionItemSchema {
  static selfAssignPrimaryKey = true;

  declare cause: AttentionCause;
  declare status: AttentionStatus;

  @belongsTo(() => SupportConversation, { foreignKey: "conversationId" })
  declare conversation: BelongsTo<typeof SupportConversation>;

  @belongsTo(() => User, { foreignKey: "decidedByUserId" })
  declare decidedBy: BelongsTo<typeof User>;

  readContext(): ResultType<Record<string, unknown>, InvalidAttentionContext> {
    const decoded = Result.try({
      try: () => JSON.parse(this.contextJson),
      catch: (cause) =>
        new InvalidAttentionContext({
          attentionId: this.id,
          cause,
          message: `Attention item ${this.id} contains invalid JSON context and cannot be decided safely.`,
        }),
    });
    if (decoded.status === "error") return decoded;

    const parsed = z.record(z.string(), z.unknown()).safeParse(decoded.value);
    return parsed.success
      ? Result.ok(parsed.data)
      : Result.err(
          new InvalidAttentionContext({
            attentionId: this.id,
            cause: parsed.error,
            message: `Attention item ${this.id} does not contain an object context and cannot be displayed safely.`,
          })
        );
  }

  readBookingRescheduleContext(): ResultType<
    z.infer<typeof bookingRescheduleContextSchema>,
    InvalidAttentionContext
  > {
    const context = this.readContext();
    if (context.status === "error") return context;

    const parsed = bookingRescheduleContextSchema.safeParse(context.value);
    return parsed.success
      ? Result.ok(parsed.data)
      : Result.err(
          new InvalidAttentionContext({
            attentionId: this.id,
            cause: parsed.error,
            message: `Attention item ${this.id} is missing required booking decision context and cannot be decided safely.`,
          })
        );
  }
}
