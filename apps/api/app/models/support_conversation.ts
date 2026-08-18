import { SupportConversationSchema } from "#database/schema";
import Customer from "#models/customer";
import { belongsTo } from "@adonisjs/lucid/orm";
import type { BelongsTo } from "@adonisjs/lucid/types/relations";

export default class SupportConversation extends SupportConversationSchema {
  static selfAssignPrimaryKey = true;

  @belongsTo(() => Customer)
  declare customer: BelongsTo<typeof Customer>;
}
