"use client";

import type { Viewer } from "@crossval/contracts";
import {
  RiArrowLeftLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import Link from "next/link";
import { useState } from "react";

import { useOrderDetail } from "../../features/orders/queries";
import { ApiError } from "../../lib/api-client";
import { formatDateOnly, formatInstant, formatUsd } from "../../lib/format";
import { ProtectedRoute } from "../auth/auth-boundary";
import { AppShell } from "../layout/app-shell";
import { Alert } from "../ui/alert";
import * as Button from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import * as Table from "../ui/table";
import { OrderActionBar } from "./order-action-bar";
import { OrderDeleteDialog } from "./order-delete-dialog";
import { OrderLockBanner } from "./order-lock-banner";
import { PaymentDialog } from "./payment-dialog";
import { StatusBadge } from "./status-badge";

export function OrderDetailWorkspace({ orderId }: { orderId: string }) {
  return (
    <ProtectedRoute>
      {(viewer) => <OrderDetailContent orderId={orderId} viewer={viewer} />}
    </ProtectedRoute>
  );
}

function OrderDetailContent({
  orderId,
  viewer,
}: {
  orderId: string;
  viewer: Viewer;
}) {
  const order = useOrderDetail(orderId);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (order.isPending) {
    return <DetailLoading viewer={viewer} />;
  }

  if (order.isError) {
    const notFound =
      order.error instanceof ApiError && order.error.status === 404;
    return (
      <AppShell viewer={viewer}>
        <div
          className="mx-auto grid min-h-[70vh] max-w-xl place-items-center text-center"
          role="alert"
        >
          <div>
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-lighter/50 text-error-base ring-1 ring-inset ring-error-light">
              <RiMoneyDollarCircleLine className="size-6" />
            </span>
            <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
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
            <Button.Root asChild className="mt-5" variant="neutral" mode="stroke" size="medium">
              <Link href="/orders">Back to orders</Link>
            </Button.Root>
          </div>
        </div>
      </AppShell>
    );
  }

  const detail = order.data;

  return (
    <AppShell viewer={viewer}>
      <Link
        className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
        href="/orders"
      >
        <RiArrowLeftLine className="size-4" />
        All orders
      </Link>

      <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-paragraph-xs font-medium text-text-soft-400">
              {detail.displayId}
            </span>
            <StatusBadge status={detail.status} />
          </div>
          <h1 className="text-title-h5 font-semibold text-text-strong-950 sm:text-title-h4">
            {detail.customerName}
          </h1>
          <p className="mt-2 text-paragraph-sm text-text-sub-600">
            Payment due {formatDateOnly(detail.dueDate)}
          </p>
        </div>

        <OrderActionBar
          order={detail}
          onOpenPayment={() => {
            setSuccessMessage(null);
            setPaymentOpen(true);
          }}
          onOpenDelete={() => setDeleteOpen(true)}
        />
      </header>

      {!detail.isEditable || detail.payments.length > 0 ? (
        <div className="mt-5">
          <OrderLockBanner paymentCount={detail.payments.length} />
        </div>
      ) : null}

      {successMessage ? (
        <div className="mt-5">
          <Alert tone="success">{successMessage}</Alert>
        </div>
      ) : null}

      <section
        className="mt-6 grid overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-stroke-soft-200"
        aria-label="Order financial summary"
      >
        <FinancialMetric
          label="Order total"
          value={formatUsd(detail.totalAmountCents)}
        />
        <FinancialMetric
          label="Amount paid"
          value={formatUsd(detail.paidAmountCents)}
        />
        <FinancialMetric
          label="Balance due"
          value={formatUsd(detail.balanceDueCents)}
          emphasis
        />
      </section>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <section
          className="overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200"
          aria-labelledby="items-title"
        >
          <PanelHeader
            title="Line items"
            description={`${detail.items.length} item${detail.items.length === 1 ? "" : "s"} on this order`}
            id="items-title"
          />
          <div className="p-4 overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <tr>
                  <Table.Head>Description</Table.Head>
                  <Table.Head className="text-center">Qty</Table.Head>
                  <Table.Head className="text-right">Unit price</Table.Head>
                  <Table.Head className="text-right">Line total</Table.Head>
                </tr>
              </Table.Header>
              <Table.Body spacing={6}>
                {detail.items.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.Cell className="font-medium text-text-strong-950">
                      {item.description}
                    </Table.Cell>
                    <Table.Cell className="text-center tabular-nums text-text-sub-600">
                      {item.quantity}
                    </Table.Cell>
                    <Table.Cell className="text-right tabular-nums text-text-sub-600">
                      {formatUsd(item.unitPriceCents)}
                    </Table.Cell>
                    <Table.Cell className="text-right font-semibold tabular-nums text-text-strong-950">
                      {formatUsd(item.lineTotalCents)}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200"
          aria-labelledby="payments-title"
        >
          <PanelHeader
            title="Payment history"
            description={`${detail.payments.length} recorded payment${detail.payments.length === 1 ? "" : "s"}`}
            id="payments-title"
          />
          {detail.payments.length === 0 ? (
            <div className="p-8 text-center">
              <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200">
                <RiMoneyDollarCircleLine className="size-5" />
              </span>
              <p className="mt-3 text-paragraph-sm font-medium text-text-strong-950">
                No payments recorded
              </p>
              <p className="mt-1 text-paragraph-xs leading-5 text-text-sub-600">
                The full order balance remains outstanding.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-stroke-soft-200">
              {detail.payments.map((payment) => (
                <li className="p-5" key={payment.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <strong className="text-paragraph-sm font-semibold tabular-nums text-text-strong-950">
                      {formatUsd(payment.amountCents)}
                    </strong>
                    <span className="text-paragraph-xs text-text-sub-600">
                      {formatDateOnly(payment.paymentDate)}
                    </span>
                  </div>
                  {payment.note ? (
                    <p className="mt-2 text-paragraph-sm leading-5 text-text-sub-600">
                      {payment.note}
                    </p>
                  ) : null}
                  <time
                    className="mt-2 block text-subheading-2xs text-text-soft-400"
                    dateTime={payment.createdAt}
                  >
                    Recorded {formatInstant(payment.createdAt)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <PaymentDialog
        open={paymentOpen}
        order={detail}
        onClose={() => setPaymentOpen(false)}
        onSuccess={(amountCents) => {
          setPaymentOpen(false);
          setSuccessMessage(
            `${formatUsd(amountCents)} payment recorded successfully.`,
          );
        }}
      />

      <OrderDeleteDialog
        open={deleteOpen}
        order={detail}
        onClose={() => setDeleteOpen(false)}
      />
    </AppShell>
  );
}

function FinancialMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={
        emphasis
          ? "bg-bg-weak-50/70 p-5"
          : "p-5"
      }
    >
      <span className="text-subheading-xs uppercase font-medium text-text-soft-400">{label}</span>
      <strong className="mt-2 block text-title-h5 font-semibold tracking-tight tabular-nums text-text-strong-950">
        {value}
      </strong>
    </div>
  );
}

function PanelHeader({
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="border-b border-stroke-soft-200 px-5 py-4">
      <h2 className="text-label-sm font-semibold text-text-strong-950" id={id}>
        {title}
      </h2>
      <p className="mt-0.5 text-paragraph-xs text-text-sub-600">{description}</p>
    </div>
  );
}

function DetailLoading({ viewer }: { viewer: Viewer }) {
  return (
    <AppShell viewer={viewer}>
      <div className="space-y-6" aria-busy="true" aria-label="Loading order">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>

        {/* Header summary skeleton card */}
        <div className="flex flex-col gap-4 rounded-2xl bg-bg-white-0 p-6 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-10" />
            <Skeleton className="h-9 w-32 rounded-10" />
          </div>
        </div>

        {/* Financial overview scorecard skeleton */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 space-y-2"
            >
              <Skeleton className="h-3 w-20 rounded-md" />
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Line items and ledger skeletons */}
        <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <div className="overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
            <div className="border-b border-stroke-soft-200 px-5 py-4 space-y-1">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
            <div className="p-5 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
            <div className="border-b border-stroke-soft-200 px-5 py-4 space-y-1">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-3 w-40 rounded-md" />
            </div>
            <div className="p-5 space-y-3">
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
