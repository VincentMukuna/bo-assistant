import encryption from "@adonisjs/core/services/encryption";

const BOOKING_CAPABILITY_PURPOSE = "demo-booking-agent";

export type BookingCapability = {
  customerId: number;
  scopes: BookingCapabilityScope[];
} & (
  | { kind: "booking-read" }
  | {
      kind: "booking-reschedule";
      bookingId: number;
      expectedStartTime: string;
      proposedStartTime: string;
      runId: string;
      toolCallId: string;
    }
);

export type BookingCapabilityScope = "find_bookings" | "reschedule_booking";

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

export function issueBookingRescheduleCapability(input: {
  customerId: number;
  bookingId: number;
  expectedStartTime: string;
  proposedStartTime: string;
  runId: string;
  toolCallId: string;
}) {
  return encryption.encrypt(
    {
      kind: "booking-reschedule",
      customerId: input.customerId,
      bookingId: input.bookingId,
      expectedStartTime: input.expectedStartTime,
      proposedStartTime: input.proposedStartTime,
      runId: input.runId,
      toolCallId: input.toolCallId,
      scopes: ["reschedule_booking"],
    } satisfies BookingCapability,
    { expiresIn: "5 minutes", purpose: BOOKING_CAPABILITY_PURPOSE }
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
    !capability.scopes.every(
      (scope) => scope === "find_bookings" || scope === "reschedule_booking"
    ) ||
    (capability.kind !== "booking-read" && capability.kind !== "booking-reschedule")
  ) {
    return null;
  }

  if (
    capability.kind === "booking-reschedule" &&
    (!Number.isInteger(capability.bookingId) ||
      typeof capability.expectedStartTime !== "string" ||
      typeof capability.proposedStartTime !== "string" ||
      typeof capability.runId !== "string" ||
      typeof capability.toolCallId !== "string")
  ) {
    return null;
  }

  return capability;
}
