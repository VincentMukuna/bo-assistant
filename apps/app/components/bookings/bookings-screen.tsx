"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";

import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type Booking, type BookingInput, type Customer } from "@/lib/api";
import { weekDays } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const statusLabels = {
  confirmed: "Confirmed",
  needs_approval: "Needs approval",
  in_progress: "In progress",
  completed: "Completed",
} as const;

function displayDate(booking: Booking) {
  const date = new Date(booking.scheduledAt);
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
  };
}

export function BookingsScreen({ view }: { view: "week" | "agenda" }) {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.bookings.index(), api.customers.index()])
      .then(([bookingRecords, customerRecords]) => {
        setBookings(bookingRecords);
        setCustomers(customerRecords);
      })
      .catch(() => setError("Unable to load bookings."))
      .finally(() => setLoading(false));
  }, []);

  async function saveBooking(input: BookingInput) {
    if (editing) {
      const updated = await api.bookings.update(editing.id, input);
      setBookings((current) => current.map((booking) => booking.id === updated.id ? updated : booking).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
      return;
    }
    const created = await api.bookings.store(input);
    setBookings((current) => [...current, created].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)));
  }

  async function removeBooking(booking: Booking) {
    if (!window.confirm(`Delete the ${booking.service} booking for ${booking.customer.name}?`)) return;
    await api.bookings.destroy(booking.id);
    setBookings((current) => current.filter((item) => item.id !== booking.id));
  }

  function editBooking(booking: Booking) {
    setEditing(booking);
    setDialogOpen(true);
  }

  if (loading) return <div className="flex h-full items-center justify-center text-sm text-zinc-500">Loading bookings…</div>;
  if (error) return <div className="flex h-full items-center justify-center text-sm text-red-600">{error}</div>;

  return (
    <>
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
              <button type="button" onClick={() => router.replace("/bookings?view=week", { scroll: false })} className={cn("rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600", view === "week" && "bg-white text-zinc-950 shadow-sm")}>Week</button>
              <button type="button" onClick={() => router.replace("/bookings?view=agenda", { scroll: false })} className={cn("rounded-md px-3 py-1.5 text-xs font-medium text-zinc-600", view === "agenda" && "bg-white text-zinc-950 shadow-sm")}>Agenda</button>
            </div>
            <Button className="h-8" onClick={() => { setEditing(undefined); setDialogOpen(true); }} disabled={!customers.length}>
              <Plus /> <span className="hidden sm:inline">New booking</span>
            </Button>
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1">
          {view === "week" ? (
            <div className="min-w-[900px] p-5 sm:p-8">
              <div className="grid grid-cols-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                {weekDays.map((day, index) => {
                  const dayBookings = bookings.filter((booking) => displayDate(booking).day === day.day);
                  return (
                    <div key={day.day} className={cn("min-h-[570px]", index !== 0 && "border-l border-zinc-200")}>
                      <div className={cn("flex h-16 items-center gap-3 border-b border-zinc-200 px-4", day.label && "bg-zinc-50")}>
                        <div className={cn("flex size-8 items-center justify-center rounded-full text-sm font-semibold", day.label && "bg-zinc-950 text-white")}>{day.date}</div>
                        <div><div className="text-xs font-medium">{day.day}</div>{day.label ? <div className="text-[11px] text-muted-foreground">{day.label}</div> : null}</div>
                      </div>
                      <div className="space-y-3 p-3">
                        {dayBookings.map((booking) => {
                          const date = displayDate(booking);
                          return (
                            <div key={booking.id} className="rounded-lg border border-zinc-200 bg-white p-3 transition-all hover:border-zinc-400 hover:shadow-sm">
                              <div className="flex items-start justify-between gap-2"><div className="text-xs font-semibold">{date.time}</div><div className="flex"><Button variant="ghost" size="icon-xs" aria-label="Edit booking" onClick={() => editBooking(booking)}><Pencil /></Button><Button variant="ghost" size="icon-xs" aria-label="Delete booking" onClick={() => void removeBooking(booking)}><Trash2 /></Button></div></div>
                              <div className="text-sm font-medium leading-5">{booking.customer.name}</div>
                              <div className="mt-1 text-xs text-zinc-500">{booking.service}</div>
                              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500"><UserRound className="size-3" />{booking.staff}</div>
                              <div className="mt-3"><StatusBadge status={statusLabels[booking.status]} /></div>
                            </div>
                          );
                        })}
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
                {bookings.map((booking, index) => {
                  const date = displayDate(booking);
                  return (
                    <div key={booking.id} className={cn("grid gap-4 p-5 md:grid-cols-[130px_1fr_130px_140px_72px] md:items-center", index !== 0 && "border-t border-zinc-200")}>
                      <div><div className="text-sm font-medium">{date.day}, {date.date}</div><div className="mt-1 text-xs text-muted-foreground">{date.time}</div></div>
                      <div><div className="text-sm font-medium">{booking.customer.name}</div><div className="mt-1 text-xs text-muted-foreground">{booking.service} · {booking.serviceAddress}</div></div>
                      <div className="text-sm text-zinc-600">{booking.staff}</div>
                      <StatusBadge status={statusLabels[booking.status]} />
                      <div className="flex"><Button variant="ghost" size="icon-sm" aria-label="Edit booking" onClick={() => editBooking(booking)}><Pencil /></Button><Button variant="ghost" size="icon-sm" aria-label="Delete booking" onClick={() => void removeBooking(booking)}><Trash2 /></Button></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
      {dialogOpen ? <NewBookingDialog onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(undefined); }} customers={customers} booking={editing} onSave={saveBooking} /> : null}
    </>
  );
}
