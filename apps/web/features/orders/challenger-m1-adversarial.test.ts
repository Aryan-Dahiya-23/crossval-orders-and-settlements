import { describe, expect, it } from "vitest";
import {
  centsToDecimalString,
  decimalToCents,
  maximumOrderAmountCents,
  orderFormSchema,
  orderLineItemFormSchema,
} from "./form-schema";
import { createOrderRequestSchema, replaceOrderRequestSchema } from "@crossval/contracts";

describe("Challenger 1 Empirical Verification: Money & Form Boundaries", () => {
  describe("1. Money Arithmetic & Decimal-to-Cents Conversion Oracle", () => {
    it("bijective round-trip property for all integer cents from 1 to 50,000 ($0.01 to $500.00)", () => {
      for (let cents = 1; cents <= 50000; cents++) {
        const decimalStr = centsToDecimalString(cents);
        const parsedCents = decimalToCents(decimalStr);
        expect(parsedCents).toBe(cents);
      }
    });

    it("verifies exact IEEE-754 precision boundary cases without floating drift", () => {
      const precisionHazards: Array<[string, number]> = [
        ["0.01", 1],
        ["0.07", 7],
        ["0.14", 14],
        ["0.28", 28],
        ["0.29", 29],
        ["0.56", 56],
        ["0.57", 57],
        ["0.58", 58],
        ["1.13", 113],
        ["1.14", 114],
        ["1.15", 115],
        ["2.29", 229],
        ["4.99", 499],
        ["19.99", 1999],
        ["29.99", 2999],
        ["49.99", 4999],
        ["89.99", 8999],
        ["99.99", 9999],
        ["100.00", 10000],
        ["9999.99", 999999],
        ["9999999.99", 999999999],
      ];

      for (const [input, expectedCents] of precisionHazards) {
        expect(decimalToCents(input)).toBe(expectedCents);
        expect(centsToDecimalString(expectedCents)).toBe(input);
      }
    });

    it("handles 1-digit decimals correctly by padding to 2 decimal digits", () => {
      expect(decimalToCents("0.1")).toBe(10);
      expect(decimalToCents("1.5")).toBe(150);
      expect(decimalToCents("99.9")).toBe(9990);
      expect(decimalToCents("0.0")).toBe(0);
    });

    it("handles whole number strings correctly", () => {
      expect(decimalToCents("0")).toBe(0);
      expect(decimalToCents("1")).toBe(100);
      expect(decimalToCents("100")).toBe(10000);
      expect(decimalToCents("9999999")).toBe(999999900);
    });

    it("rejects sub-cent fractional precision (3+ decimal places)", () => {
      const subCentInputs = [
        "0.001",
        "0.009",
        "1.234",
        "10.999",
        "99.9999",
        "0.000001",
      ];
      for (const input of subCentInputs) {
        expect(decimalToCents(input)).toBeNull();
      }
    });

    it("rejects negative money representations", () => {
      const negativeInputs = [
        "-0.01",
        "-1",
        "-100.00",
        "-9999999.99",
        "-0.00",
      ];
      for (const input of negativeInputs) {
        expect(decimalToCents(input)).toBeNull();
      }
    });

    it("rejects non-numeric, scientific notation, and malformed money formats", () => {
      const malformedInputs = [
        "",
        "   ",
        "abc",
        "$10.00",
        "10.00$",
        "10,000.00",
        "10 00",
        "10..00",
        "10.0.0",
        ".50",
        "1e5",
        "Infinity",
        "-Infinity",
        "NaN",
        "0x10",
      ];
      for (const input of malformedInputs) {
        expect(decimalToCents(input)).toBeNull();
      }
    });

    it("enforces absolute maximum money amount: $9,999,999.99 (999,999,999 cents)", () => {
      expect(maximumOrderAmountCents).toBe(999_999_999);
      expect(decimalToCents("9999999.99")).toBe(999_999_999);
      expect(decimalToCents("10000000.00")).toBe(1_000_000_000);
    });
  });

  describe("2. Line Item & Order Form Schema Boundary States", () => {
    const validItem = {
      description: "Standard Widget",
      quantity: 1,
      unitPrice: "10.00",
    };

    const validOrder = {
      customerName: "Acme Industrial",
      dueDate: "2026-10-15",
      items: [validItem],
    };

    it("validates unit price boundary: exactly 1 cent ($0.01) is the minimum permitted", () => {
      // 1 cent is valid
      const minValid = orderLineItemFormSchema.safeParse({
        description: "Penny Candy",
        quantity: 1,
        unitPrice: "0.01",
      });
      expect(minValid.success).toBe(true);

      // 0 cents is rejected
      const zeroPrice = orderLineItemFormSchema.safeParse({
        description: "Free Sample",
        quantity: 1,
        unitPrice: "0.00",
      });
      expect(zeroPrice.success).toBe(false);
      if (!zeroPrice.success) {
        expect(zeroPrice.error.issues[0]?.message).toContain("at least $0.01");
      }
    });

    it("validates quantity boundaries: min 1, max 1,000,000, rejects 0, negatives, decimals, and > 1,000,000", () => {
      expect(orderLineItemFormSchema.safeParse({ ...validItem, quantity: 1 }).success).toBe(true);
      expect(orderLineItemFormSchema.safeParse({ ...validItem, quantity: 1_000_000 }).success).toBe(true);

      // 0 quantity
      const zeroQty = orderLineItemFormSchema.safeParse({ ...validItem, quantity: 0 });
      expect(zeroQty.success).toBe(false);

      // Negative quantity
      const negQty = orderLineItemFormSchema.safeParse({ ...validItem, quantity: -5 });
      expect(negQty.success).toBe(false);

      // Decimal quantity
      const decQty = orderLineItemFormSchema.safeParse({ ...validItem, quantity: 1.5 });
      expect(decQty.success).toBe(false);

      // Exceeds max
      const overQty = orderLineItemFormSchema.safeParse({ ...validItem, quantity: 1_000_001 });
      expect(overQty.success).toBe(false);
    });

    it("validates item description boundaries: min 1 char, max 500 chars, rejects empty and whitespace-only", () => {
      expect(orderLineItemFormSchema.safeParse({ ...validItem, description: "A" }).success).toBe(true);
      expect(orderLineItemFormSchema.safeParse({ ...validItem, description: "X".repeat(500) }).success).toBe(true);

      // Empty string
      expect(orderLineItemFormSchema.safeParse({ ...validItem, description: "" }).success).toBe(false);
      // Whitespace only
      expect(orderLineItemFormSchema.safeParse({ ...validItem, description: "    " }).success).toBe(false);
      // 501 characters
      expect(orderLineItemFormSchema.safeParse({ ...validItem, description: "X".repeat(501) }).success).toBe(false);
    });

    it("validates line items array boundaries: min 1 item, max 100 items", () => {
      // 0 items
      const zeroItems = orderFormSchema.safeParse({ ...validOrder, items: [] });
      expect(zeroItems.success).toBe(false);

      // 1 item (valid)
      const oneItem = orderFormSchema.safeParse({ ...validOrder, items: [validItem] });
      expect(oneItem.success).toBe(true);

      // 100 items (valid)
      const hundredItems = orderFormSchema.safeParse({
        ...validOrder,
        items: Array.from({ length: 100 }, (_, i) => ({
          description: `Item ${i + 1}`,
          quantity: 1,
          unitPrice: "1.00",
        })),
      });
      expect(hundredItems.success).toBe(true);

      // 101 items (rejected)
      const hundredOneItems = orderFormSchema.safeParse({
        ...validOrder,
        items: Array.from({ length: 101 }, (_, i) => ({
          description: `Item ${i + 1}`,
          quantity: 1,
          unitPrice: "1.00",
        })),
      });
      expect(hundredOneItems.success).toBe(false);
    });

    it("validates customer name boundaries: min 1 char, max 200 chars, rejects empty / whitespace-only", () => {
      expect(orderFormSchema.safeParse({ ...validOrder, customerName: "A" }).success).toBe(true);
      expect(orderFormSchema.safeParse({ ...validOrder, customerName: "Z".repeat(200) }).success).toBe(true);

      // Empty
      expect(orderFormSchema.safeParse({ ...validOrder, customerName: "" }).success).toBe(false);
      // Whitespace
      expect(orderFormSchema.safeParse({ ...validOrder, customerName: "   \t\n  " }).success).toBe(false);
      // 201 chars
      expect(orderFormSchema.safeParse({ ...validOrder, customerName: "Z".repeat(201) }).success).toBe(false);
    });

    it("validates due date format and allows past, today, and future dates", () => {
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "2020-01-01" }).success).toBe(true);
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "2026-08-15" }).success).toBe(true);
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "2030-12-31" }).success).toBe(true);

      // Invalid date formats
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "2026/08/15" }).success).toBe(false);
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "15-08-2026" }).success).toBe(false);
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "invalid-date" }).success).toBe(false);
      expect(orderFormSchema.safeParse({ ...validOrder, dueDate: "" }).success).toBe(false);
    });

    it("validates total financial limits across individual lines and grand total", () => {
      // Single line exceeding max ($10,000,000.00)
      const lineOverflow = orderFormSchema.safeParse({
        ...validOrder,
        items: [{ description: "Huge Item", quantity: 2, unitPrice: "5000000.00" }],
      });
      // 2 * $5,000,000 = $10,000,000 > $9,999,999.99
      expect(lineOverflow.success).toBe(false);

      // Multi-line grand total exceeding max
      const grandTotalOverflow = orderFormSchema.safeParse({
        ...validOrder,
        items: [
          { description: "Item 1", quantity: 1, unitPrice: "6000000.00" },
          { description: "Item 2", quantity: 1, unitPrice: "4000000.00" },
        ],
      });
      // $6,000,000 + $4,000,000 = $10,000,000 > $9,999,999.99
      expect(grandTotalOverflow.success).toBe(false);

      // Exactly at limit ($9,999,999.99)
      const exactlyAtLimit = orderFormSchema.safeParse({
        ...validOrder,
        items: [
          { description: "Item 1", quantity: 1, unitPrice: "5000000.00" },
          { description: "Item 2", quantity: 1, unitPrice: "4999999.99" },
        ],
      });
      expect(exactlyAtLimit.success).toBe(true);
    });

    it("shared contracts createOrderRequestSchema matches frontend validation rules", () => {
      const contractValid = createOrderRequestSchema.safeParse({
        customerName: "Global Corp",
        dueDate: "2026-09-01",
        items: [
          {
            description: "Service A",
            quantity: 2,
            unitPriceCents: 50000,
          },
        ],
      });
      expect(contractValid.success).toBe(true);

      // Contracts reject 0 unitPriceCents
      const zeroCentsContract = createOrderRequestSchema.safeParse({
        customerName: "Global Corp",
        dueDate: "2026-09-01",
        items: [
          {
            description: "Service A",
            quantity: 1,
            unitPriceCents: 0,
          },
        ],
      });
      expect(zeroCentsContract.success).toBe(false);

      // Contracts reject negative unitPriceCents
      const negCentsContract = createOrderRequestSchema.safeParse({
        customerName: "Global Corp",
        dueDate: "2026-09-01",
        items: [
          {
            description: "Service A",
            quantity: 1,
            unitPriceCents: -100,
          },
        ],
      });
      expect(negCentsContract.success).toBe(false);

      // ReplaceOrderRequest is identical schema
      expect(replaceOrderRequestSchema).toBe(createOrderRequestSchema);
    });
  });
});
