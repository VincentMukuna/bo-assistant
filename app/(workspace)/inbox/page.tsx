import type { Metadata } from "next";

import { InboxScreen } from "@/components/inbox/inbox-screen";
import { conversations } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Inbox · Oak & Pine" };

type InboxPageProps = {
  searchParams: Promise<{ conversation?: string | string[] }>;
};

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const query = await searchParams;
  const requested = typeof query.conversation === "string" ? query.conversation : "alice";
  const selectedId = conversations.some((item) => item.id === requested) ? requested : "alice";

  return <InboxScreen selectedId={selectedId} />;
}
