"use client";

import type { OrderStatus, Viewer } from "@crossval/contracts";
import {
  RiArrowRightLine,
  RiBankCardLine,
  RiCheckboxCircleLine,
  RiFileList3Line,
  RiFundsLine,
  RiSearchLine,
} from "@remixicon/react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useOrders, useOrderSummary } from "../../features/orders/queries";
import { formatDateOnly, formatUsd } from "../../lib/format";
import { AppShell } from "../layout/app-shell";
import { PageHeader } from "../layout/page-header";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Skeleton } from "../ui/skeleton";
import { StatusBadge } from "./status-badge";

type StatusFilter = "all" | OrderStatus;

const filters: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export function OrdersDashboard({ viewer }: { viewer: Viewer }) {
  const orders = useOrders();
  const summary = useOrderSummary();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const visibleOrders = useMemo(() => {
    if (!orders.data) return [];
    const term = search.trim().toLocaleLowerCase();
    return orders.data.data.filter(
      (order) =>
        (status === "all" || order.status === status) &&
        (term.length === 0 ||
          order.customerName.toLocaleLowerCase().includes(term) ||
          order.displayId.toLocaleLowerCase().includes(term)),
    );
  }, [orders.data, search, status]);

  return (
    <AppShell viewer={viewer}>
      <PageHeader
        eyebrow="Finance operations"
        title="Orders & settlements"
        description="Monitor receivables, follow balances, and keep every settlement traceable from one operational view."
      />

      {summary.isPending ? (
        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Loading account summary"
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton className="h-[126px] rounded-xl" key={item} />
          ))}
        </section>
      ) : summary.isError ? (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          Account summary is temporarily unavailable.
        </div>
      ) : (
        <section
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Account summary"
        >
          <SummaryCard
            icon={<RiFileList3Line />}
            label="Total orders"
            value={String(summary.data.data.totalOrders)}
            hint="Active portfolio"
          />
          <SummaryCard
            icon={<RiFundsLine />}
            label="Outstanding"
            value={formatUsd(summary.data.data.outstandingAmountCents)}
            hint="Awaiting settlement"
          />
          <SummaryCard
            icon={<RiCheckboxCircleLine />}
            label="Collected"
            value={formatUsd(summary.data.data.collectedAmountCents)}
            hint="Payments received"
          />
          <SummaryCard
            icon={<RiBankCardLine />}
            label="Overdue"
            value={formatUsd(summary.data.data.overdueAmountCents)}
            hint="Requires attention"
            danger={summary.data.data.overdueAmountCents > 0}
          />
        </section>
      )}

      <section
        className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="orders-heading"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                id="orders-heading"
                className="text-base font-semibold text-slate-950"
              >
                All orders
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review due dates and settlement progress.
              </p>
            </div>
            {orders.isFetching && !orders.isPending ? (
              <span className="text-xs text-slate-400">Refreshing…</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div
              className="flex gap-1 overflow-x-auto pb-1"
              role="group"
              aria-label="Filter orders by status"
            >
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={status === filter.value}
                  className="h-8 shrink-0 rounded-lg px-3 text-xs font-medium text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 aria-pressed:bg-slate-950 aria-pressed:text-white"
                  onClick={() => setStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <label className="relative block w-full xl:w-[280px]">
              <span className="sr-only">Search orders</span>
              <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                type="search"
                value={search}
                placeholder="Search customer or order ID"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
        </div>

        {orders.isPending ? (
          <div className="grid gap-px bg-slate-100" aria-label="Loading orders">
            {[0, 1, 2, 3].map((item) => (
              <Skeleton className="h-[72px] rounded-none bg-white" key={item} />
            ))}
          </div>
        ) : orders.isError ? (
          <div
            className="grid justify-items-start gap-3 px-5 py-14 text-sm text-slate-500"
            role="alert"
          >
            <div>
              <h3 className="font-semibold text-slate-950">
                Orders couldn&apos;t be loaded
              </h3>
              <p className="mt-1">Check the API connection and try again.</p>
            </div>
            <Button
              type="button"
              size="small"
              onClick={() => void orders.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="grid justify-items-center px-5 py-16 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500">
              <RiSearchLine className="size-5" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-slate-950">
              {orders.data.data.length === 0
                ? "No orders yet"
                : "No matching orders"}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
              {orders.data.data.length === 0
                ? "Orders created through the API will appear here with their live settlement state."
                : "Try another search term or status filter."}
            </p>
            {orders.data.data.length > 0 ? (
              <Button
                className="mt-4"
                variant="secondary"
                size="small"
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                    <th className="px-5 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 text-right font-medium">Paid</th>
                    <th className="px-5 py-3 text-right font-medium">
                      Balance
                    </th>
                    <th className="w-12" aria-label="Open order" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="group transition hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <Link
                          className="font-medium text-slate-950 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-slate-950"
                          href={`/orders/${order.id}`}
                        >
                          {order.customerName}
                        </Link>
                        <span className="mt-1 block font-mono text-xs text-slate-400">
                          {order.displayId}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {formatDateOnly(order.dueDate)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm tabular-nums text-slate-600">
                        {formatUsd(order.totalAmountCents)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm tabular-nums text-slate-600">
                        {formatUsd(order.paidAmountCents)}
                      </td>
                      <td className="px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-950">
                        {formatUsd(order.balanceDueCents)}
                      </td>
                      <td className="pr-4">
                        <Link
                          className="grid size-8 place-items-center rounded-lg text-slate-400 outline-none transition group-hover:text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-950"
                          href={`/orders/${order.id}`}
                          aria-label={`Open ${order.displayId}`}
                        >
                          <RiArrowRightLine className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {visibleOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block p-4 outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {order.customerName}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-400">
                        {order.displayId}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-3">
                    <MobileMetric
                      label="Due"
                      value={formatDateOnly(order.dueDate)}
                    />
                    <MobileMetric
                      label="Total"
                      value={formatUsd(order.totalAmountCents)}
                    />
                    <MobileMetric
                      label="Balance"
                      value={formatUsd(order.balanceDueCents)}
                      strong
                    />
                  </dl>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span
          className={
            danger
              ? "grid size-8 place-items-center rounded-lg bg-red-50 text-red-600 [&>svg]:size-[18px]"
              : "grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-600 [&>svg]:size-[18px]"
          }
        >
          {icon}
        </span>
      </div>
      <strong
        className={
          danger
            ? "mt-4 block text-xl font-semibold tracking-[-0.03em] tabular-nums text-red-700"
            : "mt-4 block text-xl font-semibold tracking-[-0.03em] tabular-nums text-slate-950"
        }
      >
        {value}
      </strong>
      <span className="mt-1 block text-xs text-slate-400">{hint}</span>
    </article>
  );
}

function MobileMetric({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <dt className="text-[11px] text-slate-400">{label}</dt>
      <dd
        className={
          strong
            ? "mt-1 truncate text-xs font-semibold tabular-nums text-slate-950"
            : "mt-1 truncate text-xs tabular-nums text-slate-600"
        }
      >
        {value}
      </dd>
    </div>
  );
}
