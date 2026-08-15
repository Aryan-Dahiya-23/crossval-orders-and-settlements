import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthenticatedWorkspace } from "../../components/auth/authenticated-workspace";

import { RiBarChartGroupedFill } from "@remixicon/react";

export const metadata: Metadata = {
  title: "Orders",
  description:
    "Monitor active, pending, and settled customer orders with real-time financial metrics.",
};

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersRouteFallback />}>
      <AuthenticatedWorkspace />
    </Suspense>
  );
}

function OrdersRouteFallback() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-bg-weak-50 p-6 text-center"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative grid size-12 place-items-center rounded-2xl bg-bg-white-0 shadow-regular-sm ring-1 ring-inset ring-stroke-soft-200">
          <RiBarChartGroupedFill className="size-6 text-primary-base animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="text-label-sm font-semibold text-text-strong-950">CrossVal</h3>
          <p className="text-paragraph-xs text-text-sub-600">Preparing orders dashboard…</p>
        </div>
      </div>
    </main>
  );
}
