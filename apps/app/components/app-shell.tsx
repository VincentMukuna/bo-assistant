"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CalendarDays,
  Inbox,
  LogOut,
  Menu,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
};

const navItems: NavItem[] = [
  { href: "/inbox", label: "Inbox", icon: Inbox, count: 3 },
  { href: "/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/agent-activity", label: "Agent Activity", icon: Activity },
];

function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-sm font-semibold text-white">
        O
      </div>
      {compact ? null : (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-[-0.01em]">Oak &amp; Pine</div>
          <div className="truncate text-xs text-muted-foreground">Home services</div>
        </div>
      )}
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  if (href.startsWith("/customers")) return pathname.startsWith("/customers");
  return pathname === href;
}

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return (
    <>
      <Link href="/inbox" className="px-5 py-5" onClick={onNavigate} aria-label="Oak and Pine home">
        <AppMark />
      </Link>
      <nav className="flex-1 space-y-1 px-3 pt-3" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const selected = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950",
                selected && "bg-zinc-100 text-zinc-950",
              )}
              aria-current={selected ? "page" : undefined}
            >
              <Icon className="size-[18px]" strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.count ? (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-semibold text-white">
                  {item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 text-xs text-zinc-600 ring-1 ring-zinc-200">
          <span className="size-2 rounded-full bg-zinc-950" />
          Open until 6:00 PM
        </div>
        <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-zinc-100">
          <Avatar className="size-8">
            <AvatarFallback className="bg-zinc-200 text-xs font-medium text-zinc-700">{user?.initials ?? "KL"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user?.fullName ?? user?.email}</div>
            <div className="truncate text-xs text-muted-foreground">Owner</div>
          </div>
          <LogOut className="size-4 text-muted-foreground" />
        </button>
      </div>
    </>
  );
}

function currentTitle(pathname: string) {
  if (pathname.startsWith("/bookings")) return "Bookings";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/agent-activity")) return "Agent Activity";
  return "Inbox";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-svh min-h-[620px] overflow-hidden bg-white text-zinc-950">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 lg:flex">
        <Navigation pathname={pathname} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center border-b border-zinc-200 bg-white px-4 lg:hidden">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-[280px] flex-col bg-zinc-50 p-0">
              <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
              <Navigation pathname={pathname} onNavigate={() => setNavOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="ml-2"><AppMark compact /></div>
          <div className="ml-3 text-sm font-semibold">{currentTitle(pathname)}</div>
          <Avatar className="ml-auto size-8">
            <AvatarFallback className="bg-zinc-100 text-xs text-zinc-700">{user?.initials ?? "KL"}</AvatarFallback>
          </Avatar>
        </header>
        <main className="min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
