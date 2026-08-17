"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Wrench,
} from "lucide-react";

import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  conversations,
  customers,
  initialBookings,
  type Booking,
  type Customer,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

function CustomersView({
  selectedId,
  bookings,
  onBook,
}: {
  selectedId: string;
  bookings: Booking[];
  onBook: (customer: Customer) => void;
}) {
  const [search, setSearch] = useState("");
  const selected = customers.find((customer) => customer.id === selectedId) ?? customers[0];
  const customerBookings = bookings.filter((booking) => booking.customerId === selected.id);
  const customerConversation = conversations.find((conversation) => conversation.customerId === selected.id);
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50/50">
      <h1 className="sr-only">Customers</h1>
      <div className="grid min-h-0 flex-1 md:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
          <div className="p-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a customer" className="h-9 bg-zinc-50 pl-9 shadow-none" />
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-2">
              {filtered.map((customer) => (
                <Link href={`/customers/${customer.id}`} key={customer.id} className={cn("flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-zinc-50", selected.id === customer.id && "bg-zinc-100 hover:bg-zinc-100")}>
                  <Avatar className="size-9"><AvatarFallback className="bg-white text-xs ring-1 ring-zinc-200">{customer.initials}</AvatarFallback></Avatar>
                  <div className="min-w-0"><div className="truncate text-sm font-medium">{customer.name}</div><div className="mt-0.5 truncate text-xs text-zinc-600">{customer.phone}</div></div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
        <ScrollArea className="min-h-0">
          <div className="mx-auto max-w-4xl p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar className="size-14"><AvatarFallback className="bg-white text-base font-medium ring-1 ring-zinc-200">{selected.initials}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><h2 className="text-xl font-semibold tracking-[-0.02em]">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.since}</p></div>
              <Button onClick={() => onBook(selected)}><Plus /> Book service</Button>
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <h3 className="text-sm font-semibold">Contact details</h3>
                <div className="mt-5 space-y-4 text-sm">
                  <div className="flex gap-3"><Phone className="mt-0.5 size-4 text-zinc-400" /><div><div>{selected.phone}</div><div className="mt-1 text-xs text-muted-foreground">Mobile</div></div></div>
                  <div className="flex gap-3"><MessageSquare className="mt-0.5 size-4 text-zinc-400" /><div className="break-all"><div>{selected.email}</div><div className="mt-1 text-xs text-muted-foreground">Email</div></div></div>
                  <div className="flex gap-3"><Wrench className="mt-0.5 size-4 text-zinc-400" /><div><div>{selected.address}</div><div className="mt-1 text-xs text-muted-foreground">Service address</div></div></div>
                </div>
              </section>
              <section className="rounded-xl border border-zinc-200 bg-white p-5">
                <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Notes</h3><Button variant="ghost" size="icon-sm" aria-label="Edit customer notes"><Pencil /></Button></div>
                <p className="mt-4 text-sm leading-6 text-zinc-600">{selected.note}</p>
              </section>
            </div>
            <section className="mt-5 rounded-xl border border-zinc-200 bg-white">
              <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4"><h3 className="text-sm font-semibold">Bookings</h3><span className="text-xs text-muted-foreground">{customerBookings.length} total</span></div>
              {customerBookings.length ? customerBookings.map((booking, index) => (
                <div key={booking.id} className={cn("flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center", index !== 0 && "border-t border-zinc-200")}>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100"><CalendarDays className="size-4" /></div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium">{booking.service}</div><div className="mt-1 text-xs text-muted-foreground">{booking.day}, {booking.date} · {booking.time} · {booking.staff}</div></div>
                  <StatusBadge status={booking.status} />
                </div>
              )) : <div className="px-5 py-10 text-center text-sm text-muted-foreground">No bookings yet.</div>}
            </section>
            <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="text-sm font-semibold">Recent conversation</h3>
              {customerConversation ? (
                <div className="mt-4 flex gap-3 rounded-lg bg-zinc-50 p-4">
                  <MessageSquare className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                  <div><div className="text-sm leading-6">{customerConversation.preview}</div><div className="mt-1 text-xs text-muted-foreground">{customerConversation.channel} · {customerConversation.time} ago</div></div>
                </div>
              ) : null}
            </section>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export function CustomersScreen({ selectedId }: { selectedId: string }) {
  const [bookings, setBookings] = useState(initialBookings);
  const [bookingCustomer, setBookingCustomer] = useState<Customer | undefined>();
  const [newBookingOpen, setNewBookingOpen] = useState(false);

  function startBooking(customer: Customer) {
    setBookingCustomer(customer);
    setNewBookingOpen(true);
  }

  return (
    <>
      <CustomersView
        selectedId={selectedId}
        bookings={bookings}
        onBook={startBooking}
      />
      <NewBookingDialog
        open={newBookingOpen}
        onOpenChange={(open) => {
          setNewBookingOpen(open);
          if (!open) setBookingCustomer(undefined);
        }}
        customer={bookingCustomer}
        onCreate={(booking) =>
          setBookings((current) => [...current, booking])
        }
      />
    </>
  );
}
