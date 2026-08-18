import encryption from "@adonisjs/core/services/encryption";

const BOOKING_CAPABILITY_PURPOSE = "demo-booking-agent";

export type BookingCapability = {
  customerId: number;
  scopes: Array<"find_bookings" | "reschedule_booking">;
};

export function issueBookingCapability(customerId: number) {
  return encryption.encrypt(
    {
      customerId,
      scopes: ["find_bookings", "reschedule_booking"],
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
    !Array.isArray(capability.scopes)
  ) {
    return null;
  }

  return capability;
}
