# Architectural Plan: Order Actions, Delete Dialog, and Lock Banner (Milestone 1 / Phase 8)

## 1. Executive Summary & Problem Scope

In CrossVal Orders & Settlements, order lifecycle operations must uphold strict financial domain invariants:
- **Unpaid orders (`paymentCount === 0`)**: Fully editable and deletable by the owning user.
- **Settled/Locked orders (`paymentCount > 0`)**: Fully immutable. Edits and deletions are rejected by the API (`409 ORDER_LOCKED_AFTER_PAYMENT`) and must be guarded in the UI with explicit, restrained B2B explanations.
- **Settlement Actions**: "Record Payment" is available while `balanceDueCents > 0`, transitioning to an immutable "Paid in full" badge when `balanceDueCents === 0`.

This plan specifies the architecture, component hierarchy, exact code blueprints, state management, and edge-case defenses for:
1. `apps/web/components/orders/order-action-bar.tsx` — Unified action container (Edit, Delete, Record Payment / Paid in Full).
2. `apps/web/components/orders/order-delete-dialog.tsx` — Accessible confirmation modal for permanent unpaid order deletion.
3. `apps/web/components/orders/order-lock-banner.tsx` — Contextual explanation banner for locked orders.
4. `apps/web/features/orders/api.ts` & `apps/web/features/orders/queries.ts` — API client method (`deleteOrder`) and React Query hook (`useDeleteOrder`).
5. Integration into `apps/web/components/orders/order-detail-workspace.tsx`.

---

## 2. Component Hierarchy & Flow

```text
OrderDetailWorkspace
├── AppShell (Sidebar, Header, Breadcrumbs)
├── OrderDetailContent
│   ├── Navigation Link ("All orders")
│   ├── Order Header
│   │   ├── Identity (displayId, StatusBadge, customerName, dueDate)
│   │   └── OrderActionBar
│   │       ├── Edit Button (Active Link to /orders/[id]/edit or Disabled with lock note)
│   │       ├── Delete Button (Triggers OrderDeleteDialog or Disabled with lock note)
│   │       └── Record Payment Button / "Paid in full" Badge
│   ├── OrderLockBanner (Rendered if !isEditable / payments exist)
│   ├── Payment Success Alert (Ephemeral)
│   ├── FinancialMetric Summary (Total, Paid, Balance due)
│   ├── LineItemsTable
│   ├── PaymentHistory
│   ├── PaymentDialog (Existing Radix modal)
│   └── OrderDeleteDialog (New Radix modal)
```

---

## 3. Detailed Component Blueprints

### 3.1. API & React Query Additions

#### `apps/web/features/orders/api.ts`
Add the `deleteOrder` function:
```typescript
export const deleteOrder = async (
  orderId: string,
  signal?: AbortSignal,
): Promise<void> => {
  await apiRequest<void>(`/orders/${orderId}`, {
    method: "DELETE",
    ...(signal !== undefined && { signal }),
  });
};
```

#### `apps/web/features/orders/queries.ts`
Add the `useDeleteOrder` mutation hook:
```typescript
export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => deleteOrder(orderId),
    onSuccess: async (_data, orderId) => {
      // Remove specific detail query from cache
      queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) });
      // Invalidate list and summary aggregates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);
    },
  });
};
```

---

### 3.2. Order Action Bar (`apps/web/components/orders/order-action-bar.tsx`)

#### Responsibilities:
- Renders three contextual actions: Edit, Delete, and Record Payment.
- Dynamically enables or disables Edit and Delete based on `order.isEditable` / `order.isDeletable`.
- Displays authoritative tooltips/titles when disabled to explain why the action is locked.
- Switches between "Record payment" button and "Paid in full" status badge based on `order.balanceDueCents`.

#### Code Blueprint:
```tsx
"use client";

import type { OrderDetail } from "@crossval/contracts";
import {
  RiCheckboxCircleLine,
  RiDeleteBinLine,
  RiEditLine,
  RiMoneyDollarCircleLine,
} from "@remixicon/react";
import Link from "next/link";

import { cn } from "../../lib/cn";
import { Button } from "../ui/button";

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
  const isLocked = !order.isEditable;
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
        <Button asChild variant="secondary" size="medium">
          <Link
            href={`/orders/${order.id}/edit`}
            aria-label={`Edit order ${order.displayId}`}
          >
            <RiEditLine className="size-[18px]" />
            Edit order
          </Link>
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="medium"
          disabled
          title="Orders with recorded payments cannot be modified."
          aria-label="Edit order (locked - order has payments)"
        >
          <RiEditLine className="size-[18px]" />
          Edit order
        </Button>
      )}

      {/* Delete Order Action */}
      {order.isDeletable ? (
        <Button
          variant="secondary"
          size="medium"
          type="button"
          onClick={onOpenDelete}
          className="hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          aria-label={`Delete order ${order.displayId}`}
        >
          <RiDeleteBinLine className="size-[18px]" />
          Delete
        </Button>
      ) : (
        <Button
          variant="secondary"
          size="medium"
          disabled
          title="Orders with recorded payments cannot be deleted."
          aria-label="Delete order (locked - order has payments)"
        >
          <RiDeleteBinLine className="size-[18px]" />
          Delete
        </Button>
      )}

      {/* Settlement Action */}
      {!isPaidInFull ? (
        <Button type="button" size="medium" onClick={onOpenPayment}>
          <RiMoneyDollarCircleLine className="size-[18px]" />
          Record payment
        </Button>
      ) : (
        <span className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
          <RiCheckboxCircleLine className="size-[18px]" />
          Paid in full
        </span>
      )}
    </div>
  );
}
```

---

### 3.3. Order Delete Dialog (`apps/web/components/orders/order-delete-dialog.tsx`)

#### Responsibilities:
- Radix Dialog backed modal confirming destructive order deletion.
- Displays key order identification (display ID, customer name, total amount).
- Clear warning that deletion is irreversible.
- Disables interaction while mutation is executing.
- Handles unexpected and concurrency errors (e.g. `409 ORDER_LOCKED_AFTER_PAYMENT` if a payment was registered in another tab/client).
- On success: navigates cleanly to `/orders` dashboard.

#### Code Blueprint:
```tsx
"use client";

import type { OrderDetail } from "@crossval/contracts";
import { RiAlertLine, RiDeleteBinLine } from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useDeleteOrder } from "../../features/orders/queries";
import { ApiError } from "../../lib/api-client";
import { formatUsd } from "../../lib/format";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";

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
      setServerError("An unexpected error occurred while deleting the order. Please try again.");
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !deleteMutation.isPending) {
          setServerError(null);
          onClose();
        }
      }}
      title="Delete order"
      description={`Permanently remove order ${order.displayId} from your workspace.`}
      footer={
        <>
          <Button
            variant="secondary"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => void handleDelete()}
          >
            <RiDeleteBinLine className="size-[18px]" />
            {deleteMutation.isPending ? "Deleting…" : "Delete order"}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {/* Order identification summary */}
        <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="font-mono font-medium">{order.displayId}</span>
            <span>Unpaid order</span>
          </div>
          <p className="mt-1 font-semibold text-slate-950">
            {order.customerName}
          </p>
          <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-3 text-xs">
            <span className="text-slate-500">Total amount</span>
            <strong className="text-sm font-semibold tabular-nums text-slate-950">
              {formatUsd(order.totalAmountCents)}
            </strong>
          </div>
        </div>

        {/* Warning text */}
        <div className="flex gap-2.5 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <RiAlertLine className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <p className="text-xs leading-5">
            This action cannot be undone. All line items associated with this
            draft order will be permanently removed.
          </p>
        </div>

        {/* Mutation error */}
        {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
      </div>
    </Modal>
  );
}
```

---

### 3.4. Contextual Lock Banner (`apps/web/components/orders/order-lock-banner.tsx`)

#### Responsibilities:
- Clearly articulates the B2B accounting reason why the order is immutable.
- Avoids blaming the user; anchors the message in financial compliance and ledger integrity.
- Styled in a restrained, calm B2B tone.

#### Code Blueprint:
```tsx
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
        "flex items-start gap-3.5 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800 shadow-sm",
        className,
      )}
      role="status"
      aria-label="Order locked notification"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-200/80 text-slate-700">
        <RiLockLine className="size-4" />
      </span>
      <div className="text-sm">
        <strong className="font-semibold text-slate-950">
          Order is locked against edits and deletion
        </strong>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          This order has {paymentCount} recorded settlement
          {paymentCount === 1 ? "" : "s"} and is locked against edits or
          deletion per financial accounting rules. All line items, customer details,
          and due dates remain preserved to maintain an immutable audit trail.
        </p>
      </div>
    </div>
  );
}
```

---

### 3.5. Order Detail Workspace Integration (`apps/web/components/orders/order-detail-workspace.tsx`)

#### Integration Changes:
1. Import `OrderActionBar`, `OrderDeleteDialog`, and `OrderLockBanner`.
2. Add `deleteOpen` state (`const [deleteOpen, setDeleteOpen] = useState(false)`).
3. Replace header action area with `<OrderActionBar ... />`.
4. Render `<OrderLockBanner paymentCount={detail.payments.length} />` right below the header when `!detail.isEditable`.
5. Render `<OrderDeleteDialog open={deleteOpen} order={detail} onClose={() => setDeleteOpen(false)} />`.

```tsx
// Inside OrderDetailContent:
const [deleteOpen, setDeleteOpen] = useState(false);
const [paymentOpen, setPaymentOpen] = useState(false);
const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

      <OrderActionBar
        order={detail}
        onOpenPayment={() => {
          setSuccessMessage(null);
          setPaymentOpen(true);
        }}
        onOpenDelete={() => setDeleteOpen(true)}
      />
    </header>

    {!detail.isEditable ? (
      <div className="mt-5">
        <OrderLockBanner paymentCount={detail.payments.length} />
      </div>
    ) : null}

    {successMessage ? (
      <div className="mt-5">
        <Alert tone="success">{successMessage}</Alert>
      </div>
    ) : null}

    {/* Financial Summary & Tables ... */}

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

    <OrderDeleteDialog
      open={deleteOpen}
      order={detail}
      onClose={() => setDeleteOpen(false)}
    />
  </AppShell>
);
```

---

## 4. State Invariants Matrix

| Order State | `paymentCount` | `balanceDueCents` | Edit Action | Delete Action | Record Payment Action | Lock Banner |
|---|---|---|---|---|---|---|
| **Pending (Unpaid)** | 0 | `totalAmountCents` | Enabled (Link to `/edit`) | Enabled (Opens Delete Dialog) | Enabled (Opens Payment Dialog) | Hidden |
| **Overdue (Unpaid)** | 0 | `totalAmountCents` | Enabled (Link to `/edit`) | Enabled (Opens Delete Dialog) | Enabled (Opens Payment Dialog) | Hidden |
| **Partially Paid** | >= 1 | `0 < balance < total` | Disabled with lock note | Disabled with lock note | Enabled (Opens Payment Dialog) | Visible |
| **Overdue (Partially Paid)** | >= 1 | `0 < balance < total` | Disabled with lock note | Disabled with lock note | Enabled (Opens Payment Dialog) | Visible |
| **Paid in Full** | >= 1 | 0 | Disabled with lock note | Disabled with lock note | Replaced with "Paid in full" badge | Visible |

---

## 5. Concurrency & Error Defenses

1. **Delete on Concurrently Paid Order**:
   - Predicate in API: `deleteOne({ _id, userId, paymentCount: 0 })`.
   - If a payment commits first, `paymentCount` becomes > 0. The delete returns `409 ORDER_LOCKED_AFTER_PAYMENT`.
   - Frontend `OrderDeleteDialog` catches `ApiError` code `ORDER_LOCKED_AFTER_PAYMENT` and renders an explicit message: *"This order cannot be deleted because a payment was recorded. The order is now locked."*
2. **Cache Coherency**:
   - Deletion removes `orderKeys.detail(orderId)` from cache and invalidates `orderKeys.lists()` and `orderKeys.summaries()`.
   - Navigation to `/orders` displays the up-to-date table and updated summary cards without stale row remnants.
3. **Double-Click & Rapid Submission Protection**:
   - `disabled={deleteMutation.isPending}` on both dialog action buttons.
   - Text switches to `"Deleting…"` to provide clear feedback.

---

## 6. Accessibility & UX Review

- **Radix Dialog Primitives**: Built on `@radix-ui/react-dialog` with focus trap, `Escape` key handling, and focus return to trigger.
- **Accessible Names**: All buttons have semantic labels and `aria-label` attributes where appropriate.
- **Color + Text**: Statuses and warnings use semantic icons and accompanying descriptive text; never color alone.
- **Responsive Layout**: Action bar flexes gracefully; dialog fits viewport on 320px+ mobile screens with scrolling body if needed.

---

## 7. Implementation File Checklist

| File | Change Type | Purpose |
|---|---|---|
| `apps/web/features/orders/api.ts` | Update | Add `deleteOrder(orderId, signal)` |
| `apps/web/features/orders/queries.ts` | Update | Add `useDeleteOrder()` with cache invalidation |
| `apps/web/components/orders/order-action-bar.tsx` | Create | Action buttons for Edit, Delete, Record Payment |
| `apps/web/components/orders/order-delete-dialog.tsx` | Create | Delete confirmation modal |
| `apps/web/components/orders/order-lock-banner.tsx` | Create | Lock banner for orders with payments |
| `apps/web/components/orders/order-detail-workspace.tsx` | Update | Integrate action bar, lock banner, and delete dialog |
