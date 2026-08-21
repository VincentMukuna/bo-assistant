import { SupportConversationSchema } from "#database/schema";
import Customer from "#models/customer";
import InboxAnnotation from "#models/inbox_annotation";
import InboxAttentionItem from "#models/inbox_attention_item";
import { beforeCreate, belongsTo, hasMany } from "@adonisjs/lucid/orm";
import type { BelongsTo, HasMany } from "@adonisjs/lucid/types/relations";
import type { ModelQueryBuilderContract } from "@adonisjs/lucid/types/model";
import type { SupportIdentity } from "#contracts/support_identity";

export default class SupportConversation extends SupportConversationSchema {
  static selfAssignPrimaryKey = true;

  declare nextStepOwner: "agent" | "owner" | "customer" | "none";
  declare handlingMode: "agent" | "owner";
  declare outcomeStatus: "active" | "completed" | "failed";

  @beforeCreate()
  static assignMemoryResource(conversation: SupportConversation) {
    conversation.memoryResourceId ||=
      conversation.customerId === null
        ? `conversation:${conversation.id}`
        : `customer:${conversation.customerId}`;
  }

  static forIdentity(
    identity: SupportIdentity
  ): ModelQueryBuilderContract<typeof SupportConversation> {
    const query = this.query();
    return identity.customer
      ? query.where("customerId", identity.customer.id)
      : query.where("visitorId", identity.visitorId);
  }

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>;

  @hasMany(() => InboxAttentionItem, { foreignKey: "conversationId" })
  declare attentionItems: HasMany<typeof InboxAttentionItem>;

  @hasMany(() => InboxAnnotation, { foreignKey: "conversationId" })
  declare annotations: HasMany<typeof InboxAnnotation>;
}
