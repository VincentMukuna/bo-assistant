import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CustomersScreen } from "@/components/customers/customers-screen";
import { customers } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Customers · Oak & Pine" };

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return customers.map((customer) => ({ id: customer.id }));
}

export default async function CustomerPage({ params }: CustomerPageProps) {
  const { id } = await params;
  if (!customers.some((customer) => customer.id === id)) notFound();

  return <CustomersScreen selectedId={id} />;
}
