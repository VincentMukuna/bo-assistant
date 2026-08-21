"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { AskOakPanel } from "@/components/operations/ask-oak-panel";
import { StatusBadge } from "@/components/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type Booking, type Customer } from "@/lib/api";
import { formatBusinessDate, formatBusinessTime } from "@/lib/business-time";
import {
  bookingsQueryOptions,
  customersQueryOptions,
  errorMessage,
  inboxQueryOptions,
  queryKeys,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

const statusLabels = {
  confirmed: "Confirmed",
  needs_approval: "Pending",
  in_progress: "In progress",
  completed: "Completed",
} as const;

const emptyCustomers: Customer[] = [];
const emptyBookings: Booking[] = [];

function formatBookingDate(booking: Booking) {
  return {
    day: formatBusinessDate(booking.scheduledAt, { weekday: "short" }),
    date: formatBusinessDate(booking.scheduledAt, { month: "short", day: "numeric" }),
    time: `${formatBusinessTime(booking.scheduledAt)} PT`,
  };
}

function customerSince(customer: Customer) {
  return `Customer since ${new Date(customer.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
}

export function CustomersScreen({ selectedId }: { selectedId?: number }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const customersQuery = useQuery(customersQueryOptions);
  const bookingsQuery = useQuery(bookingsQueryOptions);
  const conversationsQuery = useQuery(inboxQueryOptions);
  const customers = customersQuery.data ?? emptyCustomers;
  const bookings = bookingsQuery.data ?? emptyBookings;
  const [search, setSearch] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer>();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [bookingCustomer, setBookingCustomer] = useState<Customer>();

  useEffect(() => {
    const firstCustomer = customersQuery.data?.[0];
    if (!selectedId && firstCustomer) router.replace(`/customers/${firstCustomer.id}`);
  }, [customersQuery.data, router, selectedId]);

  const deleteMutation = useMutation({
    mutationFn: api.customers.destroy,
    onSuccess: (_, deletedId) => {
      const remaining = (queryClient.getQueryData<Customer[]>(queryKeys.customers) ?? []).filter(
        (customer) => customer.id !== deletedId
      );
      queryClient.setQueryData(queryKeys.customers, remaining);
      queryClient.setQueryData<Booking[]>(queryKeys.bookings, (current = []) =>
        current.filter((booking) => booking.customerId !== deletedId)
      );
      router.replace(remaining[0] ? `/customers/${remaining[0].id}` : "/customers");
    },
  });

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
    ? conversationsQuery.data
        ?.filter((conversation) => conversation.contact.id === selected.id)
        .sort(
          (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
        )[0]
    : undefined;

  function removeCustomer() {
    if (!selected || !window.confirm(`Delete ${selected.name} and their bookings?`)) return;
    deleteMutation.mutate(selected.id);
  }

  if (customersQuery.isPending || bookingsQuery.isPending)
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-500">
        Loading customers…
      </div>
    );
  if (customersQuery.isError || bookingsQuery.isError)
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-600">
        Unable to load customers.
      </div>
    );

  return (
    <>
      <div className="flex h-full min-h-0 flex-col bg-white">
        <h1 className="sr-only">Customers</h1>
        {deleteMutation.isError ? (
          <p className="bg-red-50 px-5 py-2 text-sm text-red-600" role="alert">
            {errorMessage(deleteMutation.error, "Unable to delete this customer.")}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 md:grid-cols-[320px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-r border-zinc-200/60 bg-zinc-50/70">
            <div className="flex gap-2 p-4 pb-2">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find a customer"
                  className="h-9 border-zinc-200/70 bg-white pl-9 shadow-none"
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
                      "flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/70",
                      selected?.id === customer.id && "bg-white hover:bg-white"
                    )}
                  >
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-zinc-200/60 text-xs">
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
          <ScrollArea className="min-h-0 bg-white">
            {selected ? (
              <div className="mx-auto max-w-4xl p-5 sm:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Avatar className="size-14">
                    <AvatarFallback className="bg-zinc-100 text-base font-medium">
                      {selected.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold tracking-[-0.02em]">{selected.name}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{customerSince(selected)}</p>
                  </div>
                  <AskOakPanel
                    surface="customer"
                    customerId={selected.id}
                    contextLabel={selected.name}
                    suggestions={[
                      `What should I know before ${selected.name.split(/\s+/)[0]}’s next visit?`,
                      `Does anything need follow-up for ${selected.name.split(/\s+/)[0]}?`,
                      `Summarize ${selected.name.split(/\s+/)[0]}’s booking history.`,
                    ]}
                  />
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
                    onClick={removeCustomer}
                    disabled={deleteMutation.isPending}
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
                <div className="mt-8 grid gap-8 border-t border-zinc-200/60 pt-7 lg:grid-cols-2">
                  <section>
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
                  <section>
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
                <section className="mt-8 border-t border-zinc-200/60 pt-7">
                  <div className="flex items-center justify-between pb-3">
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
                            "flex flex-col gap-3 py-4 sm:flex-row sm:items-center",
                            index !== 0 && "border-t border-zinc-200/60"
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
                    <div className="text-muted-foreground py-10 text-center text-sm">
                      No bookings yet.
                    </div>
                  )}
                </section>
                <section className="mt-8 rounded-xl bg-emerald-50/50 p-5">
                  <h3 className="text-sm font-semibold">Recent conversation</h3>
                  {customerConversation ? (
                    <div className="mt-4 flex gap-3">
                      <MessageSquare className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                      <div>
                        <div className="text-sm leading-6">{customerConversation.preview}</div>
                        <div className="text-muted-foreground mt-1 text-xs">
                          Website chat ·{" "}
                          {new Date(customerConversation.updatedAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </div>
                        <Link
                          href={`/inbox?conversation=${customerConversation.id}`}
                          className="mt-3 inline-flex text-xs font-medium text-emerald-800 hover:underline"
                        >
                          Open conversation
                        </Link>
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
        <CustomerDialog onOpenChange={setCustomerDialogOpen} customer={editingCustomer} />
      ) : null}
      {bookingDialogOpen ? (
        <NewBookingDialog
          onOpenChange={(open) => {
            setBookingDialogOpen(open);
            if (!open) setBookingCustomer(undefined);
          }}
          customers={customers}
          customer={bookingCustomer}
        />
      ) : null}
    </>
  );
}
