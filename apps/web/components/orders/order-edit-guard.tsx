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
    <div className="mx-auto max-w-xl py-12 text-center" role="alert">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-bg-white-0 text-text-strong-950 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
        <RiLockLine className="size-6 text-text-sub-600" />
      </span>

      <p className="mt-5 font-mono text-paragraph-xs font-semibold uppercase tracking-wider text-text-soft-400">
        {order.displayId}
      </p>

      <h1 className="mt-2 text-title-h4 font-semibold text-text-strong-950">
        Order is locked against modification
      </h1>

      <p className="mt-3 text-paragraph-sm leading-6 text-text-sub-600">
        This order has {settlementCount} recorded settlement
        {settlementCount === 1 ? "" : "s"} totalling{" "}
        <strong className="font-semibold text-text-strong-950">
          {formatUsd(order.paidAmountCents)}
        </strong>
        . Under financial accounting standards, orders with recorded payments
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
