import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthenticatedWorkspace } from "../../components/auth/authenticated-workspace";

export const metadata: Metadata = { title: "Orders | CrossVal" };

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
      className="grid min-h-screen place-items-center bg-bg-weak-50 p-6"
      aria-busy="true"
    >
      <div className="h-32 w-full max-w-md animate-pulse rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200" />
      <span className="sr-only">Preparing orders dashboard…</span>
    </main>
  );
}
