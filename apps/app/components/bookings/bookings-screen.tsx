"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";

import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type Booking } from "@/lib/api";
import {
  bookingsQueryOptions,
  customersQueryOptions,
  errorMessage,
  queryKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const statusLabels = {
  confirmed: "Confirmed",
  needs_approval: "Needs approval",
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
  const date = bookingDate(booking);
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    month: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
    day: date.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
    time: date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
    }),
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

function BookingActions({
  booking,
  onEdit,
  onRemove,
  deleting,
}: {
  booking: Booking;
  onEdit: (booking: Booking) => void;
  onRemove: (booking: Booking) => void;
  deleting: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-foreground"
        aria-label={`Edit ${booking.service} booking`}
        onClick={() => onEdit(booking)}
      >
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-muted-foreground hover:text-destructive"
        aria-label={`Delete ${booking.service} booking`}
        onClick={() => onRemove(booking)}
        disabled={deleting}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function BookingRow({
  booking,
  onEdit,
  onRemove,
  deleting,
}: {
  booking: Booking;
  onEdit: (booking: Booking) => void;
  onRemove: (booking: Booking) => void;
  deleting: boolean;
}) {
  const date = displayDate(booking);

  return (
    <article className="group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-4 transition-colors hover:border-zinc-300 sm:gap-5 sm:px-5">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-secondary px-1 py-2 text-center">
        <span className="font-mono text-[9px] font-medium text-muted-foreground">{date.month}</span>
        <span className="text-lg leading-5 font-semibold text-foreground">{date.day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="truncate text-sm font-semibold">{booking.customer.name}</h3>
          <StatusBadge status={statusLabels[booking.status]} />
        </div>
        <p className="mt-1 truncate text-sm font-medium text-zinc-700">{booking.service}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <span>{date.time}</span>
          <span aria-hidden="true">·</span>
          <span>{durationLabel(booking.durationMinutes)}</span>
          <span aria-hidden="true">·</span>
          <span>{booking.staff}</span>
        </div>
        <p className="mt-1.5 hidden truncate text-xs text-muted-foreground/80 sm:block">
          {booking.serviceAddress}
        </p>
      </div>
      <BookingActions
        booking={booking}
        onEdit={onEdit}
        onRemove={onRemove}
        deleting={deleting}
      />
    </article>
  );
}

export function BookingsScreen({ view }: { view: "week" | "agenda" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const bookingsQuery = useQuery(bookingsQueryOptions);
  const customersQuery = useQuery(customersQueryOptions);
  const bookings = bookingsQuery.data ?? emptyBookings;
  const customers = customersQuery.data ?? [];
  const today = useMemo(() => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }, []);
  const [weekStart, setWeekStart] = useState(() => startOfUtcWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Booking>();
  const deleteMutation = useMutation({
    mutationFn: api.bookings.destroy,
    onSuccess: (_, deletedId) => {
      queryClient.setQueryData<Booking[]>(queryKeys.bookings, (current = []) =>
        current.filter((booking) => booking.id !== deletedId)
      );
    },
  });

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addUtcDays(weekStart, index)),
    [weekStart]
  );
  const sortedBookings = useMemo(
    () => [...bookings].sort((a, b) => bookingDate(a).getTime() - bookingDate(b).getTime()),
    [bookings]
  );
  const selectedBookings = sortedBookings.filter(
    (booking) => dateKey(bookingDate(booking)) === selectedDate
  );
  const upcomingBookings = sortedBookings.filter((booking) => booking.status !== "completed");

  function removeBooking(booking: Booking) {
    if (!window.confirm(`Delete the ${booking.service} booking for ${booking.customer.name}?`))
      return;
    deleteMutation.mutate(booking.id);
  }

  function editBooking(booking: Booking) {
    setEditing(booking);
    setDialogOpen(true);
  }

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
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading bookings…
      </div>
    );
  if (bookingsQuery.isError || customersQuery.isError)
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Unable to load bookings.
      </div>
    );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-background">
        <header className="flex min-h-[52px] shrink-0 flex-wrap items-center gap-2 border-b border-border bg-card px-4 py-2 sm:px-5">
          <h1 className="sr-only">Bookings</h1>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="bg-card" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Previous week" onClick={() => shiftWeek(-7)}>
              <ChevronLeft />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next week" onClick={() => shiftWeek(7)}>
              <ChevronRight />
            </Button>
            <span className="ml-1 hidden text-sm font-medium text-zinc-600 sm:inline">
              {weekRangeLabel(weekStart)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex rounded-lg bg-secondary p-1">
              {(["week", "agenda"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => router.replace(`/bookings?view=${option}`, { scroll: false })}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium text-muted-foreground transition-colors",
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

        {deleteMutation.isError ? (
          <p className="mx-5 mt-4 text-sm text-destructive" role="alert">
            {errorMessage(deleteMutation.error, "Unable to delete this booking.")}
          </p>
        ) : null}

        {view === "week" ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <aside className="flex max-h-[46%] shrink-0 flex-col border-b border-border bg-card lg:max-h-none lg:w-[324px] lg:border-r lg:border-b-0">
              <div className="shrink-0 border-b border-border px-4 py-4 sm:px-5">
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
                      (booking) => dateKey(bookingDate(booking)) === key
                    ).length;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDate(key)}
                        className={cn(
                          "flex min-h-14 flex-col items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-secondary",
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
                            "text-[9px] text-muted-foreground",
                            selected && "text-primary-foreground/70"
                          )}
                        >
                          {date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
                        </span>
                        <span className="mt-0.5 text-sm leading-4 font-semibold">{date.getUTCDate()}</span>
                        <span className="mt-1 flex h-1 gap-0.5">
                          {Array.from({ length: Math.min(count, 3) }, (_, index) => (
                            <span
                              key={index}
                              className={cn(
                                "size-1 rounded-full bg-primary",
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
                  <p className="label-caps mb-3 text-muted-foreground">
                    {selectedBookings.length} {selectedBookings.length === 1 ? "booking" : "bookings"} · {new Date(`${selectedDate}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </p>
                  <div className="space-y-2">
                    {selectedBookings.map((booking) => {
                      const date = displayDate(booking);
                      return (
                        <article key={booking.id} className="rounded-lg border border-border bg-secondary/80 p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-sm font-semibold">{booking.customer.name}</h3>
                                <StatusBadge status={statusLabels[booking.status]} />
                              </div>
                              <p className="mt-1 text-xs font-medium text-zinc-700">{booking.service}</p>
                            </div>
                            <BookingActions
                              booking={booking}
                              onEdit={editBooking}
                              onRemove={removeBooking}
                              deleting={deleteMutation.isPending && deleteMutation.variables === booking.id}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span>{date.time}</span>
                            <span aria-hidden="true">·</span>
                            <span>{durationLabel(booking.durationMinutes)}</span>
                            <span aria-hidden="true">·</span>
                            <span>{booking.staff}</span>
                          </div>
                        </article>
                      );
                    })}
                    {selectedBookings.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
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
                  <p className="mt-1 text-sm text-muted-foreground">
                    All scheduled and pending appointments
                  </p>
                  <div className="mt-6 space-y-3">
                    {upcomingBookings.map((booking) => (
                      <BookingRow
                        key={booking.id}
                        booking={booking}
                        onEdit={editBooking}
                        onRemove={removeBooking}
                        deleting={deleteMutation.isPending && deleteMutation.variables === booking.id}
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
              <p className="mt-1 text-sm text-muted-foreground">
                A complete agenda of scheduled appointments
              </p>
              <div className="mt-6 space-y-3">
                {sortedBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onEdit={editBooking}
                    onRemove={removeBooking}
                    deleting={deleteMutation.isPending && deleteMutation.variables === booking.id}
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
    </>
  );
}
