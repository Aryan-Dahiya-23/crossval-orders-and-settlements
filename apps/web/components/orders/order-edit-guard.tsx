import type { OrderDetail } from "@crossval/contracts";
import { RiArrowLeftLine, RiEyeLine, RiLockLine } from "@remixicon/react";
import Link from "next/link";

import { formatUsd } from "../../lib/format";
import * as Button from "../ui/button";

export interface OrderEditGuardProps {
  order: OrderDetail;
}

export function OrderEditGuard({ order }: OrderEditGuardProps) {
  const settlementCount = order.payments.length;

  return (
    <div
      className="mx-auto my-6 max-w-xl rounded-2xl bg-bg-white-0 p-6 sm:p-8 text-center shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200"
      role="alert"
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-bg-weak-50 text-text-strong-950 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
        <RiLockLine className="size-6 text-text-sub-600" />
      </span>

      <div className="mt-5 flex items-center justify-center gap-2">
        <span className="text-subheading-xs uppercase font-medium text-text-soft-400">
          {order.displayId}
        </span>
      </div>

      <h1 className="mt-2 text-title-h4 font-semibold text-text-strong-950">
        Order is locked against modification
      </h1>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-bg-weak-50 px-3 py-1 text-paragraph-xs font-medium text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200">
          <span className="size-1.5 rounded-full bg-information-base" />
          {settlementCount} recorded settlement{settlementCount === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-lighter px-3 py-1 text-paragraph-xs font-medium text-success-dark ring-1 ring-inset ring-success-base/20">
          Total settled: {formatUsd(order.paidAmountCents)}
        </span>
      </div>

      <p className="mx-auto mt-4 max-w-md text-paragraph-sm leading-6 text-text-sub-600">
        Under financial accounting standards, orders with recorded payments
        are permanently locked to preserve ledger auditability and prevent balance drift.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button.Root asChild variant="primary" size="medium">
          <Link href={`/orders/${order.id}`}>
            <Button.Icon as={RiEyeLine} />
            View order details
          </Link>
        </Button.Root>

        <Button.Root asChild variant="neutral" mode="stroke" size="medium">
          <Link href="/orders">
            <Button.Icon as={RiArrowLeftLine} />
            Back to orders
          </Link>
        </Button.Root>
      </div>
    </div>
  );
}
