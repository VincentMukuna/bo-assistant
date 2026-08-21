"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  CalendarDays,
  Check,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { AskOakWorkspace } from "@/components/operations/ask-oak-panel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api, type InboxAttention, type InboxConversationSummary } from "@/lib/api";
import { errorMessage, inboxQueryOptions, queryKeys } from "@/lib/queries";
import { useInboxEvents } from "@/lib/use-inbox-events";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
};

const navItems: NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
];

function Brand() {
  return (
    <Link
      href="/overview"
      className="focus-visible:ring-ring flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2"
      aria-label="Oak and Pine home"
    >
      <span className="bg-primary text-primary-foreground grid size-6 grid-cols-2 gap-[3px] rounded-[6px] p-[5px]">
        <span className="rounded-[1px] bg-current opacity-95" />
        <span className="rounded-[1px] bg-current opacity-50" />
        <span className="rounded-[1px] bg-current opacity-50" />
        <span className="rounded-[1px] bg-current opacity-95" />
      </span>
      <span className="text-sm font-semibold tracking-[-0.015em]">Oak &amp; Pine Ops</span>
    </Link>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href.startsWith("/customers")) return pathname.startsWith("/customers");
  return pathname === href;
}

function NavCount({ count }: { count?: number }) {
  return count ? (
    <span className="bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full font-mono text-[9px] font-medium">
      {count}
    </span>
  ) : null;
}

function DesktopNavigation({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
      {navItems.map((item) => {
        const selected = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "hover:bg-secondary/70 hover:text-foreground flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-zinc-500 transition-colors",
              selected && "bg-secondary text-foreground font-semibold"
            )}
            aria-current={selected ? "page" : undefined}
          >
            {item.label}
            <NavCount count={item.count} />
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNavigation({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-border border-b px-5 py-[13px]">
        <Brand />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "hover:bg-secondary hover:text-foreground flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors",
                selected && "bg-secondary text-foreground"
              )}
              aria-current={selected ? "page" : undefined}
            >
              <Icon className="size-4" strokeWidth={1.8} />
              <span>{item.label}</span>
              <span className="ml-auto">
                <NavCount count={item.count} />
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-border text-muted-foreground border-t p-4 text-xs">
        <div className="bg-secondary/70 flex items-center gap-2 rounded-lg px-3 py-2.5">
          <span className="bg-primary size-1.5 rounded-full" />
          Open until 6:00 PM
        </div>
      </div>
    </div>
  );
}

function AccountMenu() {
  const { user, logout, loggingOut, logoutError } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring rounded-full transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-offset-2"
          aria-label="Open account menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-secondary text-muted-foreground text-[11px] font-semibold">
              {user?.initials ?? "KL"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="text-foreground block truncate text-sm font-semibold">
            {user?.fullName ?? "Oak & Pine"}
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate font-normal">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="px-2 py-2">
          <Link href="/agent-activity">
            <Activity className="size-4" />
            Agent activity
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="px-2 py-2" disabled={loggingOut} onSelect={() => logout()}>
          <LogOut className="size-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
        {logoutError ? (
          <p className="text-destructive px-2 py-1 text-xs" role="alert">
            Unable to sign out. Please try again.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function notificationTime(value: unknown) {
  if (typeof value !== "string") return "Time unavailable";
  return new Date(value).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function BookingNotifications() {
  const queryClient = useQueryClient();
  const inboxQuery = useQuery(inboxQueryOptions);
  const notifications = (inboxQuery.data ?? []).flatMap((conversation) =>
    conversation.bookingNotifications.map((attention) => ({ conversation, attention }))
  );
  const confirmMutation = useMutation({
    mutationFn: ({
      conversation,
      attention,
    }: {
      conversation: InboxConversationSummary;
      attention: InboxAttention;
    }) => api.inbox.decideAttention(conversation.id, attention.id, "approve"),
    onSuccess: async (_, { conversation }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inbox }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inboxConversation(conversation.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bookings }),
      ]);
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hover:bg-secondary hover:text-foreground focus-visible:ring-ring relative flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors outline-none focus-visible:ring-2"
          aria-label={`Booking notifications${notifications.length ? `, ${notifications.length} pending` : ""}`}
        >
          <Bell className="size-4" />
          {notifications.length ? (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-amber-600 px-1 text-[9px] leading-4 font-semibold text-white">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(360px,calc(100vw-2rem))] p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block text-sm font-semibold">Booking notifications</span>
          <span className="text-muted-foreground mt-0.5 block font-normal">
            {notifications.length
              ? `${notifications.length} pending ${notifications.length === 1 ? "booking" : "bookings"}`
              : "You’re all caught up"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map(({ conversation, attention }) => {
              const confirming =
                confirmMutation.isPending &&
                confirmMutation.variables?.attention.id === attention.id;
              return (
                <div key={attention.id} className="hover:bg-secondary/60 rounded-md px-2 py-2.5">
                  <Link
                    href={`/inbox?conversation=${conversation.id}`}
                    className="focus-visible:ring-ring block rounded-sm outline-none focus-visible:ring-2"
                  >
                    <span className="text-foreground block text-sm font-medium">
                      {attention.summary}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs leading-5">
                      {String(attention.context.service ?? "Booking")} · {conversation.contact.name}
                      <br />
                      {notificationTime(attention.context.scheduledAt)}
                    </span>
                  </Link>
                  <Button
                    size="sm"
                    className="mt-2 h-7"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate({ conversation, attention })}
                  >
                    <Check className="size-3.5" />
                    {confirming
                      ? "Confirming…"
                      : attention.status === "approved"
                        ? "Retry customer notice"
                        : "Confirm booking"}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground px-2 py-5 text-center text-xs">
            New customer bookings will appear here.
          </p>
        )}
        {confirmMutation.isError ? (
          <p className="text-destructive px-2 py-2 text-xs" role="alert">
            {errorMessage(confirmMutation.error, "Unable to confirm that booking.")}
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  useInboxEvents();

  return (
    <div className="bg-background text-foreground flex h-svh min-h-[620px] flex-col overflow-hidden">
      <header className="border-border/50 bg-card flex h-[52px] shrink-0 items-center gap-4 border-b px-4 sm:px-5">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="border-border bg-card w-[280px] p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <MobileNavigation pathname={pathname} onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <Brand />
        <DesktopNavigation pathname={pathname} />
        <div className="ml-auto flex items-center gap-3">
          <div className="text-muted-foreground hidden items-center gap-2 text-xs lg:flex">
            <span className="bg-primary size-1.5 rounded-full" />
            Open until 6:00 PM
          </div>
          <BookingNotifications />
          <AccountMenu />
        </div>
      </header>
      <AskOakWorkspace key={pathname}>{children}</AskOakWorkspace>
    </div>
  );
}
