export const bookingStatuses = ["confirmed", "needs_approval", "in_progress", "completed"] as const;

export type BookingStatus = (typeof bookingStatuses)[number];
