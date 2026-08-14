"use client";

import { ProtectedRoute } from "./auth-boundary";
import { OrdersDashboard } from "../orders/orders-dashboard";

export function AuthenticatedWorkspace() {
  return (
    <ProtectedRoute>
      {(viewer) => <OrdersDashboard viewer={viewer} />}
    </ProtectedRoute>
  );
}
