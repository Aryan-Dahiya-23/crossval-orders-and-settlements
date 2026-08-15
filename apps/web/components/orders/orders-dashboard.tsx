"use client";

import type {
  OrderListItem,
  OrderListQuery,
  Viewer,
} from "@crossval/contracts";
import {
  RiAddLine,
  RiArrowRightLine,
  RiBankCardLine,
  RiCheckboxCircleLine,
  RiFileList3Line,
  RiFundsLine,
  RiSearchLine,
} from "@remixicon/react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, type ReactNode } from "react";

import {
  defaultOrderListQuery,
  orderListHref,
  parseOrderListState,
  patchOrderListState,
  shouldCorrectOrderPage,
} from "../../features/orders/list-state";
import { useOrders, useOrderSummary } from "../../features/orders/queries";
import { formatDateOnly, formatUsd } from "../../lib/format";
import { AppShell } from "../layout/app-shell";
import { PageHeader } from "../layout/page-header";
import { Alert } from "../ui/alert";
import * as Button from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import * as Table from "../ui/table";
import { OrdersPagination } from "./orders-pagination";
import { OrdersToolbar } from "./orders-toolbar";
import { SampleDataCTA } from "./sample-data-cta";
import { StatusBadge } from "./status-badge";

export function OrdersDashboard({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSearchParams = searchParams.toString();
  const query = useMemo(
    () => parseOrderListState(new URLSearchParams(rawSearchParams)),
    [rawSearchParams],
  );
  const orders = useOrders(query);
  const summary = useOrderSummary();

  const replaceQuery = useCallback(
    (next: OrderListQuery) => {
      router.replace(orderListHref(next), { scroll: false });
    },
    [router],
  );
  const handleSearchChange = useCallback(
    (search: string | null) =>
      replaceQuery(patchOrderListState(query, { search })),
    [query, replaceQuery],
  );

  useEffect(() => {
    const currentHref =
      rawSearchParams.length > 0 ? `/orders?${rawSearchParams}` : "/orders";
    const canonicalHref = orderListHref(query);
    if (currentHref !== canonicalHref) replaceQuery(query);
  }, [query, rawSearchParams, replaceQuery]);

  useEffect(() => {
    if (
      orders.data &&
      !orders.isPlaceholderData &&
      shouldCorrectOrderPage(orders.data.meta)
    ) {
      replaceQuery(
        patchOrderListState(
          query,
          { page: orders.data.meta.totalPages },
          { resetPage: false },
        ),
      );
    }
  }, [orders.data, orders.isPlaceholderData, query, replaceQuery]);

  const hasActiveFilters = query.status !== "all" || Boolean(query.search);

  return (
    <AppShell viewer={viewer}>
      <PageHeader
        eyebrow="Finance operations"
        title="Orders & settlements"
        description="Monitor receivables, follow balances, and keep every settlement traceable from one operational view."
        action={
          <Button.Root variant="primary" size="small" className="rounded-10" asChild>
            <Link href="/orders/new">
              <Button.Icon as={RiAddLine} />
              New order
            </Link>
          </Button.Root>
        }
      />

      <SampleDataCTA
        hasOrders={Boolean(summary.data?.data.totalOrders && summary.data.data.totalOrders > 0)}
        className="mt-6"
      />

      {summary.isPending ? (
        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Loading account summary"
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton className="h-[148px] rounded-2xl" key={item} />
          ))}
        </section>
      ) : summary.isError ? (
        <div className="mt-6">
          <Alert tone="warning">Account summary is temporarily unavailable.</Alert>
        </div>
      ) : (
        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
        className="mt-6 overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200"
        aria-labelledby="orders-heading"
        aria-busy={orders.isFetching}
      >
        <div className="flex flex-col gap-4 border-b border-stroke-soft-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2
                id="orders-heading"
                className="text-label-md font-semibold text-text-strong-950"
              >
                All orders
              </h2>
              <p className="mt-0.5 text-paragraph-xs text-text-sub-600">
                Review due dates and settlement progress across your account.
              </p>
            </div>
            <span className="min-h-4 text-paragraph-xs text-text-soft-400" aria-live="polite">
              {orders.isFetching && !orders.isPending
                ? "Updating orders…"
                : null}
            </span>
          </div>

          <OrdersToolbar
            key={query.search ?? ""}
            query={query}
            onStatusChange={(status) =>
              replaceQuery(patchOrderListState(query, { status }))
            }
            onSearchChange={handleSearchChange}
            onSortChange={(sort, direction) =>
              replaceQuery(patchOrderListState(query, { sort, direction }))
            }
          />
        </div>

        {orders.isError && orders.data ? (
          <div className="border-b border-stroke-soft-200 p-4">
            <Alert tone="warning">
              The latest orders could not be loaded. Showing the previous
              results; try again when the connection recovers.
            </Alert>
          </div>
        ) : null}

        {orders.isPending ? (
          <div className="p-5 space-y-3" aria-label="Loading orders">
            {[0, 1, 2, 3, 4].map((item) => (
              <Skeleton className="h-16 rounded-xl" key={item} />
            ))}
          </div>
        ) : orders.isError && !orders.data ? (
          <div
            className="grid justify-items-start gap-3 p-8 text-paragraph-sm text-text-sub-600"
            role="alert"
          >
            <div>
              <h3 className="text-label-sm font-semibold text-text-strong-950">
                Orders couldn&apos;t be loaded
              </h3>
              <p className="mt-1 text-paragraph-xs">Check the API connection and try again.</p>
            </div>
            <Button.Root
              variant="neutral"
              mode="stroke"
              size="small"
              type="button"
              onClick={() => void orders.refetch()}
            >
              Try again
            </Button.Root>
          </div>
        ) : orders.data && orders.data.data.length === 0 ? (
          <div className="grid justify-items-center p-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200 text-text-sub-600">
              <RiSearchLine className="size-5" />
            </span>
            <h3 className="mt-4 text-label-sm font-semibold text-text-strong-950">
              {hasActiveFilters ? "No matching orders" : "No orders yet"}
            </h3>
            <p className="mt-1 max-w-sm text-paragraph-xs text-text-sub-600">
              {hasActiveFilters
                ? "Try another customer search or status filter."
                : "Orders created through the API will appear here with their live settlement state."}
            </p>
            {hasActiveFilters ? (
              <Button.Root
                className="mt-4"
                variant="neutral"
                mode="stroke"
                size="small"
                type="button"
                onClick={() => replaceQuery(defaultOrderListQuery)}
              >
                Clear filters
              </Button.Root>
            ) : (
              <Button.Root asChild className="mt-4" variant="primary" size="small">
                <Link href="/orders/new">
                  <Button.Icon as={RiAddLine} />
                  Create order
                </Link>
              </Button.Root>
            )}
          </div>
        ) : orders.data ? (
          <OrderRows orders={orders.data.data} />
        ) : null}

        {orders.data ? (
          <OrdersPagination
            meta={orders.data.meta}
            requestedPage={query.page}
            requestedPageSize={query.pageSize}
            isPlaceholderData={orders.isPlaceholderData}
            onPageChange={(page) =>
              replaceQuery(
                patchOrderListState(query, { page }, { resetPage: false }),
              )
            }
            onPageSizeChange={(pageSize) =>
              replaceQuery(patchOrderListState(query, { pageSize }))
            }
          />
        ) : null}
      </section>
    </AppShell>
  );
}

function OrderRows({ orders }: { orders: OrderListItem[] }) {
  return (
    <>
      <div className="hidden md:block p-4">
        <Table.Root>
          <Table.Header>
            <tr>
              <Table.Head>Order</Table.Head>
              <Table.Head>Status</Table.Head>
              <Table.Head>Due date</Table.Head>
              <Table.Head className="text-right">Total</Table.Head>
              <Table.Head className="text-right">Paid</Table.Head>
              <Table.Head className="text-right">Balance</Table.Head>
              <Table.Head className="w-12 text-center" aria-label="Open order" />
            </tr>
          </Table.Header>
          <Table.Body spacing={6}>
            {orders.map((order) => (
              <Table.Row key={order.id}>
                <Table.Cell>
                  <Link
                    className="font-medium text-text-strong-950 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-stroke-strong-950 rounded-sm"
                    href={`/orders/${order.id}`}
                  >
                    {order.customerName}
                  </Link>
                  <span className="mt-0.5 block font-mono text-paragraph-xs text-text-soft-400">
                    {order.displayId}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <StatusBadge status={order.status} />
                </Table.Cell>
                <Table.Cell className="text-paragraph-sm text-text-sub-600">
                  {formatDateOnly(order.dueDate)}
                </Table.Cell>
                <Table.Cell className="text-right text-paragraph-sm tabular-nums text-text-sub-600">
                  {formatUsd(order.totalAmountCents)}
                </Table.Cell>
                <Table.Cell className="text-right text-paragraph-sm tabular-nums text-text-sub-600">
                  {formatUsd(order.paidAmountCents)}
                </Table.Cell>
                <Table.Cell className="text-right text-paragraph-sm font-semibold tabular-nums text-text-strong-950">
                  {formatUsd(order.balanceDueCents)}
                </Table.Cell>
                <Table.Cell className="pr-4 text-right">
                  <Link
                    className="inline-flex size-8 items-center justify-center rounded-lg text-text-soft-400 outline-none transition group-hover/row:text-text-strong-950 hover:bg-bg-soft-200/60 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
                    href={`/orders/${order.id}`}
                    aria-label={`Open ${order.displayId}`}
                  >
                    <RiArrowRightLine className="size-4" />
                  </Link>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>

      <div className="divide-y divide-stroke-soft-200 md:hidden">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block p-4 outline-none transition hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stroke-strong-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-label-sm font-semibold text-text-strong-950">
                  {order.customerName}
                </p>
                <p className="mt-0.5 font-mono text-paragraph-xs text-text-soft-400">
                  {order.displayId}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              <MobileMetric label="Due" value={formatDateOnly(order.dueDate)} />
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
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
  danger = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <article className="relative flex flex-col rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
      <div className="flex items-center justify-between gap-3">
        <span className="text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400">{label}</span>
        <span
          className={
            danger
              ? "flex size-10 shrink-0 items-center justify-center rounded-full bg-error-lighter/50 text-error-base ring-1 ring-inset ring-error-light [&>svg]:size-5"
              : "flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200 [&>svg]:size-5"
          }
        >
          {icon}
        </span>
      </div>
      <strong
        className={
          danger
            ? "mt-4 block text-title-h5 font-semibold tracking-tight tabular-nums text-error-base"
            : "mt-4 block text-title-h5 font-semibold tracking-tight tabular-nums text-text-strong-950"
        }
      >
        {value}
      </strong>
      <span className="mt-1 block text-paragraph-xs text-text-sub-600">{hint}</span>
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
      <dt className="text-subheading-2xs uppercase text-text-soft-400">{label}</dt>
      <dd
        className={
          strong
            ? "mt-1 truncate text-label-xs font-semibold tabular-nums text-text-strong-950"
            : "mt-1 truncate text-paragraph-xs tabular-nums text-text-sub-600"
        }
      >
        {value}
      </dd>
    </div>
  );
}
