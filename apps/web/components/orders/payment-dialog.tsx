"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { OrderDetail } from "@crossval/contracts";
import { RiMoneyDollarCircleLine } from "@remixicon/react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  centsToDecimalString,
  decimalToCents,
} from "@/features/orders/form-schema";
import { useRecordPayment } from "@/features/orders/queries";
import { ApiError } from "@/lib/api-client";
import { formatUsd } from "@/lib/format";
import { cn } from "@/utils/cn";
import { Alert } from "../ui/alert";
import * as Button from "../ui/button";
import { Field, Input, Textarea } from "../ui/input";
import * as Modal from "../ui/modal";
import * as StatusBadge from "../ui/status-badge";

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

  const watchedAmount = useWatch({ control: form.control, name: "amount" });
  const amountCents = decimalToCents(watchedAmount ?? "");

  // Real-time dynamic settlement preview calculations
  const isValidAmount = amountCents !== null && amountCents > 0;
  const isOverpaid =
    amountCents !== null && amountCents > order.balanceDueCents;
  const isFullSettlement =
    isValidAmount && amountCents === order.balanceDueCents;
  const isPartialPayment =
    isValidAmount &&
    amountCents < order.balanceDueCents &&
    order.balanceDueCents > 0;
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
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) handleClose();
      }}
    >
      <Modal.Content className="max-w-[480px]">
        <Modal.Header
          icon={RiMoneyDollarCircleLine}
          title="Record payment"
          description={`Apply a settlement to ${order.displayId}. The write is protected by an idempotency key.`}
        />

        <Modal.Body className="space-y-4">
          {/* Dynamic Settlement Preview Card */}
          <div className="overflow-hidden rounded-xl bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200">
            <div className="flex items-center justify-between border-b border-stroke-soft-200 px-4 py-2.5 text-paragraph-xs text-text-sub-600">
              <span>Current balance</span>
              <strong className="font-semibold tabular-nums text-text-strong-950">
                {formatUsd(order.balanceDueCents)}
              </strong>
            </div>

            {isValidAmount ? (
              <div className="flex items-center justify-between border-b border-stroke-soft-200 px-4 py-2.5 text-paragraph-xs text-text-sub-600">
                <span>Payment applied</span>
                <strong className="font-semibold tabular-nums text-success-base">
                  -{formatUsd(amountCents)}
                </strong>
              </div>
            ) : null}

            <div
              className={cn(
                "flex items-center justify-between px-4 py-3 transition-colors",
                isOverpaid && "bg-error-lighter/50",
                isFullSettlement && "bg-success-lighter/50",
                isPartialPayment && "bg-warning-lighter/40",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-paragraph-sm font-medium text-text-strong-950">
                  Projected balance
                </span>
                {isFullSettlement ? (
                  <StatusBadge.Root variant="stroke" status="completed">
                    <StatusBadge.Dot />
                    Settled in full
                  </StatusBadge.Root>
                ) : isPartialPayment ? (
                  <StatusBadge.Root variant="stroke" status="pending">
                    <StatusBadge.Dot />
                    Partially paid
                  </StatusBadge.Root>
                ) : isOverpaid ? (
                  <StatusBadge.Root variant="stroke" status="failed">
                    <StatusBadge.Dot />
                    Exceeds balance
                  </StatusBadge.Root>
                ) : null}
              </div>
              <strong
                className={cn(
                  "text-label-md font-semibold tabular-nums",
                  isOverpaid
                    ? "text-error-base"
                    : isFullSettlement
                      ? "text-success-base"
                      : isPartialPayment
                        ? "text-warning-dark"
                        : "text-text-strong-950",
                )}
              >
                {formatUsd(projectedBalanceCents)}
              </strong>
            </div>
          </div>

          <form
            id="payment-form"
            className="space-y-4"
            noValidate
            onSubmit={(event) => void submit(event)}
          >
            <Field
              label="Amount (USD)"
              htmlFor="payment-amount"
              error={form.formState.errors.amount?.message}
              hint={order.balanceDueCents > 0 ? `Maximum ${formatUsd(order.balanceDueCents)}` : undefined}
            >
              {order.balanceDueCents > 0 ? (
                <div className="-mt-1 mb-1.5 flex justify-end">
                  <button
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-paragraph-xs font-medium text-text-sub-600 transition-colors hover:bg-bg-weak-50 hover:text-text-strong-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
                    type="button"
                    onClick={handleUseRemaining}
                  >
                    <span>Use remaining balance</span>
                    <span className="font-semibold tabular-nums text-text-strong-950">
                      ({formatUsd(order.balanceDueCents)})
                    </span>
                  </button>
                </div>
              ) : null}
              <Input
                id="payment-amount"
                prefix="$"
                placeholder="0.00"
                className="font-medium tabular-nums"
                inputMode="decimal"
                autoComplete="off"
                hasError={form.formState.errors.amount !== undefined}
                aria-invalid={form.formState.errors.amount !== undefined}
                aria-describedby="payment-amount-error"
                {...form.register("amount")}
              />
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
                hasError={form.formState.errors.paymentDate !== undefined}
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
                hasError={form.formState.errors.note !== undefined}
                aria-invalid={form.formState.errors.note !== undefined}
                {...form.register("note")}
              />
            </Field>

            {serverError ? <Alert tone="danger">{serverError}</Alert> : null}
          </form>
        </Modal.Body>

        <Modal.Footer>
          <Button.Root
            variant="neutral"
            mode="stroke"
            size="medium"
            type="button"
            disabled={mutation.isPending}
            onClick={handleClose}
          >
            Cancel
          </Button.Root>
          <Button.Root
            variant="primary"
            mode="filled"
            size="medium"
            type="submit"
            form="payment-form"
            disabled={
              mutation.isPending || isOverpaid || order.balanceDueCents <= 0
            }
          >
            {mutation.isPending
              ? "Recording…"
              : isValidAmount && !isOverpaid
                ? `Record ${formatUsd(amountCents)}`
                : "Record payment"}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}

