import { InboxAttentionItemSchema } from "#database/schema";
import SupportConversation from "#models/support_conversation";
import User from "#models/user";
import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

export type AttentionCause = "authority" | "judgment" | "relationship" | "failure";
export type AttentionStatus = "pending" | "approved" | "declined" | "completed" | "failed";

export default class InboxAttentionItem extends InboxAttentionItemSchema {
  static selfAssignPrimaryKey = true;

  declare cause: AttentionCause;
  declare status: AttentionStatus;

  @belongsTo(() => SupportConversation, { foreignKey: "conversationId" })
  declare conversation: BelongsTo<typeof SupportConversation>;

  @belongsTo(() => User, { foreignKey: "decidedByUserId" })
  declare decidedBy: BelongsTo<typeof User>;

  get context(): Record<string, unknown> {
    try {
      return JSON.parse(this.contextJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
