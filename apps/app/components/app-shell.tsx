"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Activity, CalendarDays, Inbox, LogOut, Menu, Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
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
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
};

const navItems: NavItem[] = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/agent-activity", label: "Agent Activity", icon: Activity },
];

function Brand() {
  return (
    <Link
      href="/inbox"
      className="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Oak and Pine home"
    >
      <span className="grid size-6 grid-cols-2 gap-[3px] rounded-[6px] bg-primary p-[5px] text-primary-foreground">
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
    <span className="flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-medium text-primary-foreground">
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
              "flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-zinc-500 transition-colors hover:bg-secondary/70 hover:text-foreground",
              selected && "bg-secondary font-semibold text-foreground"
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
      <div className="border-b border-border px-5 py-[13px]">
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
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-secondary hover:text-foreground",
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
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 rounded-lg bg-secondary/70 px-3 py-2.5">
          <span className="size-1.5 rounded-full bg-primary" />
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
          className="rounded-full outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open account menu"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-secondary text-[11px] font-semibold text-muted-foreground">
              {user?.initials ?? "KL"}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5">
        <DropdownMenuLabel className="px-2 py-2">
          <span className="block truncate text-sm font-semibold text-foreground">
            {user?.fullName ?? "Oak & Pine owner"}
          </span>
          <span className="mt-0.5 block truncate font-normal text-muted-foreground">
            {user?.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="px-2 py-2"
          disabled={loggingOut}
          onSelect={() => logout()}
        >
          <LogOut className="size-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
        {logoutError ? (
          <p className="px-2 py-1 text-xs text-destructive" role="alert">
            Unable to sign out. Please try again.
          </p>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-svh min-h-[620px] flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-[52px] shrink-0 items-center gap-4 border-b border-border/50 bg-card px-4 sm:px-5">
        <Sheet open={navOpen} onOpenChange={setNavOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open navigation">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] border-border bg-card p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <MobileNavigation pathname={pathname} onNavigate={() => setNavOpen(false)} />
          </SheetContent>
        </Sheet>
        <Brand />
        <DesktopNavigation pathname={pathname} />
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
            <span className="size-1.5 rounded-full bg-primary" />
            Open until 6:00 PM
          </div>
          <AccountMenu />
        </div>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
