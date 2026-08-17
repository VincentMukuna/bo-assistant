"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Wrench,
} from "lucide-react";

import { NewBookingDialog } from "@/components/bookings/new-booking-dialog";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type Booking, type BookingInput, type Customer, type CustomerInput } from "@/lib/api";
import { conversations } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const statusLabels = {
  confirmed: "Confirmed",
  needs_approval: "Needs approval",
  in_progress: "In progress",
  completed: "Completed",
} as const;

function formatBookingDate(booking: Booking) {
  const date = new Date(booking.scheduledAt);
  return {
    day: date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
    date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }),
  };
}

function customerSince(customer: Customer) {
  return `Customer since ${new Date(customer.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

export function CustomersScreen({ selectedId }: { selectedId?: number }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer>();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingCustomer, setBookingCustomer] = useState<Customer>();

  useEffect(() => {
    Promise.all([api.customers.index(), api.bookings.index()])
      .then(([customerRecords, bookingRecords]) => {
        setCustomers(customerRecords);
        setBookings(bookingRecords);
        if (!selectedId && customerRecords[0])
          router.replace(`/customers/${customerRecords[0].id}`);
      })
      .catch(() => setError("Unable to load customers."))
      .finally(() => setLoading(false));
  }, [router, selectedId]);

  const selected = customers.find((customer) => customer.id === selectedId) ?? customers[0];
  const filtered = useMemo(
    () =>
      customers.filter((customer) =>
        `${customer.name} ${customer.email} ${customer.phone}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [customers, search]
  );
  const customerBookings = selected
    ? bookings.filter((booking) => booking.customerId === selected.id)
    : [];
  const customerConversation = selected
    ? conversations.find((conversation) => conversation.customerId === `c${selected.id}`)
    : undefined;

  async function saveCustomer(input: CustomerInput) {
    if (editingCustomer) {
      const updated = await api.customers.update(editingCustomer.id, input);
      setCustomers((current) =>
        current.map((customer) => (customer.id === updated.id ? updated : customer))
      );
      return;
    }
    const created = await api.customers.store(input);
    setCustomers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    router.push(`/customers/${created.id}`);
  }

  async function removeCustomer() {
    if (!selected || !window.confirm(`Delete ${selected.name} and their bookings?`)) return;
    await api.customers.destroy(selected.id);
    const remaining = customers.filter((customer) => customer.id !== selected.id);
    setCustomers(remaining);
    setBookings((current) => current.filter((booking) => booking.customerId !== selected.id));
    router.replace(remaining[0] ? `/customers/${remaining[0].id}` : "/customers");
  }

  async function saveBooking(input: BookingInput) {
    const created = await api.bookings.store(input);
    setBookings((current) =>
      [...current, created].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    );
  }

  if (loading)
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading customers…
      </div>
    );
  if (error)
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">{error}</div>
    );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-zinc-50/50">
        <h1 className="sr-only">Customers</h1>
        <div className="grid min-h-0 flex-1 md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
            <div className="flex gap-2 p-4 pb-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find a customer"
                  className="h-9 bg-zinc-50 pl-9 shadow-none"
                />
              </div>
              <Button
                size="icon"
                aria-label="Add customer"
                onClick={() => {
                  setEditingCustomer(undefined);
                  setCustomerDialogOpen(true);
                }}
              >
                <Plus />
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-2">
                {filtered.map((customer) => (
                  <Link
                    href={`/customers/${customer.id}`}
                    key={customer.id}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-zinc-50",
                      selected?.id === customer.id && "bg-zinc-100 hover:bg-zinc-100"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-white text-xs ring-1 ring-zinc-200">
                        {customer.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{customer.name}</div>
                      <div className="mt-0.5 truncate text-xs text-zinc-600">{customer.phone}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </ScrollArea>
          </div>
          <ScrollArea className="min-h-0">
            {selected ? (
              <div className="mx-auto max-w-4xl p-5 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="size-14">
                    <AvatarFallback className="bg-white text-base font-medium ring-1 ring-zinc-200">
                      {selected.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold tracking-[-0.02em]">{selected.name}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{customerSince(selected)}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Edit customer"
                    onClick={() => {
                      setEditingCustomer(selected);
                      setCustomerDialogOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Delete customer"
                    onClick={() => void removeCustomer()}
                  >
                    <Trash2 />
                  </Button>
                  <Button
                    onClick={() => {
                      setBookingCustomer(selected);
                      setBookingDialogOpen(true);
                    }}
                  >
                    <Plus /> Book service
                  </Button>
                </div>
                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                  <section className="rounded-xl border border-zinc-200 bg-white p-5">
                    <h3 className="text-sm font-semibold">Contact details</h3>
                    <div className="mt-5 space-y-4 text-sm">
                      <div className="flex gap-3">
                        <Phone className="mt-0.5 size-4 text-zinc-400" />
                        <div>
                          <div>{selected.phone}</div>
                          <div className="text-muted-foreground mt-1 text-xs">Mobile</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <MessageSquare className="mt-0.5 size-4 text-zinc-400" />
                        <div className="break-all">
                          <div>{selected.email}</div>
                          <div className="text-muted-foreground mt-1 text-xs">Email</div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Wrench className="mt-0.5 size-4 text-zinc-400" />
                        <div>
                          <div>{selected.address}</div>
                          <div className="text-muted-foreground mt-1 text-xs">Service address</div>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="rounded-xl border border-zinc-200 bg-white p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Notes</h3>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit customer notes"
                        onClick={() => {
                          setEditingCustomer(selected);
                          setCustomerDialogOpen(true);
                        }}
                      >
                        <Pencil />
                      </Button>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-zinc-600">
                      {selected.notes || "No notes yet."}
                    </p>
                  </section>
                </div>
                <section className="mt-5 rounded-xl border border-zinc-200 bg-white">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
                    <h3 className="text-sm font-semibold">Bookings</h3>
                    <span className="text-muted-foreground text-xs">
                      {customerBookings.length} total
                    </span>
                  </div>
                  {customerBookings.length ? (
                    customerBookings.map((booking, index) => {
                      const date = formatBookingDate(booking);
                      return (
                        <div
                          key={booking.id}
                          className={cn(
                            "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center",
                            index !== 0 && "border-t border-zinc-200"
                          )}
                        >
                          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-100">
                            <CalendarDays className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{booking.service}</div>
                            <div className="text-muted-foreground mt-1 text-xs">
                              {date.day}, {date.date} · {date.time} · {booking.staff}
                            </div>
                          </div>
                          <StatusBadge status={statusLabels[booking.status]} />
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-muted-foreground px-5 py-10 text-center text-sm">
                      No bookings yet.
                    </div>
                  )}
                </section>
                <section className="mt-5 rounded-xl border border-zinc-200 bg-white p-5">
                  <h3 className="text-sm font-semibold">Recent conversation</h3>
                  {customerConversation ? (
                    <div className="mt-4 flex gap-3 rounded-lg bg-zinc-50 p-4">
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                      <div>
                        <div className="text-sm leading-6">{customerConversation.preview}</div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {customerConversation.channel} · {customerConversation.time} ago
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-4 text-sm">No recent conversation.</p>
                  )}
                </section>
              </div>
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                Add your first customer to get started.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
      {customerDialogOpen ? (
        <CustomerDialog
          onOpenChange={setCustomerDialogOpen}
          customer={editingCustomer}
          onSave={saveCustomer}
        />
      ) : null}
      {bookingDialogOpen ? (
        <NewBookingDialog
          onOpenChange={(open) => {
            setBookingDialogOpen(open);
            if (!open) setBookingCustomer(undefined);
          }}
          customers={customers}
          customer={bookingCustomer}
          onSave={saveBooking}
        />
      ) : null}
    </>
  );
}
