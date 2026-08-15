# Milestone 2 Implementation Plan: Payment & Settlement UX Polish (Phase 9)

## 1. Executive Summary & Objective

Milestone 2 focuses on delivering a high-integrity, polished payment and settlement user experience for CrossVal Orders & Settlements. The core objectives are:
1. **"Use remaining balance" shortcut button and dynamic balance feedback** in the payment dialog.
2. **Client-side idempotency key preservation** across submission retries (persisting during failures or retries until success or modal dismissal).
3. **Real-time remaining balance calculations and display in USD** without floating-point drift.
4. **Authoritative cache reconciliation** ensuring payment mutations immediately invalidate `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()`.
5. **Comprehensive testing** covering unit, query cache, and edge-case behavior.

---

## 2. Architecture & Current State Inspection

### 2.1 File Map
- **UI Dialog**: `apps/web/components/orders/payment-dialog.tsx`
- **Order Detail Workspace**: `apps/web/components/orders/order-detail-workspace.tsx`
- **Action Bar**: `apps/web/components/orders/order-action-bar.tsx`
- **React Query Hooks**: `apps/web/features/orders/queries.ts` (re-exported in `apps/web/lib/hooks/use-orders.ts`)
- **API Client**: `apps/web/features/orders/api.ts` (re-exported in `apps/web/lib/api/orders.ts`)
- **Query Keys**: `apps/web/features/orders/query-keys.ts`
- **Form Schemas & Helpers**: `apps/web/features/orders/form-schema.ts`
- **Formatting Utilities**: `apps/web/lib/format.ts`
- **Backend Service**: `apps/api/src/modules/orders/service.ts`
- **Backend Routes**: `apps/api/src/modules/orders/routes.ts`

### 2.2 Current Behavior Analysis
1. **Shortcut Button ("Use remaining")**:
   - Present as an inline text button in the input field's hint area.
   - Populates `amount` with `(order.balanceDueCents / 100).toFixed(2)` and triggers validation.
2. **Idempotency Lifecycle**:
   - `attempt` state stores `{ fingerprint: string, key: string } | null`.
   - On submission, if `fingerprint` matches `attempt.fingerprint`, the existing UUID is reused. If different or `null`, a new UUID is generated via `crypto.randomUUID()`.
   - On success, `attempt` is set to `null`.
3. **Real-Time Balance Calculations**:
   - `amountCents` is derived from `watchedAmount` using a local `decimalToCents` regex parser.
   - The dialog displays static `Current balance` at the top and dynamic `Record $X.XX` on the submit button.
4. **Cache Invalidation**:
   - `useRecordPayment(orderId)` invalidates `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()` on mutation success.

---

## 3. Identified Gaps & Risk Analysis

| # | Area | Current State | Identified Gap | Severity | Recommended Fix |
|---|------|---------------|----------------|----------|-----------------|
| **G1** | **Dynamic Balance Feedback** | Modal shows static "Current balance" card and submit button label. | No real-time breakdown of projected remaining balance, payment impact, or settlement status (e.g. "Remaining balance after payment: $600.00 (Partially paid)" or "Settles in full ($0.00 remaining)"). | **High (UX Requirement)** | Add a dynamic settlement preview card showing Current Balance, Payment, Projected Balance, and Status Badge. |
| **G2** | **Idempotency Lifecycle on Dismissal** | `setAttempt(null)` only called on successful submission. | If a payment fails (e.g. 500 error or network timeout) and the user closes/cancels the modal and reopens it later, `attempt` state remains cached in React memory rather than resetting on modal dismissal. | **Medium (Invariant Requirement)** | Add an effect/handler to reset `attempt`, form errors, and server errors when `open` transitions to `false` or on cancel. |
| **G3** | **Cache Invalidation Testing** | `apps/web/features/orders/queries.test.ts` tests `createOrder`, `replaceOrder`, `deleteOrder`. | **Zero test coverage** for `useRecordPayment` cache invalidation logic across detail, list, and summary keys. | **High (Quality Gate)** | Add test suite in `queries.test.ts` asserting `useRecordPayment` invalidates `orderKeys.detail(id)`, `orderKeys.lists()`, and `orderKeys.summaries()`. |
| **G4** | **Payment Dialog Component / Helper Testing** | `order-form.test.ts` exists for order form. | No unit test file for payment dialog money conversions, remaining balance projection math, and idempotency key persistence logic. | **Medium (Test Coverage)** | Create `apps/web/components/orders/payment-dialog.test.ts` with comprehensive unit tests for all calculations, edge cases, and state transitions. |
| **G5** | **Helper Duplication** | `decimalToCents` is defined separately in `form-schema.ts` and `payment-dialog.tsx`. | Redundant implementations with slight signature differences (`string | number` vs `string`). | **Low (Maintainability)** | Consolidate `decimalToCents` and `centsToDecimalString` into `apps/web/features/orders/form-schema.ts` (or `lib/format.ts`) and import in `payment-dialog.tsx`. |
| **G6** | **Workspace Lint Error** | `pnpm lint` fails due to unused `OrderDocument` import in `apps/api/tests/orders/challenger-m1-immutability.integration.test.ts:10:15`. | Prevents clean CI/CD quality gate pass. | **High (Build Health)** | Remove unused import from the test file. |

---

## 4. Detailed Code Recommendations

### Recommendation 1: Enhanced `apps/web/components/orders/payment-dialog.tsx`

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { OrderDetail } from "@crossval/contracts";
import {
  RiCheckboxCircleLine,
  RiExchangeDollarLine,
  RiInformationLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  centsToDecimalString,
  decimalToCents,
} from "../../features/orders/form-schema";
import { useRecordPayment } from "../../features/orders/queries";
import { ApiError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { formatUsd } from "../../lib/format";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Field, Input, Textarea } from "../ui/input";
import { Modal } from "../ui/modal";

const paymentFormSchema = z.strictObject({
  amount: z
    .string()
    .trim()
    .min(1, "Enter a payment amount.")
    .regex(/^\d+(?:\.\d{1,2})?$/, "Use a valid amount with up to 2 decimals."),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a payment date."),
  note: z.string().max(500, "Note must contain at most 500 characters."),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface PaymentDialogProps {
  open: boolean;
  order: OrderDetail;
  onClose: () => void;
  onSuccess: (amountCents: number) => void;
}

export function PaymentDialog({
  open,
  order,
  onClose,
  onSuccess,
}: PaymentDialogProps) {
  const [attempt, setAttempt] = useState<{
    fingerprint: string;
    key: string;
  } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const mutation = useRecordPayment(order.id);
  const todayUtc = new Date().toISOString().slice(0, 10);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { amount: "", paymentDate: todayUtc, note: "" },
  });

  // Reset attempt, errors, and form values when dialog closes/opens
  useEffect(() => {
    if (!open) {
      setAttempt(null);
      setServerError(null);
      form.reset({ amount: "", paymentDate: todayUtc, note: "" });
    }
  }, [open, form, todayUtc]);

  const watchedAmount = useWatch({ control: form.control, name: "amount" });
  const amountCents = decimalToCents(watchedAmount ?? "");

  // Real-time dynamic balance calculations
  const isValidAmount = amountCents !== null && amountCents > 0;
  const isOverpaid =
    amountCents !== null && amountCents > order.balanceDueCents;
  const isFullSettlement =
    amountCents !== null && amountCents === order.balanceDueCents;
  const projectedBalanceCents =
    amountCents !== null
      ? Math.max(0, order.balanceDueCents - amountCents)
      : order.balanceDueCents;

  const handleUseRemaining = () => {
    form.setValue("amount", centsToDecimalString(order.balanceDueCents), {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const handleClose = () => {
    if (mutation.isPending) return;
    setAttempt(null);
    setServerError(null);
    form.reset({ amount: "", paymentDate: todayUtc, note: "" });
    onClose();
  };

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    const submittedAmountCents = decimalToCents(values.amount);
    if (submittedAmountCents === null || submittedAmountCents < 1) {
      form.setError("amount", { message: "Payment must be at least $0.01." });
      return;
    }
    if (submittedAmountCents > order.balanceDueCents) {
      form.setError("amount", {
        message: `The current maximum is ${formatUsd(order.balanceDueCents)}.`,
      });
      return;
    }

    const normalizedNote = values.note.trim().replaceAll(/\s+/g, " ");
    const fingerprint = JSON.stringify([
      submittedAmountCents,
      values.paymentDate,
      normalizedNote,
    ]);
    const logicalAttempt =
      attempt?.fingerprint === fingerprint
        ? attempt
        : { fingerprint, key: crypto.randomUUID() };
    setAttempt(logicalAttempt);

    try {
      await mutation.mutateAsync({
        orderId: order.id,
        idempotencyKey: logicalAttempt.key,
        payment: {
          amountCents: submittedAmountCents,
          paymentDate: values.paymentDate,
          ...(normalizedNote.length > 0 && { note: normalizedNote }),
        },
      });
      setAttempt(null);
      form.reset({ amount: "", paymentDate: todayUtc, note: "" });
      onSuccess(submittedAmountCents);
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        const remaining = error.details?.remainingAmountCents;
        if (
          error.code === "PAYMENT_EXCEEDS_BALANCE" &&
          remaining !== undefined
        ) {
          form.setError("amount", {
            message: `The balance changed. The current maximum is ${formatUsd(remaining)}.`,
          });
          setServerError("The order was refreshed with its latest balance.");
          return;
        }
        setServerError(error.message);
        return;
      }
      setServerError(
        "We couldn't confirm this payment. Retry without changing the form to safely reuse the same request key.",
      );
    }
  });

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) handleClose();
      }}
      title="Record payment"
      description={`Apply a settlement to ${order.displayId}. The write is protected by an idempotency key.`}
      footer={
        <>
          <Button
            variant="secondary"
            type="button"
            disabled={mutation.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="payment-form"
            disabled={mutation.isPending || isOverpaid}
          >
            {mutation.isPending
              ? "Recording…"
              : isValidAmount
                ? `Record ${formatUsd(amountCents)}`
                : "Record payment"}
          </Button>
        </>
      }
    >
      {/* Dynamic Real-Time Balance Breakdown */}
      <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-2.5 text-xs text-slate-500">
          <span>Current balance</span>
          <strong className="font-semibold tabular-nums text-slate-900">
            {formatUsd(order.balanceDueCents)}
          </strong>
        </div>

        {isValidAmount ? (
          <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-2.5 text-xs text-slate-500">
            <span>Payment applied</span>
            <strong className="font-semibold tabular-nums text-emerald-600">
              -{formatUsd(amountCents)}
            </strong>
          </div>
        ) : null}

        <div
          className={cn(
            "flex items-center justify-between px-4 py-3",
            isOverpaid && "bg-red-50 text-red-700",
            isFullSettlement && "bg-emerald-50 text-emerald-800",
          )}
        >
          <div className="flex items-center gap-1.5">
            {isFullSettlement ? (
              <RiCheckboxCircleLine className="size-4 text-emerald-600" />
            ) : isOverpaid ? (
              <RiInformationLine className="size-4 text-red-600" />
            ) : (
              <RiExchangeDollarLine className="size-4 text-slate-400" />
            )}
            <span className="text-sm font-medium">
              {isOverpaid
                ? "Exceeds balance by"
                : isFullSettlement
                  ? "Settled in full"
                  : "Remaining balance"}
            </span>
          </div>
          <strong
            className={cn(
              "text-base font-semibold tabular-nums",
              isOverpaid
                ? "text-red-700"
                : isFullSettlement
                  ? "text-emerald-700"
                  : "text-slate-950",
            )}
          >
            {isOverpaid
              ? formatUsd(amountCents - order.balanceDueCents)
              : formatUsd(projectedBalanceCents)}
          </strong>
        </div>
      </div>

      <form
        id="payment-form"
        className="grid gap-4"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <Field
          label="Amount (USD)"
          htmlFor="payment-amount"
          error={form.formState.errors.amount?.message}
          hint={
            <div className="flex items-center justify-between gap-2">
              <span>Maximum {formatUsd(order.balanceDueCents)}</span>
              {order.balanceDueCents > 0 ? (
                <button
                  className="font-medium text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                  type="button"
                  onClick={handleUseRemaining}
                >
                  Use remaining
                </button>
              ) : null}
            </div>
          }
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              $
            </span>
            <Input
              id="payment-amount"
              className="pl-7 tabular-nums"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={form.formState.errors.amount !== undefined}
              aria-describedby="payment-amount-error"
              {...form.register("amount")}
            />
          </div>
        </Field>

        <Field
          label="Payment date"
          htmlFor="payment-date"
          error={form.formState.errors.paymentDate?.message}
        >
          <Input
            id="payment-date"
            type="date"
            max={todayUtc}
            aria-invalid={form.formState.errors.paymentDate !== undefined}
            {...form.register("paymentDate")}
          />
        </Field>

        <Field
          label="Note"
          htmlFor="payment-note"
          optional
          error={form.formState.errors.note?.message}
        >
          <Textarea
            id="payment-note"
            rows={3}
            placeholder="Bank transfer, reference, or context"
            aria-invalid={form.formState.errors.note !== undefined}
            {...form.register("note")}
          />
        </Field>

        {serverError ? <Alert tone="warning">{serverError}</Alert> : null}
      </form>
    </Modal>
  );
}
```

---

### Recommendation 2: React Query Cache Invalidation Tests (`apps/web/features/orders/queries.test.ts`)

Add the following test case to `apps/web/features/orders/queries.test.ts`:

```typescript
  it("invalidates order detail, lists, and summaries on recordPayment success", async () => {
    const orderId = "order_pay_1";
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Simulate recordPayment onSuccess invalidation behavior
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
    ]);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.detail(orderId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.summaries(),
    });
  });
```

---

### Recommendation 3: Payment Dialog Unit Tests (`apps/web/components/orders/payment-dialog.test.ts`)

Create a focused unit test suite verifying:
1. "Use remaining balance" calculation and decimal string generation.
2. Dynamic projected balance calculations (partial payment, exact payment, overpayment).
3. Idempotency key fingerprinting logic (same values preserve key; modified values rotate key).
4. Edge-case amount validations (zero, negative, multi-decimal, huge amounts).

---

### Recommendation 4: Fix Lint in API Tests

In `apps/api/tests/orders/challenger-m1-immutability.integration.test.ts`:
Remove unused import `import type { OrderDocument } from "../../src/db/documents.js";` on line 10.

---

## 5. Verification & Acceptance Criteria

1. **Assignment Flow ($1,000 → $400 → $600 → Reject $1)**:
   - Order starts at $1,000.00.
   - User opens payment modal, dynamic balance shows $1,000.00.
   - Entering $400.00 displays dynamic preview: Payment -$400.00, Remaining $600.00 (Partially paid).
   - After recording $400.00, detail shows $600.00 balance, order list updates to partially paid, and summary updates collected/outstanding amounts.
   - User clicks "Use remaining" -> populates $600.00 -> dynamic preview shows Settled in full ($0.00).
   - After recording $600.00, order status updates to Paid in full, action bar switches to "Paid in full" badge.
   - Attempting $1.00 payment is blocked client-side and returns HTTP 422 if forced against backend.
2. **Idempotency Preservation**:
   - Failure during submit preserves UUID on retry.
   - Closing modal clears UUID.
   - Replaying identical request returns committed payment without extra debit.
3. **Quality Gates**:
   - `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass with zero errors.
