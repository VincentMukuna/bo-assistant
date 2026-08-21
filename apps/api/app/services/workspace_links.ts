export function bookingWorkspaceHref(bookingId: number) {
  return `/bookings/${bookingId}`;
}

export function bookingIdFromWorkspaceHref(href: string) {
  const match = new URL(href, "http://workspace.local").pathname.match(/^\/bookings\/(\d+)$/);
  if (!match) return undefined;

  const bookingId = Number(match[1]);
  return Number.isSafeInteger(bookingId) && bookingId > 0 ? bookingId : undefined;
}
