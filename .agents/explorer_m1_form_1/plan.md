# Architectural Plan & Implementation Blueprint: Order Form & Create/Edit Routes (Milestone 1 / Phase 8)

## 1. Executive Summary & Problem Scope

In CrossVal Orders & Settlements, order lifecycle management enables finance operators to create and update multi-item customer receivable orders with strict financial integrity guarantees.

### Key Domain Invariants & Requirements
1. **USD Currency & Integer Cents**: The system authoritatively stores and transports all money values as integer cents (`totalAmountCents`, `unitPriceCents`, `lineTotalCents`). The UI accepts and displays decimal dollar values (e.g. `$1,000.00`, `$45.50`), converting cleanly to positive integer cents without floating-point rounding errors.
2. **Authoritative Line Items**: An order consists of 1 to 100 line items. Each line item has a description (1–500 chars), integer quantity (1–1,000,000), and unit price in integer cents (1–999,999,999 cents).
3. **Real-Time Client Calculations**: As the user edits line item quantities and unit prices, the UI computes and updates individual line totals (`quantity * unitPriceCents`) and the order total in real time.
4. **Strict Immutability on Paid Orders**:
   - An order with zero recorded payments (`paymentCount === 0`) is editable and replaceable in full via `PATCH /orders/:id`.
   - Once an order receives its first payment (`paymentCount > 0` or `payments.length > 0`), it becomes permanently read-only to preserve an immutable financial audit ledger.
   - The `/orders/[orderId]/edit` route strictly enforces this guard: if an order is locked, it prevents editing, displays a clear B2B audit trail explanation, and provides direct navigation back to the order details.
5. **Seamless Navigation & Cache Reconciliation**:
   - Creating an order at `/orders/new` redirects to `/orders/[orderId]` on success, immediately populating the React Query cache and invalidating dashboard list and portfolio summary queries.
   - Editing an unpaid order at `/orders/[orderId]/edit` replaces the order document, updates the detail cache, and redirects back to `/orders/[orderId]`.

---

## 2. File Placement & Architecture Layout

The `@crossval/web` package follows Next.js App Router conventions with domain feature modules:

| Component / File | File Path | Purpose |
|---|---|---|
| **Order Form Component** | `apps/web/components/orders/order-form.tsx` | Reusable React Hook Form + Zod component for creating and editing orders with dynamic line items and real-time total previews |
| **Create Order Route** | `apps/web/app/orders/new/page.tsx` | Next.js server page rendering the create order workspace |
| **Create Order Workspace** | `apps/web/components/orders/create-order-workspace.tsx` | Client workspace handling page layout, breadcrumbs, `useCreateOrder` mutation, and redirect |
| **Edit Order Route** | `apps/web/app/orders/[orderId]/edit/page.tsx` | Next.js server page accepting asynchronous route params (`params: Promise<{ orderId: string }>`) |
| **Edit Order Workspace** | `apps/web/components/orders/edit-order-workspace.tsx` | Client workspace handling order loading, immutability guard, prefilled form, `useReplaceOrder` mutation, and redirect |
| **Locked Order Guard View** | `apps/web/components/orders/order-edit-guard.tsx` | Informative notice for locked orders with recorded payments |
| **Order Form Unit Tests** | `apps/web/components/orders/order-form.test.tsx` | Vitest component tests verifying validation, real-time calculations, dynamic items, and submission conversion |

---

## 3. Data Flow & Decimal-to-Cents Conversion Logic

### 3.1. Deterministic Money Conversion Helpers

To prevent IEEE-754 floating-point inaccuracies (such as `0.1 + 0.2 === 0.30000000000000004`), money conversion uses string parsing:

```typescript
/**
 * Converts a decimal dollar string (e.g. "125.50", "100", "0.99") into integer cents.
 * Returns null if the string is empty or does not match valid currency format.
 */
export const decimalToCents = (value: string | number): number | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = whole * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
};

/**
 * Formats integer cents into standard decimal string with 2 decimal places for form inputs (e.g. 10500 -> "105.00").
 */
export const centsToDecimalString = (cents: number): string => {
  return (cents / 100).toFixed(2);
};
```

---

## 4. Detailed Component Blueprints

### 4.1. Order Form Component (`apps/web/components/orders/order-form.tsx`)

#### Responsibilities:
- Form state management using `react-hook-form` and `@hookform/resolvers/zod`.
- Dynamic item array management using `useFieldArray`.
- Real-time line item subtotal and grand total calculation using `useWatch`.
- Clean tabular inputs on desktop with responsive card fallback on mobile.
- Server-side error mapping and client-side validation messages.

#### Complete Code Blueprint:

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateOrderRequest, ReplaceOrderRequest } from "@crossval/contracts";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiFileList3Line,
  RiInformationLine,
} from "@remixicon/react";
import Link from "next/link";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { formatUsd } from "../../lib/format";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/input";

export const decimalToCents = (value: string | number): number | null => {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null;
    return Math.round(value * 100);
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = whole * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
};

export const centsToDecimalString = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

const maximumOrderAmountCents = 999_999_999;

export const orderLineItemFormSchema = z.strictObject({
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(500, "Description must contain at most 500 characters."),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity is required." })
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(1_000_000, "Quantity must not exceed 1,000,000."),
  unitPrice: z
    .string()
    .trim()
    .min(1, "Unit price is required.")
    .regex(/^\d+(?:\.\d{1,2})?$/, "Enter a valid dollar amount (e.g. 25.00).")
    .refine((val) => {
      const cents = decimalToCents(val);
      return cents !== null && cents >= 1;
    }, "Unit price must be at least $0.01.")
    .refine((val) => {
      const cents = decimalToCents(val);
      return cents !== null && cents <= maximumOrderAmountCents;
    }, "Unit price exceeds maximum allowed value ($9,999,999.99)."),
});

export const orderFormSchema = z
  .strictObject({
    customerName: z
      .string()
      .trim()
      .min(1, "Customer name is required.")
      .max(200, "Customer name must contain at most 200 characters."),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD format."),
    items: z
      .array(orderLineItemFormSchema)
      .min(1, "At least one line item is required.")
      .max(100, "An order can contain at most 100 line items."),
  })
  .superRefine((data, ctx) => {
    let grandTotalCents = 0;
    data.items.forEach((item, index) => {
      const cents = decimalToCents(item.unitPrice);
      const qty = item.quantity;
      if (cents !== null && Number.isSafeInteger(qty) && qty > 0) {
        const lineTotal = cents * qty;
        if (lineTotal > maximumOrderAmountCents) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Line item total exceeds the maximum allowed order value.",
            path: ["items", index, "unitPrice"],
          });
        }
        grandTotalCents += lineTotal;
      }
    });

    if (grandTotalCents > maximumOrderAmountCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Order total exceeds the maximum allowed value ($9,999,999.99).",
        path: ["items"],
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export interface OrderFormProps {
  initialValues?: {
    customerName?: string;
    dueDate?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: string;
    }>;
  };
  onSubmit: (values: CreateOrderRequest | ReplaceOrderRequest) => Promise<void>;
  isSubmitting: boolean;
  mode?: "create" | "edit";
  cancelHref?: string;
  serverError?: string | null;
}

export function OrderForm({
  initialValues,
  onSubmit,
  isSubmitting,
  mode = "create",
  cancelHref = "/orders",
  serverError,
}: OrderFormProps) {
  const todayUtc = new Date().toISOString().slice(0, 10);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: initialValues?.customerName ?? "",
      dueDate: initialValues?.dueDate ?? todayUtc,
      items: initialValues?.items && initialValues.items.length > 0
        ? initialValues.items
        : [{ description: "", quantity: 1, unitPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch items in real time for dynamic line total & grand total calculation
  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  }) ?? [];

  const calculatedItems = watchedItems.map((item) => {
    const qty = Number(item?.quantity) || 0;
    const cents = decimalToCents(item?.unitPrice ?? "");
    const isValid = cents !== null && qty > 0 && Number.isSafeInteger(qty);
    const lineTotalCents = isValid ? cents * qty : 0;
    return {
      qty,
      cents: cents ?? 0,
      lineTotalCents,
      isValid,
    };
  });

  const grandTotalCents = calculatedItems.reduce(
    (acc, curr) => acc + curr.lineTotalCents,
    0,
  );

  const handleFormSubmit = form.handleSubmit(async (data) => {
    const payload: CreateOrderRequest = {
      customerName: data.customerName.trim(),
      dueDate: data.dueDate,
      items: data.items.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPriceCents: decimalToCents(item.unitPrice)!,
      })),
    };
    await onSubmit(payload);
  });

  return (
    <form
      id="order-form"
      className="space-y-6"
      noValidate
      onSubmit={(e) => void handleFormSubmit(e)}
    >
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      {/* Customer & Order Terms Card */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="customer-details-heading"
      >
        <h2
          id="customer-details-heading"
          className="text-base font-semibold text-slate-950"
        >
          Customer &amp; Terms
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Enter the billing entity name and the payment settlement due date.
        </p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Field
            label="Customer name"
            htmlFor="customerName"
            error={form.formState.errors.customerName?.message}
          >
            <Input
              id="customerName"
              placeholder="e.g. Acme Corporation"
              autoComplete="organization"
              aria-invalid={form.formState.errors.customerName !== undefined}
              {...form.register("customerName")}
            />
          </Field>

          <Field
            label="Due date"
            htmlFor="dueDate"
            error={form.formState.errors.dueDate?.message}
            hint="Date-only format (YYYY-MM-DD) used for overdue status calculation."
          >
            <Input
              id="dueDate"
              type="date"
              aria-invalid={form.formState.errors.dueDate !== undefined}
              {...form.register("dueDate")}
            />
          </Field>
        </div>
      </section>

      {/* Line Items Card */}
      <section
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        aria-labelledby="line-items-heading"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="line-items-heading"
              className="text-base font-semibold text-slate-950"
            >
              Line Items
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Add products, services, or billable deliverables. Subtotals calculate automatically.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() =>
              append({ description: "", quantity: 1, unitPrice: "" })
            }
            disabled={fields.length >= 100 || isSubmitting}
          >
            <RiAddLine className="size-4" />
            Add item
          </Button>
        </div>

        {form.formState.errors.items?.root?.message ? (
          <p className="mt-3 text-xs text-red-600" role="alert">
            {form.formState.errors.items.root.message}
          </p>
        ) : null}

        {/* Desktop Table View */}
        <div className="mt-5 hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="w-10 px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="w-28 px-3 py-2.5 text-center">Quantity</th>
                <th className="w-36 px-3 py-2.5 text-right">Unit price ($)</th>
                <th className="w-36 px-3 py-2.5 text-right">Line total</th>
                <th className="w-12 px-2 py-2.5 text-center" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, index) => {
                const itemCalc = calculatedItems[index] ?? {
                  lineTotalCents: 0,
                  isValid: false,
                };
                const descError = form.formState.errors.items?.[index]?.description?.message;
                const qtyError = form.formState.errors.items?.[index]?.quantity?.message;
                const priceError = form.formState.errors.items?.[index]?.unitPrice?.message;

                return (
                  <tr key={field.id} className="align-top">
                    <td className="px-3 pt-5 text-center font-mono text-xs text-slate-400">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        placeholder="Item description"
                        aria-label={`Item ${index + 1} description`}
                        aria-invalid={descError !== undefined}
                        {...form.register(`items.${index}.description`)}
                      />
                      {descError ? (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {descError}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        type="number"
                        min={1}
                        max={1000000}
                        className="text-center tabular-nums"
                        aria-label={`Item ${index + 1} quantity`}
                        aria-invalid={qtyError !== undefined}
                        {...form.register(`items.${index}.quantity`)}
                      />
                      {qtyError ? (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {qtyError}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          $
                        </span>
                        <Input
                          placeholder="0.00"
                          className="pl-6 text-right tabular-nums"
                          aria-label={`Item ${index + 1} unit price`}
                          aria-invalid={priceError !== undefined}
                          {...form.register(`items.${index}.unitPrice`)}
                        />
                      </div>
                      {priceError ? (
                        <p className="mt-1 text-xs text-red-600" role="alert">
                          {priceError}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 pt-5 text-right font-semibold tabular-nums text-slate-950">
                      {itemCalc.isValid
                        ? formatUsd(itemCalc.lineTotalCents)
                        : "—"}
                    </td>
                    <td className="px-2 pt-3 text-center">
                      <button
                        type="button"
                        className="grid size-9 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1 || isSubmitting}
                        aria-label={`Remove item ${index + 1}`}
                        title={fields.length <= 1 ? "An order requires at least one line item" : "Remove item"}
                      >
                        <RiDeleteBinLine className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (for < 640px) */}
        <div className="mt-4 space-y-4 sm:hidden">
          {fields.map((field, index) => {
            const itemCalc = calculatedItems[index] ?? {
              lineTotalCents: 0,
              isValid: false,
            };
            const descError = form.formState.errors.items?.[index]?.description?.message;
            const qtyError = form.formState.errors.items?.[index]?.quantity?.message;
            const priceError = form.formState.errors.items?.[index]?.unitPrice?.message;

            return (
              <div
                key={field.id}
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Item #{index + 1}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600 disabled:opacity-30"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1 || isSubmitting}
                  >
                    Remove
                  </button>
                </div>

                <div className="mt-3 space-y-3">
                  <Field
                    label="Description"
                    htmlFor={`item-${index}-desc`}
                    error={descError}
                  >
                    <Input
                      id={`item-${index}-desc`}
                      placeholder="Item description"
                      {...form.register(`items.${index}.description`)}
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="Quantity"
                      htmlFor={`item-${index}-qty`}
                      error={qtyError}
                    >
                      <Input
                        id={`item-${index}-qty`}
                        type="number"
                        min={1}
                        className="text-center tabular-nums"
                        {...form.register(`items.${index}.quantity`)}
                      />
                    </Field>

                    <Field
                      label="Unit price ($)"
                      htmlFor={`item-${index}-price`}
                      error={priceError}
                    >
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          $
                        </span>
                        <Input
                          id={`item-${index}-price`}
                          placeholder="0.00"
                          className="pl-6 text-right tabular-nums"
                          {...form.register(`items.${index}.unitPrice`)}
                        />
                      </div>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-xs">
                    <span className="text-slate-500">Line subtotal:</span>
                    <strong className="font-semibold tabular-nums text-slate-950">
                      {itemCalc.isValid
                        ? formatUsd(itemCalc.lineTotalCents)
                        : "—"}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order Financial Grand Total Bar */}
        <div className="mt-6 flex flex-col gap-3 rounded-lg bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <RiFileList3Line className="size-4 text-slate-400" />
            <span>
              {fields.length} line item{fields.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 sm:justify-end">
            <span className="text-sm font-medium text-slate-600">
              Total order amount:
            </span>
            <strong className="text-xl font-semibold tracking-[-0.03em] tabular-nums text-slate-950 sm:text-2xl">
              {formatUsd(grandTotalCents)}
            </strong>
          </div>
        </div>
      </section>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button asChild variant="secondary" disabled={isSubmitting}>
          <Link href={cancelHref}>Cancel</Link>
        </Button>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating order…"
              : "Saving changes…"
            : mode === "create"
              ? "Create order"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
```

---

### 4.2. Create Order Route & Workspace

#### File 1: `apps/web/app/orders/new/page.tsx`
```tsx
import type { Metadata } from "next";

import { CreateOrderWorkspace } from "../../../components/orders/create-order-workspace";

export const metadata: Metadata = { title: "New order | CrossVal" };

export default function NewOrderPage() {
  return <CreateOrderWorkspace />;
}
```

#### File 2: `apps/web/components/orders/create-order-workspace.tsx`
```tsx
"use client";

import type { CreateOrderRequest, Viewer } from "@crossval/contracts";
import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCreateOrder } from "../../features/orders/queries";
import { parseOrderApiError, applyApiFieldErrorsToForm } from "../../features/orders/errors";
import { ProtectedRoute } from "../auth/auth-boundary";
import { AppShell } from "../layout/app-shell";
import { PageHeader } from "../layout/page-header";
import { OrderForm } from "./order-form";

export function CreateOrderWorkspace() {
  return (
    <ProtectedRoute>
      {(viewer) => <CreateOrderContent viewer={viewer} />}
    </ProtectedRoute>
  );
}

function CreateOrderContent({ viewer }: { viewer: Viewer }) {
  const router = useRouter();
  const createMutation = useCreateOrder();
  const [serverError, setServerError] = useState<string | null>(null);

  const handleCreate = async (payload: CreateOrderRequest) => {
    setServerError(null);
    try {
      const created = await createMutation.mutateAsync(payload);
      router.push(`/orders/${created.id}`);
    } catch (error: unknown) {
      const parsed = parseOrderApiError(error);
      setServerError(parsed.message);
    }
  };

  return (
    <AppShell viewer={viewer}>
      <Link
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 outline-none transition hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950"
        href="/orders"
      >
        <RiArrowLeftLine className="size-4" />
        All orders
      </Link>

      <div className="mt-4 mb-6">
        <PageHeader
          eyebrow="Finance operations"
          title="Create order"
          description="Draft a new receivable order with custom line items and settlement due date."
        />
      </div>

      <div className="max-w-4xl">
        <OrderForm
          mode="create"
          onSubmit={handleCreate}
          isSubmitting={createMutation.isPending}
          cancelHref="/orders"
          serverError={serverError}
        />
      </div>
    </AppShell>
  );
}
```

---

### 4.3. Edit Order Route, Workspace & Immutability Guard

#### File 1: `apps/web/app/orders/[orderId]/edit/page.tsx`
```tsx
import type { Metadata } from "next";

import { EditOrderWorkspace } from "../../../../components/orders/edit-order-workspace";

export const metadata: Metadata = { title: "Edit order | CrossVal" };

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <EditOrderWorkspace orderId={orderId} />;
}
```

#### File 2: `apps/web/components/orders/order-edit-guard.tsx`
```tsx
import type { OrderDetail } from "@crossval/contracts";
import { RiArrowLeftLine, RiEyeLine, RiLockLine } from "@remixicon/react";
import Link from "next/link";

import { formatDateOnly, formatUsd } from "../../lib/format";
import { Button } from "../ui/button";

export interface OrderEditGuardProps {
  order: OrderDetail;
}

export function OrderEditGuard({ order }: OrderEditGuardProps) {
  const settlementCount = order.payments.length;

  return (
    <div className="mx-auto max-w-xl py-12 text-center" role="alert">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-slate-100 text-slate-800 shadow-sm ring-1 ring-slate-200">
        <RiLockLine className="size-6" />
      </span>

      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 font-mono">
        {order.displayId}
      </p>

      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
        Order is locked against modification
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        This order has {settlementCount} recorded settlement
        {settlementCount === 1 ? "" : "s"} totalling{" "}
        <strong className="font-semibold text-slate-900">
          {formatUsd(order.paidAmountCents)}
        </strong>
        . Under financial accounting standards, orders with recorded payments
        are permanently locked to preserve ledger auditability and prevent balance drift.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="primary">
          <Link href={`/orders/${order.id}`}>
            <RiEyeLine className="size-4" />
            View order details
          </Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="/orders">
            <RiArrowLeftLine className="size-4" />
            Back to orders
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

#### File 3: `apps/web/components/orders/edit-order-workspace.tsx`
```tsx
"use client";

import type { ReplaceOrderRequest, Viewer } from "@crossval/contracts";
import { RiArrowLeftLine, RiMoneyDollarCircleLine } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useOrderDetail, useReplaceOrder } from "../../features/orders/queries";
import { parseOrderApiError } from "../../features/orders/errors";
import { ApiError } from "../../lib/api-client";
import { centsToDecimalString } from "./order-form";
import { ProtectedRoute } from "../auth/auth-boundary";
import { AppShell } from "../layout/app-shell";
import { PageHeader } from "../layout/page-header";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { OrderEditGuard } from "./order-edit-guard";
import { OrderForm } from "./order-form";

export function EditOrderWorkspace({ orderId }: { orderId: string }) {
  return (
    <ProtectedRoute>
      {(viewer) => <EditOrderContent orderId={orderId} viewer={viewer} />}
    </ProtectedRoute>
  );
}

function EditOrderContent({
  orderId,
  viewer,
}: {
  orderId: string;
  viewer: Viewer;
}) {
  const router = useRouter();
  const orderQuery = useOrderDetail(orderId);
  const replaceMutation = useReplaceOrder(orderId);
  const [serverError, setServerError] = useState<string | null>(null);

  if (orderQuery.isPending) {
    return <EditOrderLoading viewer={viewer} />;
  }

  if (orderQuery.isError) {
    const notFound =
      orderQuery.error instanceof ApiError && orderQuery.error.status === 404;
    return (
      <AppShell viewer={viewer}>
        <div
          className="mx-auto grid min-h-[60vh] max-w-xl place-items-center text-center"
          role="alert"
        >
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
              <RiMoneyDollarCircleLine className="size-5" />
            </span>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
              {notFound
                ? "This order isn't available"
                : "The order couldn't be loaded"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {notFound
                ? "It may not exist or may belong to another workspace."
                : "Check the API connection and try again."}
            </p>
            <Button asChild className="mt-5" variant="secondary">
              <Link href="/orders">Back to orders</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const order = orderQuery.data;

  // Immutability Guard: If order has any payments recorded, prevent edit
  if (!order.isEditable || order.payments.length > 0) {
    return (
      <AppShell viewer={viewer}>
        <Link
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 outline-none transition hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950"
          href={`/orders/${order.id}`}
        >
          <RiArrowLeftLine className="size-4" />
          Back to order details
        </Link>
        <OrderEditGuard order={order} />
      </AppShell>
    );
  }

  const handleReplace = async (payload: ReplaceOrderRequest) => {
    setServerError(null);
    try {
      await replaceMutation.mutateAsync(payload);
      router.push(`/orders/${order.id}`);
    } catch (error: unknown) {
      const parsed = parseOrderApiError(error);
      if (parsed.isLocked) {
        // Handle race condition where payment committed concurrently
        await orderQuery.refetch();
        return;
      }
      setServerError(parsed.message);
    }
  };

  const initialFormValues = {
    customerName: order.customerName,
    dueDate: order.dueDate,
    items: order.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: centsToDecimalString(item.unitPriceCents),
    })),
  };

  return (
    <AppShell viewer={viewer}>
      <Link
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-slate-500 outline-none transition hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950"
        href={`/orders/${order.id}`}
      >
        <RiArrowLeftLine className="size-4" />
        Back to order details
      </Link>

      <div className="mt-4 mb-6">
        <PageHeader
          eyebrow={`Edit order ${order.displayId}`}
          title={`Edit ${order.customerName}`}
          description="Update customer name, due date, or line items. The order total will recalculate automatically."
        />
      </div>

      <div className="max-w-4xl">
        <OrderForm
          mode="edit"
          initialValues={initialFormValues}
          onSubmit={handleReplace}
          isSubmitting={replaceMutation.isPending}
          cancelHref={`/orders/${order.id}`}
          serverError={serverError}
        />
      </div>
    </AppShell>
  );
}

function EditOrderLoading({ viewer }: { viewer: Viewer }) {
  return (
    <AppShell viewer={viewer}>
      <div className="space-y-6 max-w-4xl" aria-busy="true" aria-label="Loading order for editing">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    </AppShell>
  );
}
```

---

## 5. Dashboard Action Button Integration

To complete the end-to-end user journey, the primary orders dashboard page header and empty state should link directly to `/orders/new`:

In `apps/web/components/orders/orders-dashboard.tsx`:
```tsx
<PageHeader
  eyebrow="Finance operations"
  title="Orders & settlements"
  description="Monitor receivables, follow balances, and keep every settlement traceable from one operational view."
  action={
    <Button asChild>
      <Link href="/orders/new">
        <RiAddLine className="size-[18px]" />
        New order
      </Link>
    </Button>
  }
/>
```

---

## 6. Unit Testing Strategy

Component and form unit tests (`apps/web/components/orders/order-form.test.tsx`):
1. **Initial Rendering**: Renders customer name, due date, and one default line item row with empty description and unit price.
2. **Dynamic Add / Remove**:
   - Clicking "Add item" appends a new item row to the table.
   - Clicking "Remove" on an item removes the row.
   - When only 1 item exists, "Remove" is disabled.
3. **Real-Time Calculations**:
   - Setting quantity `2` and unit price `50.00` immediately previews `$100.00` line total.
   - Grand total sums all valid line item totals.
4. **Validation Enforcement**:
   - Empty customer name triggers `"Customer name is required."`.
   - Invalid unit price format (e.g. `"abc"` or `"12.345"`) triggers formatting error.
   - Zero or negative quantity triggers quantity error.
5. **Payload Integer-Cent Conversion**:
   - Submitting valid form values calls `onSubmit` with unit prices accurately converted to integer cents (`"50.00"` -> `5000`).

---

## 7. Implementation Checklist

- [ ] **Step 1**: Create `apps/web/components/orders/order-form.tsx` with Zod validation, `useFieldArray`, `useWatch` subtotals, and integer-cent conversion.
- [ ] **Step 2**: Create `apps/web/app/orders/new/page.tsx` and `apps/web/components/orders/create-order-workspace.tsx` with `useCreateOrder` mutation and redirect.
- [ ] **Step 3**: Create `apps/web/components/orders/order-edit-guard.tsx` for locked orders.
- [ ] **Step 4**: Create `apps/web/app/orders/[orderId]/edit/page.tsx` and `apps/web/components/orders/edit-order-workspace.tsx` with prefilled values, `useReplaceOrder` mutation, and immutability guard.
- [ ] **Step 5**: Update `apps/web/components/orders/orders-dashboard.tsx` to add "New order" button to page header.
- [ ] **Step 6**: Create `apps/web/components/orders/order-form.test.tsx` and verify test suite with `pnpm test`.
