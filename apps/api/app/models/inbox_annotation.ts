import { InboxAnnotationSchema } from "#database/schema";
import SupportConversation from "#models/support_conversation";
import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

export default class InboxAnnotation extends InboxAnnotationSchema {
  static selfAssignPrimaryKey = true;

  @belongsTo(() => SupportConversation, { foreignKey: "conversationId" })
  declare conversation: BelongsTo<typeof SupportConversation>;
}
