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
import { Textarea } from "@/components/ui/textarea";
import { ApiError, type Customer, type CustomerInput } from "@/lib/api";

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
  onSave,
}: {
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSave: (input: CustomerInput) => Promise<void>;
}) {
  const [form, setForm] = useState<CustomerInput>(
    customer
      ? {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          notes: customer.notes,
        }
      : emptyCustomer,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof CustomerInput>(key: K, value: CustomerInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onOpenChange(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Unable to save this customer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{customer ? "Edit customer" : "New customer"}</DialogTitle>
            <DialogDescription>{customer ? "Update this customer’s CRM record." : "Add a customer to the CRM."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-5 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">Name<Input value={form.name} onChange={(event) => set("name", event.target.value)} required /></label>
            <label className="grid gap-2 text-sm font-medium">Email<Input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} required /></label>
            <label className="grid gap-2 text-sm font-medium">Phone<Input value={form.phone} onChange={(event) => set("phone", event.target.value)} required /></label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">Service address<Input value={form.address} onChange={(event) => set("address", event.target.value)} required /></label>
            <label className="grid gap-2 text-sm font-medium sm:col-span-2">Notes<Textarea value={form.notes} onChange={(event) => set("notes", event.target.value)} rows={4} /></label>
            {error ? <p className="text-sm text-red-600 sm:col-span-2" role="alert">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save customer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
