import type { OrderStatus } from "@crossval/contracts";
import * as StatusBadgePrimitive from "../ui/status-badge";
import { statusLabel } from "../../lib/format";

export function StatusBadge({ status }: { status: OrderStatus }) {
  let statusVariant: "completed" | "pending" | "failed" | "disabled" = "pending";
  let dotColorClass = "";

  switch (status) {
    case "paid":
      statusVariant = "completed";
      dotColorClass = "text-success-base";
      break;
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-blue-500";
      break;
    case "pending":
      statusVariant = "pending";
      dotColorClass = "text-warning-base";
      break;
    case "overdue":
      statusVariant = "failed";
      dotColorClass = "text-error-base";
      break;
  }

  return (
    <StatusBadgePrimitive.Root variant="stroke" status={statusVariant}>
      <StatusBadgePrimitive.Dot className={dotColorClass} />
      {statusLabel(status)}
    </StatusBadgePrimitive.Root>
  );
}
