export function bookingPath(bookingId: number) {
  return `/bookings/${bookingId}`;
}

export function parseBookingId(value: string) {
  if (!/^\d+$/.test(value)) return undefined;

  const bookingId = Number(value);
  return Number.isSafeInteger(bookingId) && bookingId > 0 ? bookingId : undefined;
}
