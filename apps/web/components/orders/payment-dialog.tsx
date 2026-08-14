"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { OrderDetail } from "@crossval/contracts";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { useRecordPayment } from "../../features/orders/queries";
import { ApiError } from "../../lib/api-client";
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

const decimalToCents = (value: string): number | null => {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = whole * 100 + Number(fraction);
  return Number.isSafeInteger(cents) ? cents : null;
};

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
  const amountCents = decimalToCents(watchedAmount);

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
        if (!nextOpen && !mutation.isPending) onClose();
      }}
      title="Record payment"
      description={`Apply a settlement to ${order.displayId}. The write is protected by an idempotency key.`}
      footer={
        <>
          <Button
            variant="secondary"
            type="button"
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="payment-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Recording…"
              : amountCents !== null && amountCents > 0
                ? `Record ${formatUsd(amountCents)}`
                : "Record payment"}
          </Button>
        </>
      }
    >
      <div className="mb-5 flex items-center justify-between rounded-[10px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
        <span className="text-sm text-slate-500">Current balance</span>
        <strong className="text-base font-semibold tabular-nums text-slate-950">
          {formatUsd(order.balanceDueCents)}
        </strong>
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
              <button
                className="font-medium text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
                type="button"
                onClick={() =>
                  form.setValue(
                    "amount",
                    (order.balanceDueCents / 100).toFixed(2),
                    {
                      shouldValidate: true,
                    },
                  )
                }
              >
                Use remaining
              </button>
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

        {serverError ? <Alert>{serverError}</Alert> : null}
      </form>
    </Modal>
  );
}
