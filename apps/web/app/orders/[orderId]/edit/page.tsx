import type { Metadata } from "next";

import { EditOrderWorkspace } from "../../../../components/orders/edit-order-workspace";

export const metadata: Metadata = { title: "Edit order | CrossVal" };

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <EditOrderWorkspace orderId={orderId} />;
}
