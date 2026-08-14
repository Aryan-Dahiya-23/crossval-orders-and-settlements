"use client";

import type { Viewer } from "@crossval/contracts";
import {
  RiArrowLeftLine,
  RiCheckboxCircleLine,
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
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
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
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
              <RiMoneyDollarCircleLine className="size-5" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              {notFound
                ? "This order isn't available"
                : "The order couldn't be loaded"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {notFound
                ? "It may not exist or may belong to another workspace."
                : "Check the API connection and try again."}
            </p>
            <Button asChild className="mt-5" variant="secondary">
              <Link href="/orders">Back to orders</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const detail = order.data;

  return (
    <AppShell viewer={viewer}>
      <Link
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 outline-none transition hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950"
        href="/orders"
      >
        <RiArrowLeftLine className="size-4" />
        All orders
      </Link>

      <header className="mt-5 flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-medium text-slate-400">
              {detail.displayId}
            </span>
            <StatusBadge status={detail.status} />
          </div>
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-[28px]">
            {detail.customerName}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Payment due {formatDateOnly(detail.dueDate)}
          </p>
        </div>
        {detail.balanceDueCents > 0 ? (
          <Button
            type="button"
            onClick={() => {
              setSuccessMessage(null);
              setPaymentOpen(true);
            }}
          >
            <RiMoneyDollarCircleLine className="size-[18px]" />
            Record payment
          </Button>
        ) : (
          <span className="inline-flex h-10 items-center gap-2 self-start rounded-[10px] bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:self-auto">
            <RiCheckboxCircleLine className="size-[18px]" /> Paid in full
          </span>
        )}
      </header>

      {successMessage ? (
        <div className="mt-5">
          <Alert tone="success">{successMessage}</Alert>
        </div>
      ) : null}

      <section
        className="mt-6 grid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3"
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
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          aria-labelledby="items-title"
        >
          <PanelHeader
            title="Line items"
            description={`${detail.items.length} item${detail.items.length === 1 ? "" : "s"} on this order`}
            id="items-title"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-center font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Unit price
                  </th>
                  <th className="px-5 py-3 text-right font-medium">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {detail.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">
                      {item.description}
                    </td>
                    <td className="px-4 py-4 text-center text-sm tabular-nums text-slate-500">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-4 text-right text-sm tabular-nums text-slate-500">
                      {formatUsd(item.unitPriceCents)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-950">
                      {formatUsd(item.lineTotalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          aria-labelledby="payments-title"
        >
          <PanelHeader
            title="Payment history"
            description={`${detail.payments.length} recorded payment${detail.payments.length === 1 ? "" : "s"}`}
            id="payments-title"
          />
          {detail.payments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <span className="mx-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500">
                <RiMoneyDollarCircleLine className="size-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-800">
                No payments recorded
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                The full order balance remains outstanding.
              </p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-100">
              {detail.payments.map((payment) => (
                <li className="p-5" key={payment.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <strong className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatUsd(payment.amountCents)}
                    </strong>
                    <span className="text-xs text-slate-500">
                      {formatDateOnly(payment.paymentDate)}
                    </span>
                  </div>
                  {payment.note ? (
                    <p className="mt-2 text-sm leading-5 text-slate-600">
                      {payment.note}
                    </p>
                  ) : null}
                  <time
                    className="mt-2 block text-[11px] text-slate-400"
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
          ? "border-t border-slate-200 bg-slate-50 p-5 sm:border-l sm:border-t-0"
          : "border-t border-slate-200 p-5 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0"
      }
    >
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <strong className="mt-2 block text-xl font-semibold tracking-[-0.03em] tabular-nums text-slate-950">
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
    <div className="border-b border-slate-200 px-5 py-4">
      <h2 className="text-sm font-semibold text-slate-950" id={id}>
        {title}
      </h2>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function DetailLoading({ viewer }: { viewer: Viewer }) {
  return (
    <AppShell viewer={viewer}>
      <div className="space-y-5" aria-busy="true" aria-label="Loading order">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </AppShell>
  );
}
