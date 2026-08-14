import type { Metadata } from "next";

import { OrderDetailWorkspace } from "../../../components/orders/order-detail-workspace";

export const metadata: Metadata = { title: "Order details | CrossVal" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailWorkspace orderId={orderId} />;
}
