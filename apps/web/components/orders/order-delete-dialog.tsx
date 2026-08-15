"use client";

import type { OrderDetail } from "@crossval/contracts";
import { RiDeleteBinLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDeleteOrder } from "@/features/orders/queries";
import { ApiError } from "@/lib/api-client";
import { formatUsd } from "@/lib/format";
import { Alert } from "../ui/alert";
import * as Button from "../ui/button";
import * as Modal from "../ui/modal";

export interface OrderDeleteDialogProps {
  open: boolean;
  order: Pick<
    OrderDetail,
    "id" | "displayId" | "customerName" | "totalAmountCents" | "balanceDueCents"
  >;
  onClose: () => void;
}

export function OrderDeleteDialog({
  open,
  order,
  onClose,
}: OrderDeleteDialogProps) {
  const router = useRouter();
  const deleteMutation = useDeleteOrder();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleDelete = async () => {
    setServerError(null);
    try {
      await deleteMutation.mutateAsync(order.id);
      onClose();
      router.push("/orders");
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        if (error.code === "ORDER_LOCKED_AFTER_PAYMENT") {
          setServerError(
            "This order cannot be deleted because a payment was recorded. The order is now locked.",
          );
          return;
        }
        setServerError(error.message);
        return;
      }
      setServerError(
        "An unexpected error occurred while deleting the order. Please try again.",
      );
    }
  };

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen && !deleteMutation.isPending) {
          setServerError(null);
          onClose();
        }
      }}
    >
      <Modal.Content className="max-w-[440px]">
        <Modal.Header
          icon={RiDeleteBinLine}
          title="Delete order"
          description={`Permanently remove order ${order.displayId} from your workspace.`}
        />

        <Modal.Body className="space-y-4">
          {/* Order identification summary */}
          <div className="rounded-xl bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200">
            <div className="flex items-center justify-between gap-3 text-paragraph-xs text-text-sub-600">
              <span className="font-mono font-medium text-text-strong-950">{order.displayId}</span>
              <span>Unpaid order</span>
            </div>
            <p className="mt-1 text-label-sm font-semibold text-text-strong-950">
              {order.customerName}
            </p>
            <div className="mt-3 flex items-baseline justify-between border-t border-stroke-soft-200 pt-3 text-paragraph-xs">
              <span className="text-text-sub-600">Total amount</span>
              <span className="font-semibold tabular-nums text-text-strong-950">
                {formatUsd(order.totalAmountCents)}
              </span>
            </div>
          </div>

          <p className="text-paragraph-xs leading-5 text-text-sub-600">
            This action is permanent and cannot be undone. All associated line
            items will be dropped immediately from your workspace metrics.
          </p>

          {serverError ? (
            <Alert tone="danger">{serverError}</Alert>
          ) : null}
        </Modal.Body>

        <Modal.Footer>
          <Button.Root
            variant="neutral"
            mode="stroke"
            size="medium"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button.Root>
          <Button.Root
            variant="error"
            mode="filled"
            size="medium"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            <Button.Icon as={RiDeleteBinLine} />
            {deleteMutation.isPending ? "Deleting…" : "Delete order"}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

