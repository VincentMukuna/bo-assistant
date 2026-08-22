"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { api, type Booking, type Customer, type CustomerInput } from "@/lib/api";
import { errorMessage, queryKeys } from "@/lib/queries";

const emptyCustomer: CustomerInput = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export function CustomerDialog({
  onOpenChange,
  customer,
}: {
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CustomerInput>(
    customer
      ? {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
        }
      : emptyCustomer
  );
  const saveMutation = useMutation({
    mutationFn: (input: CustomerInput) =>
      customer ? api.customers.update(customer.id, input) : api.customers.store(input),
    onSuccess: (savedCustomer) => {
      queryClient.setQueryData<Customer[]>(queryKeys.customers, (current = []) =>
        [...current.filter((item) => item.id !== savedCustomer.id), savedCustomer].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      queryClient.setQueryData<Booking[]>(queryKeys.bookings, (current) =>
        current?.map((booking) =>
          booking.customerId === savedCustomer.id
            ? { ...booking, customer: savedCustomer }
            : booking
        )
      );
      onOpenChange(false);
      if (!customer) router.push(`/customers/${savedCustomer.id}`);
    },
  });

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
            <DialogDescription>
              {customer
                ? "Update this customer’s contact details and notes."
                : "Save their contact details and notes."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Name
              <Input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Email
              <Input
                type="email"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Phone
              <Input
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Service address
              <Input
                value={form.address}
                onChange={(event) => set("address", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">
              Notes
              <Textarea
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                rows={4}
              />
            </label>
            {saveMutation.isError ? (
              <p className="text-sm text-red-600 sm:col-span-2" role="alert">
                {errorMessage(saveMutation.error, "Unable to save this customer.")}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
