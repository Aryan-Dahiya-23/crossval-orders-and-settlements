import type { Metadata } from "next";

import { AuthenticatedWorkspace } from "../../components/auth/authenticated-workspace";

export const metadata: Metadata = { title: "Orders | CrossVal" };

export default function OrdersPage() {
  return <AuthenticatedWorkspace />;
}
