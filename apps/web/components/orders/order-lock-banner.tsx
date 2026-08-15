import { RiLockLine } from "@remixicon/react";
import { cn } from "../../lib/cn";

export interface OrderLockBannerProps {
  paymentCount: number;
  className?: string;
}

export function OrderLockBanner({
  paymentCount,
  className,
}: OrderLockBannerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3.5 rounded-xl bg-bg-weak-50 p-4 text-text-strong-950 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200",
        className,
      )}
      role="status"
      aria-label="Order locked notification"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-white-0 text-text-sub-600 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
        <RiLockLine className="size-4" />
      </span>
      <div className="text-paragraph-sm">
        <strong className="font-semibold text-text-strong-950">
          Order is locked against edits and deletion
        </strong>
        <p className="mt-1 text-paragraph-xs leading-5 text-text-sub-600">
          This order has {paymentCount} recorded settlement
          {paymentCount === 1 ? "" : "s"} and is locked against edits or
          deletion per financial accounting rules. All line items, customer details,
          and due dates remain preserved to maintain an immutable audit trail.
        </p>
      </div>
    </div>
  );
}
