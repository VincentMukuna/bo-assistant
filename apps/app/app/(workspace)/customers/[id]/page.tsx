import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomersScreen } from "@/components/customers/customers-screen";

export const metadata: Metadata = { title: "Customers · Oak & Pine" };

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;
  const selectedId = Number(id.replace(/^c/, ""));
  if (!Number.isInteger(selectedId) || selectedId < 1) notFound();

  return <CustomersScreen selectedId={selectedId} />;
}
