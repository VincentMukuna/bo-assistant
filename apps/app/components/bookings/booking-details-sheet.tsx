"use client";

import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Pencil,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, type Booking, type BookingInput, type BookingStatus } from "@/lib/api";
import {
  businessDateKey,
  businessLocalDateTimeToIso,
  businessTimeInputValue,
  formatBusinessDate,
  formatBusinessTime,
} from "@/lib/business-time";
import { errorMessage, queryKeys } from "@/lib/queries";

const statusLabels = {
  confirmed: "Confirmed",
  needs_approval: "Pending",
  in_progress: "In progress",
  completed: "Completed",
} as const;

type EditableField = "service" | "date" | "time" | "duration" | "staff" | "status";

function dateInputValue(value: string) {
  return businessDateKey(value);
}

function timeInputValue(value: string) {
  return businessTimeInputValue(value);
}

function longDate(value: string) {
  return formatBusinessDate(value, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timeLabel(value: string) {
  return `${formatBusinessTime(value, {
    hour: "numeric",
    minute: "2-digit",
  })} PT`;
}

function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours} hr ${remainder} min`;
}

function EditorActions({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="icon-sm"
        className="size-7"
        onClick={onSave}
        disabled={saving}
        aria-label="Save field"
      >
        <Check />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="size-7 bg-white"
        onClick={onCancel}
        disabled={saving}
        aria-label="Cancel editing"
      >
        <X />
      </Button>
    </div>
  );
}

function EditableDetail({
  icon: Icon,
  label,
  value,
  editing,
  saving,
  editor,
  onEdit,
  onSave,
  onCancel,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: ReactNode;
  editing: boolean;
  saving: boolean;
  editor: ReactNode;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <div className="rounded-lg bg-zinc-50 px-2.5 py-3">
        <div className="flex gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-500 shadow-sm">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
            <div className="mt-1.5">{editor}</div>
          </div>
          <EditorActions saving={saving} onSave={onSave} onCancel={onCancel} />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group -mx-2.5 flex w-[calc(100%+1.25rem)] gap-3 rounded-lg px-2.5 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
      aria-label={`Edit ${label.toLowerCase()}`}
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
        <div className="mt-0.5 truncate text-sm leading-5 text-zinc-800">{value}</div>
      </div>
      <Pencil className="mt-2.5 size-3.5 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}

function ReadOnlyDetail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium tracking-wide text-zinc-400 uppercase">{label}</p>
        <div className="mt-0.5 text-sm leading-5 text-zinc-800">{children}</div>
      </div>
    </div>
  );
}

export function BookingDetailsDialog({
  booking,
  onOpenChange,
}: {
  booking: Booking;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [activeField, setActiveField] = useState<EditableField>();
  const [draft, setDraft] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (input: Partial<BookingInput>) => api.bookings.update(booking.id, input),
    onSuccess: (savedBooking) => {
      queryClient.setQueryData<Booking[]>(queryKeys.bookings, (current = []) =>
        [...current.filter((item) => item.id !== savedBooking.id), savedBooking].sort((a, b) =>
          a.scheduledAt.localeCompare(b.scheduledAt)
        )
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.ownerBrief });
      setActiveField(undefined);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => api.bookings.destroy(booking.id),
    onSuccess: () => {
      queryClient.setQueryData<Booking[]>(queryKeys.bookings, (current = []) =>
        current.filter((item) => item.id !== booking.id)
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.ownerBrief });
      onOpenChange(false);
    },
  });

  function beginEditing(field: EditableField) {
    updateMutation.reset();
    setActiveField(field);
    if (field === "service") setDraft(booking.service);
    else if (field === "date") setDraft(dateInputValue(booking.scheduledAt));
    else if (field === "time") setDraft(timeInputValue(booking.scheduledAt));
    else if (field === "duration") setDraft(String(booking.durationMinutes));
    else if (field === "staff") setDraft(booking.staff);
    else setDraft(booking.status);
  }

  function cancelEditing() {
    updateMutation.reset();
    setActiveField(undefined);
  }

  function saveField() {
    if (!activeField) return;

    if (activeField === "service") updateMutation.mutate({ service: draft.trim() });
    else if (activeField === "date") {
      updateMutation.mutate({
        scheduledAt: businessLocalDateTimeToIso(draft, timeInputValue(booking.scheduledAt)),
      });
    } else if (activeField === "time") {
      updateMutation.mutate({
        scheduledAt: businessLocalDateTimeToIso(dateInputValue(booking.scheduledAt), draft),
      });
    } else if (activeField === "duration") {
      updateMutation.mutate({ durationMinutes: Number(draft) });
    } else if (activeField === "staff") updateMutation.mutate({ staff: draft });
    else updateMutation.mutate({ status: draft as BookingStatus });
  }

  function inputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveField();
    } else if (event.key === "Escape") cancelEditing();
  }

  const fieldProps = (field: EditableField) => ({
    editing: activeField === field,
    saving: activeField === field && updateMutation.isPending,
    onEdit: () => beginEditing(field),
    onSave: saveField,
    onCancel: cancelEditing,
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:!max-w-[680px]">
        <DialogHeader className="border-border/60 border-b px-5 py-5 pr-12 sm:px-6">
          <div className="flex items-center gap-2">
            <StatusBadge status={statusLabels[booking.status]} />
            <span className="text-xs text-zinc-400">Booking #{booking.id}</span>
          </div>
          <DialogTitle
            className="mt-3 text-xl font-semibold tracking-tight"
            aria-label={booking.service}
          >
            {activeField === "service" ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={inputKeyDown}
                  className="h-9 text-base font-semibold"
                  aria-label="Service"
                />
                <EditorActions
                  saving={updateMutation.isPending}
                  onSave={saveField}
                  onCancel={cancelEditing}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => beginEditing("service")}
                className="group flex max-w-full items-center gap-2 rounded-md text-left focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
                aria-label="Edit service"
              >
                <span className="truncate">{booking.service}</span>
                <Pencil className="size-3.5 shrink-0 text-zinc-300 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              </button>
            )}
          </DialogTitle>
          <DialogDescription>
            {booking.customer.name} · {longDate(booking.scheduledAt)}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0">
          <div className="grid gap-x-8 px-5 py-4 sm:grid-cols-2 sm:px-6">
            <section className="min-w-0">
              <p className="label-caps text-muted-foreground pt-1">Schedule</p>
              <div className="mt-1 space-y-0.5">
                <EditableDetail
                  icon={CalendarDays}
                  label="Date"
                  value={longDate(booking.scheduledAt)}
                  editor={
                    <Input
                      autoFocus
                      type="date"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={inputKeyDown}
                    />
                  }
                  {...fieldProps("date")}
                />
                <EditableDetail
                  icon={Clock3}
                  label="Time"
                  value={timeLabel(booking.scheduledAt)}
                  editor={
                    <Input
                      autoFocus
                      type="time"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={inputKeyDown}
                    />
                  }
                  {...fieldProps("time")}
                />
                <EditableDetail
                  icon={Clock3}
                  label="Duration"
                  value={durationLabel(booking.durationMinutes)}
                  editor={
                    <Select value={draft} onValueChange={setDraft}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="180">3 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                  {...fieldProps("duration")}
                />
                <EditableDetail
                  icon={UsersRound}
                  label="Assigned staff"
                  value={booking.staff}
                  editor={
                    <Select value={draft} onValueChange={setDraft}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jamie">Jamie</SelectItem>
                        <SelectItem value="Noah">Noah</SelectItem>
                        <SelectItem value="Eli">Eli</SelectItem>
                        <SelectItem value="Jamie + Rosa">Jamie + Rosa</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                  {...fieldProps("staff")}
                />
              </div>
            </section>

            <section className="min-w-0 border-t border-zinc-100 pt-5 sm:border-t-0 sm:pt-0">
              <p className="label-caps text-muted-foreground">Details</p>
              <div className="mt-1 space-y-0.5">
                <EditableDetail
                  icon={Check}
                  label="Status"
                  value={<StatusBadge status={statusLabels[booking.status]} />}
                  editor={
                    <Select value={draft} onValueChange={setDraft}>
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="needs_approval">Pending</SelectItem>
                        <SelectItem value="in_progress">In progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                  {...fieldProps("status")}
                />
                <ReadOnlyDetail icon={UserRound} label="Customer">
                  <span className="font-medium">{booking.customer.name}</span>
                </ReadOnlyDetail>
                <ReadOnlyDetail icon={MapPin} label="Service address">
                  {booking.serviceAddress}
                </ReadOnlyDetail>
              </div>
            </section>

            {updateMutation.isError ? (
              <p className="mt-4 text-sm text-red-600 sm:col-span-2" role="alert">
                {errorMessage(updateMutation.error, "Unable to update this booking.")}
              </p>
            ) : null}

            {confirmingDelete ? (
              <section className="mt-6 rounded-xl bg-red-50 p-4 sm:col-span-2" aria-live="polite">
                <p className="text-sm font-semibold text-red-950">Delete this booking?</p>
                <p className="mt-1 text-xs leading-5 text-red-800/80">
                  This removes it from the business calendar and cannot be undone.
                </p>
                {deleteMutation.isError ? (
                  <p className="mt-2 text-xs text-red-700" role="alert">
                    {errorMessage(deleteMutation.error, "Unable to delete this booking.")}
                  </p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete booking"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmingDelete(false)}>
                    Keep booking
                  </Button>
                </div>
              </section>
            ) : null}
          </div>
        </ScrollArea>

        <DialogFooter className="!m-0 items-center rounded-none border-t bg-zinc-50/70 px-5 py-3 sm:justify-between sm:px-6">
          <p className="hidden text-xs text-zinc-400 sm:block">
            Select a field to edit it in place.
          </p>
          <div className="flex items-center gap-2">
            {booking.status === "needs_approval" ? (
              <Button
                size="sm"
                onClick={() => updateMutation.mutate({ status: "confirmed" })}
                disabled={updateMutation.isPending}
              >
                <Check /> {updateMutation.isPending ? "Confirming…" : "Confirm booking"}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:bg-red-50 hover:text-red-700"
              onClick={() => setConfirmingDelete(true)}
              disabled={confirmingDelete || deleteMutation.isPending}
            >
              <Trash2 /> Delete booking
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
