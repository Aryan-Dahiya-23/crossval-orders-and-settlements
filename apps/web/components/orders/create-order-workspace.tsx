"use client";

import type { CreateOrderRequest, Viewer } from "@crossval/contracts";
import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { parseOrderApiError } from "../../features/orders/errors";
import { useCreateOrder } from "../../features/orders/queries";
import { ProtectedRoute } from "../auth/auth-boundary";
import { AppShell } from "../layout/app-shell";
import { PageHeader } from "../layout/page-header";
import { OrderForm } from "./order-form";

export function CreateOrderWorkspace() {
  return (
    <ProtectedRoute>
      {(viewer) => <CreateOrderContent viewer={viewer} />}
    </ProtectedRoute>
  );
}

function CreateOrderContent({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const createMutation = useCreateOrder();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleCreate = async (payload: CreateOrderRequest) => {
    setServerError(null);
    try {
      const created = await createMutation.mutateAsync(payload);
      router.push(`/orders/${created.id}`);
    } catch (error: unknown) {
      const parsed = parseOrderApiError(error);
      setServerError(parsed.message);
    }
  };

  return (
    <AppShell viewer={viewer}>
      <div className="mb-5">
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:shadow-button-important-focus focus-visible:outline-none"
          href="/orders"
        >
          <RiArrowLeftLine className="size-4" />
          All orders
        </Link>
      </div>

      <PageHeader
        eyebrow="Finance operations"
        title="Create order"
        description="Draft a new receivable order with custom line items and settlement due date."
      />

      <div className="mt-6 max-w-4xl">
        <OrderForm
          mode="create"
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
          cancelHref="/orders"
          serverError={serverError}
        />
      </div>
    </AppShell>
  );
}
