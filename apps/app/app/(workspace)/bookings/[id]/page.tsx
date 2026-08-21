import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BookingsScreen } from "@/components/bookings/bookings-screen";
import { parseBookingId } from "@/lib/booking-routes";
import { getServerBooking } from "@/lib/server-api";

export const metadata: Metadata = { title: "Booking · Oak & Pine" };

type BookingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingPage({ params }: BookingPageProps) {
  const bookingId = parseBookingId((await params).id);
  if (!bookingId) notFound();

  const booking = await getServerBooking(bookingId);
  if (!booking) notFound();

  return <BookingsScreen view="agenda" initialBookingId={booking.id} />;
}
