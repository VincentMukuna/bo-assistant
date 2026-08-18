import { SupportConversationSchema } from "#database/schema";
import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import { belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";

export default class SupportConversation extends SupportConversationSchema {
  static selfAssignPrimaryKey = true;

  declare nextStepOwner: "agent" | "owner" | "customer" | "none";
  declare handlingMode: "agent" | "owner";
  declare outcomeStatus: "active" | "completed" | "failed";

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>;

  @hasMany(() => InboxAttentionItem, { foreignKey: "conversationId" })
  declare attentionItems: HasMany<typeof InboxAttentionItem>;

  @hasMany(() => InboxAnnotation, { foreignKey: "conversationId" })
  declare annotations: HasMany<typeof InboxAnnotation>;
}
