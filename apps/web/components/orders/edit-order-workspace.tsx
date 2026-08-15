"use client";

import type { ReplaceOrderRequest, Viewer } from "@crossval/contracts";
import { RiArrowLeftLine, RiMoneyDollarCircleLine } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { parseOrderApiError } from "../../features/orders/errors";
import { useOrderDetail, useReplaceOrder } from "../../features/orders/queries";
import { ApiError } from "../../lib/api-client";
import { ProtectedRoute } from "../auth/auth-boundary";
import { AppShell } from "../layout/app-shell";
import { PageHeader } from "../layout/page-header";
import * as Button from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { OrderEditGuard } from "./order-edit-guard";
import { centsToDecimalString, OrderForm } from "./order-form";

export function EditOrderWorkspace({ orderId }: { orderId: string }) {
  return (
    <ProtectedRoute>
      {(viewer) => <EditOrderContent orderId={orderId} viewer={viewer} />}
    </ProtectedRoute>
  );
}

function EditOrderContent({
  orderId,
  viewer,
}: {
  orderId: string;
  viewer: Viewer;
}) {
  const router = useRouter();
  const orderQuery = useOrderDetail(orderId);
  const replaceMutation = useReplaceOrder(orderId);
  const [serverError, setServerError] = useState<string | null>(null);

  if (orderQuery.isPending) {
    return <EditOrderLoading viewer={viewer} />;
  }

  if (orderQuery.isError) {
    const notFound =
      orderQuery.error instanceof ApiError && orderQuery.error.status === 404;
    return (
      <AppShell viewer={viewer}>
        <div
          className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center"
          role="alert"
        >
          <div>
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-error-lighter text-error-base ring-1 ring-inset ring-error-base/20 shadow-regular-xs">
              <RiMoneyDollarCircleLine className="size-6" />
            </span>
            <p className="mt-4 text-subheading-xs uppercase font-medium text-text-soft-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
            <h1 className="mt-2 text-title-h4 font-semibold text-text-strong-950">
              {notFound
                ? "This order isn't available"
                : "The order couldn't be loaded"}
            </h1>
            <p className="mt-3 text-paragraph-sm leading-6 text-text-sub-600">
              {notFound
                ? "It may not exist or may belong to another workspace."
                : "Check the API connection and try again."}
            </p>
            <Button.Root asChild className="mt-6" variant="neutral" mode="stroke" size="medium">
              <Link href="/orders">Back to orders</Link>
            </Button.Root>
          </div>
        </div>
      </AppShell>
    );
  }

  const order = orderQuery.data;

  // Immutability Guard: If order has any payments recorded, prevent edit
  if (!order.isEditable || order.payments.length > 0) {
    return (
      <AppShell viewer={viewer}>
        <div className="mb-5">
          <Link
            className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:shadow-button-important-focus focus-visible:outline-none"
            href={`/orders/${order.id}`}
          >
            <RiArrowLeftLine className="size-4" />
            Back to order details
          </Link>
        </div>
        <OrderEditGuard order={order} />
      </AppShell>
    );
  }

  const handleReplace = async (payload: ReplaceOrderRequest) => {
    setServerError(null);
    try {
      await replaceMutation.mutateAsync(payload);
      router.push(`/orders/${order.id}`);
    } catch (error: unknown) {
      const parsed = parseOrderApiError(error);
      if (parsed.isLocked) {
        // Race condition where payment committed concurrently
        await orderQuery.refetch();
        return;
      }
      setServerError(parsed.message);
    }
  };

  const initialFormValues = {
    customerName: order.customerName,
    dueDate: order.dueDate,
    items: order.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: centsToDecimalString(item.unitPriceCents),
    })),
  };

  return (
    <AppShell viewer={viewer}>
      <div className="mb-5">
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:shadow-button-important-focus focus-visible:outline-none"
          href={`/orders/${order.id}`}
        >
          <RiArrowLeftLine className="size-4" />
          Back to order details
        </Link>
      </div>

      <PageHeader
        eyebrow={`Edit order ${order.displayId}`}
        title={`Edit ${order.customerName}`}
        description="Update customer name, due date, or line items. The order total will recalculate automatically."
      />

      <div className="mt-6 max-w-4xl">
        <OrderForm
          mode="edit"
          initialValues={initialFormValues}
          onSubmit={handleReplace}
          isSubmitting={replaceMutation.isPending}
          cancelHref={`/orders/${order.id}`}
          serverError={serverError}
        />
      </div>
    </AppShell>
  );
}

function EditOrderLoading({ viewer }: { viewer: Viewer }) {
  return (
    <AppShell viewer={viewer}>
      <div
        className="max-w-4xl space-y-6"
        aria-busy="true"
        aria-label="Loading order for editing"
      >
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>

        <div className="space-y-2 border-b border-stroke-soft-200 pb-6">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>

        {/* Customer & date form section skeleton */}
        <div className="rounded-2xl bg-bg-white-0 p-6 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-10 w-full rounded-10" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-10 w-full rounded-10" />
            </div>
          </div>
        </div>

        {/* Line items section skeleton */}
        <div className="rounded-2xl bg-bg-white-0 p-6 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-10" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
