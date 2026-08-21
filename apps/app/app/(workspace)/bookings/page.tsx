import type { Metadata } from "next";

import { BookingsScreen } from "@/components/bookings/bookings-screen";

export const metadata: Metadata = { title: "Bookings · Oak & Pine" };

type BookingsPageProps = {
  searchParams: Promise<{ view?: string | string[]; booking?: string | string[] }>;
};

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const query = await searchParams;
  const view = query.view === "agenda" ? "agenda" : "week";
  const bookingValue = Array.isArray(query.booking) ? query.booking[0] : query.booking;
  const parsedBookingId = bookingValue ? Number(bookingValue) : undefined;
  const initialBookingId =
    parsedBookingId && Number.isInteger(parsedBookingId) && parsedBookingId > 0
      ? parsedBookingId
      : undefined;

  return (
    <BookingsScreen
      key={`${view}:${initialBookingId ?? "none"}`}
      view={view}
      initialBookingId={initialBookingId}
    />
  );
}
