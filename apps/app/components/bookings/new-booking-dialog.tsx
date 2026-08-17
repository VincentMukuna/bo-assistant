"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { weekDays } from "@/lib/demo-data";
import { api, type Booking, type BookingInput, type BookingStatus, type Customer } from "@/lib/api";
import { errorMessage, queryKeys } from "@/lib/queries";

const dateByDay: Record<string, string> = {
  Mon: "2026-08-17",
  Tue: "2026-08-18",
  Wed: "2026-08-19",
  Thu: "2026-08-20",
  Fri: "2026-08-21",
};

function to24Hour(time: string) {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time;
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function bookingDefaults(booking?: Booking) {
  if (!booking) return { day: "Wed", time: "1:30 PM" };
  const date = new Date(booking.scheduledAt);
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getUTCDay()],
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
  };
}

export function NewBookingDialog({
  onOpenChange,
  customers,
  customer,
  booking,
}: {
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  customer?: Customer;
  booking?: Booking;
}) {
  const queryClient = useQueryClient();
  const defaults = bookingDefaults(booking);
  const [customerId, setCustomerId] = useState(
    String(customer?.id ?? booking?.customerId ?? customers[0]?.id ?? "")
  );
  const [service, setService] = useState(booking?.service ?? "Standard home clean");
  const [day, setDay] = useState(defaults.day);
  const [time, setTime] = useState(defaults.time);
  const [staff, setStaff] = useState(booking?.staff ?? "Jamie");
  const [durationMinutes, setDurationMinutes] = useState(String(booking?.durationMinutes ?? 120));
  const [status, setStatus] = useState<BookingStatus>(booking?.status ?? "confirmed");
  const saveMutation = useMutation({
    mutationFn: (input: BookingInput) =>
      booking ? api.bookings.update(booking.id, input) : api.bookings.store(input),
    onSuccess: (savedBooking) => {
      queryClient.setQueryData<Booking[]>(queryKeys.bookings, (current = []) =>
        [...current.filter((item) => item.id !== savedBooking.id), savedBooking].sort((a, b) =>
          a.scheduledAt.localeCompare(b.scheduledAt)
        )
      );
      onOpenChange(false);
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedCustomer = customers.find((item) => item.id === Number(customerId));
    if (!selectedCustomer) return;

    saveMutation.mutate({
      customerId: selectedCustomer.id,
      service,
      staff,
      scheduledAt: `${dateByDay[day]}T${to24Hour(time)}:00.000Z`,
      durationMinutes: Number(durationMinutes),
      status,
      serviceAddress: selectedCustomer.address,
    });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{booking ? "Edit booking" : "New booking"}</DialogTitle>
            <DialogDescription>
              {booking ? "Update this appointment." : "Add an appointment to this week’s schedule."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <label className="grid gap-2 text-sm font-medium">
              Customer
              <Select value={customerId} onValueChange={setCustomerId} disabled={Boolean(customer)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((item) => (
                    <SelectItem value={String(item.id)} key={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Service
              <Select value={service} onValueChange={setService}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard home clean">Standard home clean</SelectItem>
                  <SelectItem value="Deep home clean">Deep home clean</SelectItem>
                  <SelectItem value="Minor repair">Minor repair</SelectItem>
                  <SelectItem value="Plumbing visit">Plumbing visit</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Day
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weekDays.map((item) => (
                      <SelectItem value={item.day} key={item.day}>
                        {item.day}, Aug {item.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Time
                <Input value={time} onChange={(event) => setTime(event.target.value)} required />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Assigned staff
                <Select value={staff} onValueChange={setStaff}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Jamie">Jamie</SelectItem>
                    <SelectItem value="Noah">Noah</SelectItem>
                    <SelectItem value="Eli">Eli</SelectItem>
                    <SelectItem value="Jamie + Rosa">Jamie + Rosa</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Duration
                <Select value={durationMinutes} onValueChange={setDurationMinutes}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Status
              <Select value={status} onValueChange={(value) => setStatus(value as BookingStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="needs_approval">Needs approval</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {saveMutation.isError ? (
              <p className="text-sm text-red-600" role="alert">
                {errorMessage(saveMutation.error, "Unable to save this booking.")}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !customers.length}>
              {saveMutation.isPending ? "Saving…" : "Save booking"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
