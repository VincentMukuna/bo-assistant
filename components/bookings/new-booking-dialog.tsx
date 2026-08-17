"use client";

import { useState } from "react";

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
import {
  customers,
  weekDays,
  type Booking,
  type Customer,
} from "@/lib/demo-data";

export function NewBookingDialog({
  open,
  onOpenChange,
  customer,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onCreate: (booking: Booking) => void;
}) {
  const [customerId, setCustomerId] = useState(customer?.id ?? "c1");
  const [service, setService] = useState("Standard home clean");
  const [day, setDay] = useState("Wed");
  const [time, setTime] = useState("1:30 PM");
  const [staff, setStaff] = useState("Jamie");

  const effectiveCustomerId = customer?.id ?? customerId;

  function createBooking() {
    const selectedCustomer = customers.find((item) => item.id === effectiveCustomerId) ?? customers[0];
    const dateMap: Record<string, string> = { Mon: "Aug 17", Tue: "Aug 18", Wed: "Aug 19", Thu: "Aug 20", Fri: "Aug 21" };
    onCreate({
      id: `b-${Date.now()}`,
      customerId: selectedCustomer.id,
      customer: selectedCustomer.name,
      service,
      staff,
      day,
      date: dateMap[day],
      time,
      duration: "2h",
      status: "Confirmed",
      address: selectedCustomer.address.split(",")[0],
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>New booking</DialogTitle>
          <DialogDescription>Add an appointment to this week’s schedule.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium">Customer
            <Select value={effectiveCustomerId} onValueChange={setCustomerId} disabled={Boolean(customer)}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{customers.map((item) => <SelectItem value={item.id} key={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">Service
            <Select value={service} onValueChange={setService}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Standard home clean">Standard home clean</SelectItem><SelectItem value="Deep home clean">Deep home clean</SelectItem><SelectItem value="Minor repair">Minor repair</SelectItem><SelectItem value="Plumbing visit">Plumbing visit</SelectItem></SelectContent></Select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-2 text-sm font-medium">Day
              <Select value={day} onValueChange={setDay}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{weekDays.map((item) => <SelectItem value={item.day} key={item.day}>{item.day}, Aug {item.date}</SelectItem>)}</SelectContent></Select>
            </label>
            <label className="grid gap-2 text-sm font-medium">Time<Input value={time} onChange={(event) => setTime(event.target.value)} /></label>
          </div>
          <label className="grid gap-2 text-sm font-medium">Assigned staff
            <Select value={staff} onValueChange={setStaff}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Jamie">Jamie</SelectItem><SelectItem value="Noah">Noah</SelectItem><SelectItem value="Eli">Eli</SelectItem><SelectItem value="Jamie + Rosa">Jamie + Rosa</SelectItem></SelectContent></Select>
          </label>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={createBooking}>Create booking</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

