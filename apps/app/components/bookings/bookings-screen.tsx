"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { BookingDetailsDialog } from "@/components/bookings/booking-details-sheet";
import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Booking } from "@/lib/api";
import { businessDateKey, formatBusinessDate, formatBusinessTime } from "@/lib/business-time";
import { bookingsQueryOptions, customersQueryOptions } from "@/lib/queries";
import { cn } from "@/lib/utils";

const statusLabels = {
  confirmed: "Confirmed",
  needs_approval: "Pending",
  in_progress: "In progress",
  completed: "Completed",
} as const;

const emptyBookings: Booking[] = [];

function startOfUtcWeek(date: Date) {
  const result = new Date(date);
  const weekday = result.getUTCDay();
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCDate(result.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
  return result;
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function bookingDate(booking: Booking) {
  return new Date(booking.scheduledAt);
}

function displayDate(booking: Booking) {
  return {
    weekday: formatBusinessDate(booking.scheduledAt, { weekday: "short" }),
    month: formatBusinessDate(booking.scheduledAt, { month: "short" }),
    day: formatBusinessDate(booking.scheduledAt, { day: "numeric" }),
    time: `${formatBusinessTime(booking.scheduledAt, {
      hour: "numeric",
      minute: "2-digit",
    })} PT`,
  };
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

function weekRangeLabel(start: Date) {
  const end = addUtcDays(start, 6);
  const startMonth = start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const endMonth = end.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const year = end.getUTCFullYear();
  return startMonth === endMonth
    ? `${startMonth} ${start.getUTCDate()}–${end.getUTCDate()}, ${year}`
    : `${startMonth} ${start.getUTCDate()}–${endMonth} ${end.getUTCDate()}, ${year}`;
}

function BookingRow({ booking, onOpen }: { booking: Booking; onOpen: (booking: Booking) => void }) {
  const date = displayDate(booking);

  return (
    <button
      type="button"
      onClick={() => onOpen(booking)}
      className="group grid w-full grid-cols-[58px_minmax(0,1fr)] gap-4 bg-white px-4 py-4 text-left transition-colors hover:bg-zinc-50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none focus-visible:ring-inset sm:grid-cols-[76px_minmax(0,1fr)_minmax(140px,0.55fr)_auto] sm:gap-5 sm:px-5"
      aria-label={`Open ${booking.service} booking for ${booking.customer.name}`}
    >
      <div className="border-border/60 border-r pr-4">
        <span className="text-muted-foreground block text-[10px] font-medium tracking-wide uppercase">
          {date.weekday} · {date.month}
        </span>
        <span className="text-foreground mt-0.5 block text-xl leading-6 font-semibold">
          {date.day}
        </span>
        <span className="text-muted-foreground mt-1 block text-[11px]">{date.time}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="truncate text-sm font-semibold text-zinc-900">{booking.service}</h3>
          <span className="sm:hidden">
            <StatusBadge status={statusLabels[booking.status]} />
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-zinc-600">{booking.customer.name}</p>
        <p className="text-muted-foreground mt-1.5 truncate text-xs sm:hidden">
          {booking.staff} · {durationLabel(booking.durationMinutes)}
        </p>
      </div>
      <div className="hidden min-w-0 self-center sm:block">
        <p className="truncate text-xs font-medium text-zinc-700">{booking.staff}</p>
        <p className="text-muted-foreground mt-1 truncate text-xs">
          {durationLabel(booking.durationMinutes)} · {booking.serviceAddress}
        </p>
      </div>
      <div className="hidden items-center justify-end gap-3 self-center sm:flex">
        <div className="flex justify-end">
          <StatusBadge status={statusLabels[booking.status]} />
        </div>
        <ChevronRight className="size-4 text-zinc-300 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
      </div>
    </button>
  );
}

export function BookingsScreen({
  view,
  initialBookingId,
}: {
  view: "week" | "agenda";
  initialBookingId?: number;
}) {
  const router = useRouter();
  const bookingsQuery = useQuery(bookingsQueryOptions);
  const customersQuery = useQuery(customersQueryOptions);
  const bookings = bookingsQuery.data ?? emptyBookings;
  const customers = customersQuery.data ?? [];
  const today = useMemo(() => new Date(`${businessDateKey(new Date())}T00:00:00Z`), []);
  const [weekStart, setWeekStart] = useState(() => startOfUtcWeek(today));
  const [selectedDate, setSelectedDate] = useState(() => businessDateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking>();
  const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>(initialBookingId);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addUtcDays(weekStart, index)),
    [weekStart]
  );
  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => bookingDate(a).getTime() - bookingDate(b).getTime()),
    [bookings]
  );
  const selectedBookings = sortedBookings.filter(
    (booking) => businessDateKey(booking.scheduledAt) === selectedDate
  );
  const upcomingBookings = sortedBookings.filter((booking) => booking.status !== "completed");
  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId);

  function shiftWeek(days: number) {
    const next = addUtcDays(weekStart, days);
    setWeekStart(next);
    setSelectedDate(dateKey(next));
  }

  function goToToday() {
    setWeekStart(startOfUtcWeek(today));
    setSelectedDate(dateKey(today));
  }

  if (bookingsQuery.isPending || customersQuery.isPending)
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
        Loading bookings…
      </div>
    );
  if (bookingsQuery.isError || customersQuery.isError)
    return (
      <div className="text-destructive flex h-full items-center justify-center text-sm">
        Unable to load bookings.
      </div>
    );

  return (
    <>
      <div className="bg-background flex h-full min-h-0 flex-col">
        <header className="border-border/60 bg-card flex min-h-[56px] shrink-0 flex-wrap items-center gap-2 border-b px-4 py-2 sm:px-5">
          <h1 className="mr-2 text-base font-semibold">Bookings</h1>
          <span className="bg-border/60 mr-1 hidden h-5 w-px sm:block" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="bg-card" onClick={goToToday}>
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Previous week"
              onClick={() => shiftWeek(-7)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Next week"
              onClick={() => shiftWeek(7)}
            >
              <ChevronRight />
            </Button>
            <span className="ml-1 hidden text-sm font-medium text-zinc-600 sm:inline">
              {weekRangeLabel(weekStart)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="bg-secondary flex rounded-lg p-1">
              {(["week", "agenda"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => router.replace(`/bookings?view=${option}`, { scroll: false })}
                  className={cn(
                    "text-muted-foreground rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    view === option && "bg-card text-foreground shadow-sm"
                  )}
                  aria-pressed={view === option}
                >
                  {option === "week" ? "Week" : "Agenda"}
                </button>
              ))}
            </div>
            <Button
              className="h-8 px-3"
              onClick={() => {
                setEditing(undefined);
                setDialogOpen(true);
              }}
              disabled={!customers.length}
            >
              <Plus /> <span className="hidden sm:inline">New booking</span>
            </Button>
          </div>
        </header>

        {view === "week" ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="border-border/60 flex max-h-[46%] shrink-0 flex-col border-b bg-zinc-50/70 lg:max-h-none lg:w-[324px] lg:border-r lg:border-b-0">
              <div className="border-border/50 shrink-0 border-b px-4 py-4 sm:px-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">
                    {weekStart.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </h2>
                  <span className="label-caps text-muted-foreground">Week</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {weekDates.map((date) => {
                    const key = dateKey(date);
                    const selected = key === selectedDate;
                    const count = bookings.filter(
                      (booking) => businessDateKey(booking.scheduledAt) === key
                    ).length;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(key)}
                        className={cn(
                          "hover:bg-secondary flex min-h-14 flex-col items-center justify-center rounded-lg py-1.5 transition-colors",
                          selected && "bg-primary text-primary-foreground hover:bg-primary"
                        )}
                        aria-label={`Select ${date.toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          timeZone: "UTC",
                        })}`}
                        aria-pressed={selected}
                      >
                        <span
                          className={cn(
                            "text-muted-foreground text-[9px]",
                            selected && "text-primary-foreground/70"
                          )}
                        >
                          {date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                        </span>
                        <span className="mt-0.5 text-sm leading-4 font-semibold">
                          {date.getUTCDate()}
                        </span>
                        <span className="mt-1 flex h-1 gap-0.5">
                          {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                            <span
                              key={index}
                              className={cn(
                                "bg-primary size-1 rounded-full",
                                selected && "bg-primary-foreground/60"
                              )}
                            />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <div className="px-4 py-4 sm:px-5">
                  <p className="label-caps text-muted-foreground mb-3">
                    {selectedBookings.length}{" "}
                    {selectedBookings.length === 1 ? "booking" : "bookings"} ·{" "}
                    {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </p>
                  <div className="space-y-2">
                    {selectedBookings.map((booking) => {
                      const date = displayDate(booking);
                      return (
                        <button
                          key={booking.id}
                          type="button"
                          onClick={() => setSelectedBookingId(booking.id)}
                          className="group w-full rounded-lg bg-white p-3 text-left transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
                          aria-label={`Open ${booking.service} booking for ${booking.customer.name}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold">
                                  {booking.customer.name}
                                </h3>
                                <StatusBadge status={statusLabels[booking.status]} />
                              </div>
                              <p className="mt-1 text-xs font-medium text-zinc-700">
                                {booking.service}
                              </p>
                            </div>
                            <ChevronRight className="size-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                          </div>
                          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-2 text-xs">
                            <span>{date.time}</span>
                            <span aria-hidden="true">·</span>
                            <span>{durationLabel(booking.durationMinutes)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{booking.staff}</span>
                          </div>
                        </button>
                      );
                    })}
                    {selectedBookings.length === 0 ? (
                      <p className="text-muted-foreground rounded-lg bg-white/70 px-4 py-8 text-center text-sm">
                        No bookings this day.
                      </p>
                    ) : null}
                  </div>
                </div>
              </ScrollArea>
            </aside>

            <ScrollArea className="min-h-0 flex-1">
              <div className="px-5 py-6 sm:px-8 lg:px-8">
                <div className="max-w-[760px]">
                  <h2 className="text-base font-semibold">Upcoming bookings</h2>
                  <p className="text-muted-foreground mt-1 text-sm">
                    All scheduled and pending appointments
                  </p>
                  <div className="border-border/70 mt-6 divide-y divide-zinc-100 overflow-hidden rounded-xl border bg-white shadow-sm shadow-zinc-950/[0.025]">
                    {upcomingBookings.map((booking) => (
                      <BookingRow
                        key={booking.id}
                        booking={booking}
                        onOpen={(item) => setSelectedBookingId(item.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : (
          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto max-w-[900px] px-5 py-7 sm:px-8">
              <h2 className="text-base font-semibold">All bookings</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                A complete agenda of scheduled appointments
              </p>
              <div className="border-border/70 mt-6 divide-y divide-zinc-100 overflow-hidden rounded-xl border bg-white shadow-sm shadow-zinc-950/[0.025]">
                {sortedBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onOpen={(item) => setSelectedBookingId(item.id)}
                  />
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
      {dialogOpen ? (
        <NewBookingDialog
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(undefined);
          }}
          customers={customers}
          booking={editing}
        />
      ) : null}
      {selectedBooking ? (
        <BookingDetailsDialog
          key={selectedBooking.id}
          booking={selectedBooking}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedBookingId(undefined);
              router.replace(`/bookings?view=${view}`, { scroll: false });
            }
          }}
        />
      ) : null}
    </>
  );
}
