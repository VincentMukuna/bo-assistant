import encryption from "@adonisjs/core/services/encryption";

const BOOKING_CAPABILITY_PURPOSE = "demo-booking-agent";

export type BookingCapability = {
  customerId: number;
  scopes: BookingCapabilityScope[];
  kind: "booking-read";
};

export type BookingCapabilityScope = "find_bookings";

export function issueBookingReadCapability(customerId: number) {
  return encryption.encrypt(
    {
      kind: "booking-read",
      customerId,
      scopes: ["find_bookings"],
    } satisfies BookingCapability,
    { expiresIn: "15 minutes", purpose: BOOKING_CAPABILITY_PURPOSE }
  );
}

export function readBookingCapability(authorization: string | undefined) {
  if (!authorization?.startsWith("Bearer ")) return null;

  const capability = encryption.decrypt<BookingCapability>(
    authorization.slice("Bearer ".length),
    BOOKING_CAPABILITY_PURPOSE
  );

  if (
    !capability ||
    !Number.isInteger(capability.customerId) ||
    !Array.isArray(capability.scopes) ||
    !capability.scopes.every((scope) => scope === "find_bookings") ||
    capability.kind !== "booking-read"
  ) {
    return null;
  }

  return capability;
}
