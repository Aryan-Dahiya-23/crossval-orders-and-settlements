import type { OrderStatus } from "@crossval/contracts";

import { statusLabel } from "../../lib/format";
import { StatusBadge as AlignStatusBadge } from "../ui/status-badge";

const statusTone: Record<
  OrderStatus,
  "neutral" | "info" | "success" | "danger"
> = {
  pending: "neutral",
  partially_paid: "info",
  paid: "success",
  overdue: "danger",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <AlignStatusBadge tone={statusTone[status]}>
      {statusLabel(status)}
    </AlignStatusBadge>
  );
}
