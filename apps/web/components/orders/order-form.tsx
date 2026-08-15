"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  CreateOrderRequest,
  ReplaceOrderRequest,
} from "@crossval/contracts";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiFileList3Line,
  RiLoader4Line,
} from "@remixicon/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import {
  centsToDecimalString,
  decimalToCents,
  orderFormSchema,
  orderLineItemFormSchema,
  type OrderFormValues,
} from "../../features/orders/form-schema";
import { formatUsd } from "../../lib/format";
import { Alert } from "../ui/alert";
import * as Button from "../ui/button";
import { Field, Input } from "../ui/input";

export {
  centsToDecimalString,
  decimalToCents,
  orderFormSchema,
  orderLineItemFormSchema,
  type OrderFormValues,
};

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

const desktopLineItemsMediaQuery = "(min-width: 640px)";

function useDesktopLineItemsLayout(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(desktopLineItemsMediaQuery);
    const updateLayout = () => setIsDesktop(mediaQuery.matches);
    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  return isDesktop;
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
      items:
        initialValues?.items && initialValues.items.length > 0
          ? initialValues.items
          : [{ description: "", quantity: 1, unitPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });
  const usesDesktopLineItemsLayout = useDesktopLineItemsLayout();

  // Real-time subtotal and grand total calculation
  const watchedItems =
    useWatch({
      control: form.control,
      name: "items",
    }) ?? [];

  const calculatedItems = (
    watchedItems as Array<{
      description?: string;
      quantity?: number;
      unitPrice?: string;
    }>
  ).map((item) => {
    const qty = typeof item?.quantity === "number" ? item.quantity : 0;
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

      {/* Customer & Terms Section */}
      <section
        className="rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 sm:p-6"
        aria-labelledby="customer-details-heading"
      >
        <h2
          id="customer-details-heading"
          className="text-label-md font-semibold text-text-strong-950"
        >
          Customer &amp; Terms
        </h2>
        <p className="mt-1 text-paragraph-xs text-text-sub-600">
          Enter the billing entity name and the payment settlement due date.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Customer name"
            htmlFor="customerName"
            error={form.formState.errors.customerName?.message}
            required
          >
            <Input
              id="customerName"
              placeholder="e.g. Acme Corporation"
              autoComplete="organization"
              hasError={form.formState.errors.customerName !== undefined}
              aria-invalid={form.formState.errors.customerName !== undefined}
              {...form.register("customerName")}
            />
          </Field>

          <Field
            label="Due date"
            htmlFor="dueDate"
            error={form.formState.errors.dueDate?.message}
            hint="Date-only format (YYYY-MM-DD) used for overdue status calculation."
            required
          >
            <Input
              id="dueDate"
              type="date"
              hasError={form.formState.errors.dueDate !== undefined}
              aria-invalid={form.formState.errors.dueDate !== undefined}
              {...form.register("dueDate")}
            />
          </Field>
        </div>
      </section>

      {/* Line Items Section */}
      <section
        className="rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 sm:p-6"
        aria-labelledby="line-items-heading"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="line-items-heading"
              className="text-label-md font-semibold text-text-strong-950"
            >
              Line Items
            </h2>
            <p className="mt-1 text-paragraph-xs text-text-sub-600">
              Add products, services, or billable deliverables. Subtotals
              calculate automatically.
            </p>
          </div>

          <Button.Root
            type="button"
            variant="neutral"
            mode="stroke"
            size="small"
            onClick={() =>
              append({ description: "", quantity: 1, unitPrice: "" })
            }
            disabled={fields.length >= 100 || isSubmitting}
          >
            <Button.Icon as={RiAddLine} />
            Add item
          </Button.Root>
        </div>

        {form.formState.errors.items?.root?.message ? (
          <p className="mt-3 text-paragraph-xs font-medium text-error-base" role="alert">
            {form.formState.errors.items.root.message}
          </p>
        ) : null}

        {/*
          Only mount one responsive field layout. Rendering both CSS-hidden layouts
          registers each item field twice with React Hook Form and can reset typed values.
        */}
        {usesDesktopLineItemsLayout ? (
          <div className="mt-5 overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm font-semibold text-text-sub-600">
                    <th className="w-10 px-3.5 py-3 text-center">#</th>
                    <th className="px-3.5 py-3">Description</th>
                    <th className="w-28 px-3.5 py-3 text-center">Quantity</th>
                    <th className="w-40 px-3.5 py-3 text-right">
                      Unit price ($)
                    </th>
                    <th className="w-36 px-3.5 py-3 text-right">Line total</th>
                    <th
                      className="w-12 px-2 py-3 text-center"
                      aria-label="Actions"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke-soft-200">
                  {fields.map((field, index) => {
                    const itemCalc = calculatedItems[index] ?? {
                      lineTotalCents: 0,
                      isValid: false,
                    };
                    const descError =
                      form.formState.errors.items?.[index]?.description?.message;
                    const qtyError =
                      form.formState.errors.items?.[index]?.quantity?.message;
                    const priceError =
                      form.formState.errors.items?.[index]?.unitPrice?.message;

                    return (
                      <tr
                        key={field.id}
                        className="group/row align-top transition-colors hover:bg-bg-weak-50/50"
                      >
                        <td className="px-3.5 pt-5 text-center font-mono text-paragraph-xs text-text-soft-400">
                          {index + 1}
                        </td>
                        <td className="px-3.5 py-3">
                          <Input
                            size="small"
                            placeholder="Item description"
                            aria-label={`Item ${index + 1} description`}
                            hasError={descError !== undefined}
                            aria-invalid={descError !== undefined}
                            {...form.register(`items.${index}.description`)}
                          />
                          {descError ? (
                            <p
                              className="mt-1 text-paragraph-xs font-medium text-error-base"
                              role="alert"
                            >
                              {descError}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3.5 py-3">
                          <Input
                            size="small"
                            type="number"
                            min={1}
                            max={1000000}
                            className="text-center tabular-nums"
                            aria-label={`Item ${index + 1} quantity`}
                            hasError={qtyError !== undefined}
                            aria-invalid={qtyError !== undefined}
                            {...form.register(`items.${index}.quantity`, {
                              valueAsNumber: true,
                            })}
                          />
                          {qtyError ? (
                            <p
                              className="mt-1 text-paragraph-xs font-medium text-error-base"
                              role="alert"
                            >
                              {qtyError}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3.5 py-3">
                          <Input
                            size="small"
                            prefix="$"
                            placeholder="0.00"
                            className="text-right tabular-nums"
                            aria-label={`Item ${index + 1} unit price`}
                            hasError={priceError !== undefined}
                            aria-invalid={priceError !== undefined}
                            {...form.register(`items.${index}.unitPrice`)}
                          />
                          {priceError ? (
                            <p
                              className="mt-1 text-paragraph-xs font-medium text-error-base"
                              role="alert"
                            >
                              {priceError}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3.5 pt-4 text-right text-paragraph-sm font-semibold tabular-nums text-text-strong-950">
                          {itemCalc.isValid
                            ? formatUsd(itemCalc.lineTotalCents)
                            : "—"}
                        </td>
                        <td className="px-2 pt-2.5 text-center">
                          <button
                            type="button"
                            className="grid size-8 place-items-center rounded-lg text-text-soft-400 outline-none transition hover:bg-error-lighter hover:text-error-base focus-visible:shadow-button-error-focus disabled:pointer-events-none disabled:opacity-30"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1 || isSubmitting}
                            aria-label={`Remove item ${index + 1}`}
                            title={
                              fields.length <= 1
                                ? "An order requires at least one line item"
                                : "Remove item"
                            }
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
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {fields.map((field, index) => {
              const itemCalc = calculatedItems[index] ?? {
                lineTotalCents: 0,
                isValid: false,
              };
              const descError =
                form.formState.errors.items?.[index]?.description?.message;
              const qtyError =
                form.formState.errors.items?.[index]?.quantity?.message;
              const priceError =
                form.formState.errors.items?.[index]?.unitPrice?.message;

              return (
                <div
                  key={field.id}
                  className="space-y-3 rounded-xl bg-bg-weak-50/50 p-4 ring-1 ring-inset ring-stroke-soft-200"
                >
                  <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-2.5">
                    <span className="text-paragraph-xs font-semibold text-text-sub-600">
                      Item #{index + 1}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-sm text-paragraph-xs font-medium text-error-base outline-none hover:underline focus-visible:shadow-button-error-focus disabled:opacity-30"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1 || isSubmitting}
                    >
                      <RiDeleteBinLine className="size-3.5" />
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    <Field
                      label="Description"
                      htmlFor={`item-${index}-desc`}
                      error={descError}
                      required
                    >
                      <Input
                        id={`item-${index}-desc`}
                        placeholder="Item description"
                        hasError={descError !== undefined}
                        {...form.register(`items.${index}.description`)}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label="Quantity"
                        htmlFor={`item-${index}-qty`}
                        error={qtyError}
                        required
                      >
                        <Input
                          id={`item-${index}-qty`}
                          type="number"
                          min={1}
                          className="text-center tabular-nums"
                          hasError={qtyError !== undefined}
                          {...form.register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </Field>

                      <Field
                        label="Unit price ($)"
                        htmlFor={`item-${index}-price`}
                        error={priceError}
                        required
                      >
                        <Input
                          id={`item-${index}-price`}
                          prefix="$"
                          placeholder="0.00"
                          className="text-right tabular-nums"
                          hasError={priceError !== undefined}
                          {...form.register(`items.${index}.unitPrice`)}
                        />
                      </Field>
                    </div>

                    <div className="flex items-center justify-between border-t border-stroke-soft-200 pt-2.5 text-paragraph-xs">
                      <span className="text-text-sub-600">Line subtotal:</span>
                      <strong className="font-semibold tabular-nums text-text-strong-950">
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
        )}

        {/* Order Financial Grand Total Bar */}
        <div className="mt-6 flex flex-col gap-3 rounded-xl bg-bg-weak-50/50 p-4 ring-1 ring-inset ring-stroke-soft-200 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-bg-white-0 px-2.5 py-1 text-label-xs font-medium text-text-sub-600 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
              <RiFileList3Line className="size-3.5 text-text-soft-400" />
              {fields.length} line item{fields.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4 sm:justify-end">
            <span className="text-paragraph-sm font-medium text-text-sub-600">
              Order grand total:
            </span>
            <strong className="text-title-h4 font-semibold tabular-nums text-text-strong-950 tracking-tight sm:text-title-h3">
              {formatUsd(grandTotalCents)}
            </strong>
          </div>
        </div>
      </section>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button.Root
          asChild
          variant="neutral"
          mode="stroke"
          size="medium"
          disabled={isSubmitting}
        >
          <Link href={cancelHref}>Cancel</Link>
        </Button.Root>

        <Button.Root
          variant="primary"
          size="medium"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Button.Icon as={RiLoader4Line} className="animate-spin" />
              {mode === "create" ? "Creating order…" : "Saving changes…"}
            </>
          ) : mode === "create" ? (
            "Create order"
          ) : (
            "Save changes"
          )}
        </Button.Root>
      </div>
    </form>
  );
}
