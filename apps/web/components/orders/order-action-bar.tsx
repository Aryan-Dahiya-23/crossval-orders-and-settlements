"use client";

import type { OrderDetail } from "@crossval/contracts";
import {
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiEditLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import Link from "next/link";

import { cn } from "@/utils/cn";
import * as Button from "../ui/button";

export interface OrderActionBarProps {
  order: Pick<
    OrderDetail,
    "id" | "displayId" | "isEditable" | "isDeletable" | "balanceDueCents"
  >;
  onOpenPayment: () => void;
  onOpenDelete: () => void;
  className?: string;
}

export function OrderActionBar({
  order,
  onOpenPayment,
  onOpenDelete,
  className,
}: OrderActionBarProps) {
  const isPaidInFull = order.balanceDueCents === 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 sm:gap-2.5",
        className,
      )}
    >
      {/* Edit Order Action */}
      {order.isEditable ? (
        <Button.Root asChild variant="neutral" mode="stroke" size="medium">
          <Link
            href={`/orders/${order.id}/edit`}
            aria-label={`Edit order ${order.displayId}`}
          >
            <Button.Icon as={RiEditLine} />
            Edit order
          </Link>
        </Button.Root>
      ) : (
        <Button.Root
          variant="neutral"
          mode="stroke"
          size="medium"
          disabled
          title="Orders with recorded payments cannot be modified."
          aria-label="Edit order (locked - order has payments)"
        >
          <Button.Icon as={RiEditLine} />
          Edit order
        </Button.Root>
      )}

      {/* Delete Order Action */}
      {order.isDeletable ? (
        <Button.Root
          variant="neutral"
          mode="stroke"
          size="medium"
          type="button"
          onClick={onOpenDelete}
          className="hover:text-error-base hover:ring-error-base/30"
          aria-label={`Delete order ${order.displayId}`}
        >
          <Button.Icon as={RiDeleteBinLine} />
          Delete
        </Button.Root>
      ) : (
        <Button.Root
          variant="neutral"
          mode="stroke"
          size="medium"
          disabled
          title="Orders with recorded payments cannot be deleted."
          aria-label="Delete order (locked - order has payments)"
        >
          <Button.Icon as={RiDeleteBinLine} />
          Delete
        </Button.Root>
      )}

      {/* Settlement Action */}
      {!isPaidInFull ? (
        <Button.Root
          variant="primary"
          mode="filled"
          size="medium"
          type="button"
          onClick={onOpenPayment}
        >
          <Button.Icon as={RiMoneyDollarCircleLine} />
          Record payment
        </Button.Root>
      ) : (
        <span className="inline-flex h-10 items-center gap-2 rounded-10 bg-success-lighter px-3.5 text-label-sm font-semibold text-success-dark ring-1 ring-inset ring-success-base/20">
          <RiCheckboxCircleLine className="size-[18px] text-success-base" />
          Paid in full
        </span>
      )}
    </div>
  );
}

