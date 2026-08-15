import type { Metadata } from "next";

import { CreateOrderWorkspace } from "../../../components/orders/create-order-workspace";

export const metadata: Metadata = {
  title: "New Order",
  description:
    "Create and submit a new customer order with line items and payment terms.",
};

export default function NewOrderPage() {
  return <CreateOrderWorkspace />;
}
