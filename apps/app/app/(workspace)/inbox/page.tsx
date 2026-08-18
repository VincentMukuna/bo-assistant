import type { Metadata } from "next";

import { InboxScreen } from "@/components/inbox/inbox-screen";

export const metadata: Metadata = { title: "Inbox · Oak & Pine" };

type InboxPageProps = {
  searchParams: Promise<{ conversation?: string | string[] }>;
};

export default async function InboxPage({ searchParams }: InboxPageProps) {
  const query = await searchParams;
  const selectedId = typeof query.conversation === "string" ? query.conversation : undefined;

  return <InboxScreen selectedId={selectedId} />;
}
