import type { Metadata } from "next";

import { CreateOrderWorkspace } from "../../../components/orders/create-order-workspace";

export const metadata: Metadata = { title: "New order | CrossVal" };

export default function NewOrderPage() {
  return <CreateOrderWorkspace />;
}
