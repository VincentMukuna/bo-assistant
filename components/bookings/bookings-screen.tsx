"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserRound } from "lucide-react";

import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  initialBookings,
  weekDays,
  type Booking,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function BookingsView({
  bookings,
  onNewBooking,
  view,
  onViewChange,
}: {
  bookings: Booking[];
  onNewBooking: () => void;
  view: "week" | "agenda";
  onViewChange: (view: "week" | "agenda") => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50/50">
      <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-2 sm:px-6">
        <h1 className="sr-only">Bookings</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white">Today</Button>
          <Button variant="ghost" size="icon-sm" aria-label="Previous week">‹</Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next week">›</Button>
          <span className="hidden text-sm font-medium text-zinc-700 sm:inline">Aug 17–21</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg bg-zinc-100 p-1">
            <button type="button" onClick={() => onViewChange("week")} className={cn("rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600", view === "week" && "bg-white text-zinc-950 shadow-sm")}>Week</button>
            <button type="button" onClick={() => onViewChange("agenda")} className={cn("rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600", view === "agenda" && "bg-white text-zinc-950 shadow-sm")}>Agenda</button>
          </div>
          <Button className="h-8" onClick={onNewBooking}>
            <Plus /> <span className="hidden sm:inline">New booking</span>
          </Button>
        </div>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        {view === "week" ? (
          <div className="min-w-[900px] p-5 sm:p-8">
            <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              {weekDays.map((day, index) => {
                const dayBookings = bookings.filter((booking) => booking.day === day.day);
                return (
                  <div key={day.day} className={cn("min-h-[570px]", index !== 0 && "border-l border-zinc-200")}>
                    <div className={cn("flex h-16 items-center gap-3 border-b border-zinc-200 px-4", day.label && "bg-zinc-50")}>
                      <div className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold", day.label && "bg-zinc-950 text-white")}>{day.date}</div>
                      <div>
                        <div className="text-xs font-medium">{day.day}</div>
                        {day.label ? <div className="text-[11px] text-muted-foreground">{day.label}</div> : null}
                      </div>
                    </div>
                    <div className="space-y-3 p-3">
                      {dayBookings.map((booking) => (
                        <button key={booking.id} type="button" className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-left transition-all hover:border-zinc-400 hover:shadow-sm">
                          <div className="mb-2 text-xs font-semibold">{booking.time}</div>
                          <div className="text-sm font-medium leading-5">{booking.customer}</div>
                          <div className="mt-1 text-xs text-zinc-500">{booking.service}</div>
                          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500"><UserRound className="size-3" />{booking.staff}</div>
                          <div className="mt-3"><StatusBadge status={booking.status} /></div>
                        </button>
                      ))}
                      {dayBookings.length === 0 ? <div className="py-10 text-center text-xs text-zinc-400">No bookings</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-5xl p-5 sm:p-8">
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {bookings.map((booking, index) => (
                <div key={booking.id} className={cn("grid gap-4 p-5 md:grid-cols-[130px_1fr_160px_140px] md:items-center", index !== 0 && "border-t border-zinc-200")}>
                  <div><div className="text-sm font-medium">{booking.day}, {booking.date}</div><div className="mt-1 text-xs text-muted-foreground">{booking.time}</div></div>
                  <div><div className="text-sm font-medium">{booking.customer}</div><div className="mt-1 text-xs text-muted-foreground">{booking.service} · {booking.address}</div></div>
                  <div className="text-sm text-zinc-600">{booking.staff}</div>
                  <StatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}


export function BookingsScreen({ view }: { view: "week" | "agenda" }) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [newBookingOpen, setNewBookingOpen] = useState(false);

  return (
    <>
      <BookingsView
        bookings={bookings}
        view={view}
        onViewChange={(next) =>
          router.replace(`/bookings?view=${next}`, { scroll: false })
        }
        onNewBooking={() => setNewBookingOpen(true)}
      />
      <NewBookingDialog
        open={newBookingOpen}
        onOpenChange={setNewBookingOpen}
        onCreate={(booking) =>
          setBookings((current) => [...current, booking])
        }
      />
    </>
  );
}
