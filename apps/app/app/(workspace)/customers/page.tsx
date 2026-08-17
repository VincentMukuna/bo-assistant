import type { Metadata } from "next";

import { CustomersScreen } from "@/components/customers/customers-screen";

export const metadata: Metadata = { title: "Customers · Oak & Pine" };

export default function CustomersIndexPage() {
  return <CustomersScreen />;
}
