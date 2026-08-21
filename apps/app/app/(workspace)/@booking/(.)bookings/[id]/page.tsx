import { notFound } from "next/navigation";

import { RoutedBookingDialog } from "@/components/bookings/routed-booking-dialog";
import { parseBookingId } from "@/lib/booking-routes";
import { getServerBooking } from "@/lib/server-api";

type InterceptedBookingPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InterceptedBookingPage({ params }: InterceptedBookingPageProps) {
  const bookingId = parseBookingId((await params).id);
  if (!bookingId) notFound();

  const booking = await getServerBooking(bookingId);
  if (!booking) notFound();

  return <RoutedBookingDialog booking={booking} />;
}
