import type { Metadata } from "next";

import { OwnerOverviewScreen } from "@/components/overview/owner-overview-screen";

export const metadata: Metadata = { title: "Overview · Oak & Pine" };

export default function OverviewPage() {
  return <OwnerOverviewScreen />;
}
