import { z } from "zod";

/**
 * Converts a decimal dollar string (e.g. "125.50", "100", "0.99") into integer cents.
 * Returns null if the string is empty or does not match a valid currency format.
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
 * Formats integer cents into a standard decimal string with 2 decimal places for form inputs.
 */
export const centsToDecimalString = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

export const maximumOrderAmountCents = 999_999_999;

export const orderLineItemFormSchema = z.strictObject({
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(500, "Description must contain at most 500 characters."),
  quantity: z
    .number({ message: "Quantity is required." })
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
        message:
          "Order total exceeds the maximum allowed value ($9,999,999.99).",
        path: ["items"],
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderFormSchema>;
export type OrderLineItemFormValues = z.infer<typeof orderLineItemFormSchema>;
