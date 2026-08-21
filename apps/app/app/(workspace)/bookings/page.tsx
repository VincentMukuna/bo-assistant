import type { Metadata } from "next";

import { BookingsScreen } from "@/components/bookings/bookings-screen";

export const metadata: Metadata = { title: "Bookings · Oak & Pine" };

type BookingsPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function BookingsPage({ searchParams }: BookingsPageProps) {
  const query = await searchParams;
  const view = query.view === "agenda" ? "agenda" : "week";

  return <BookingsScreen key={view} view={view} />;
}
