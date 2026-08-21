import encryption from "@adonisjs/core/services/encryption";

const OWNER_OPERATIONS_CAPABILITY_PURPOSE = "owner-operations-agent";

export type OwnerOperationsCapabilityScope = "read_conversation" | "read_booking";

export type OwnerOperationsCapability = {
  kind: "owner-operations-read";
  userId: number;
  scopes: OwnerOperationsCapabilityScope[];
  conversationIds: string[];
  bookingIds: number[];
};

export function issueOwnerOperationsCapability(
  userId: number,
  resources: { conversationIds: string[]; bookingIds: number[] }
) {
  return encryption.encrypt(
    {
      kind: "owner-operations-read",
      userId,
      scopes: ["read_conversation", "read_booking"],
      conversationIds: [...new Set(resources.conversationIds)],
      bookingIds: [...new Set(resources.bookingIds)],
    } satisfies OwnerOperationsCapability,
    { expiresIn: "5 minutes", purpose: OWNER_OPERATIONS_CAPABILITY_PURPOSE }
  );
}

export function readOwnerOperationsCapability(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;

  const capability = encryption.decrypt<OwnerOperationsCapability>(
    authorization.slice("Bearer ".length),
    OWNER_OPERATIONS_CAPABILITY_PURPOSE
  );

  if (
    !capability ||
    capability.kind !== "owner-operations-read" ||
    !Number.isInteger(capability.userId) ||
    !Array.isArray(capability.scopes) ||
    !capability.scopes.every((scope) => ["read_conversation", "read_booking"].includes(scope)) ||
    !Array.isArray(capability.conversationIds) ||
    !capability.conversationIds.every((id) => typeof id === "string") ||
    !Array.isArray(capability.bookingIds) ||
    !capability.bookingIds.every((id) => Number.isInteger(id) && id > 0)
  ) {
    return null;
  }

  return capability;
}
