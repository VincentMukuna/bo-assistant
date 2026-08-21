"use client";

import { useRouter } from "next/navigation";

import { BookingDetailsDialog } from "@/components/bookings/booking-details-sheet";
import type { Booking } from "@/lib/api";

export function RoutedBookingDialog({ booking }: { booking: Booking }) {
  const router = useRouter();

  return <BookingDetailsDialog booking={booking} onOpenChange={(open) => !open && router.back()} />;
}
