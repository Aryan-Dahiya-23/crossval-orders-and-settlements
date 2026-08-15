import { describe, expect, it } from "vitest";

import {
  centsToDecimalString,
  decimalToCents,
  orderFormSchema,
  orderLineItemFormSchema,
} from "../../features/orders/form-schema";

describe("money conversion helpers", () => {
  describe("decimalToCents", () => {
    it("converts standard dollar strings to integer cents without floating point drift", () => {
      expect(decimalToCents("100")).toBe(10000);
      expect(decimalToCents("100.00")).toBe(10000);
      expect(decimalToCents("100.5")).toBe(10050);
      expect(decimalToCents("100.50")).toBe(10050);
      expect(decimalToCents("0.99")).toBe(99);
      expect(decimalToCents("0.01")).toBe(1);
      expect(decimalToCents("0")).toBe(0);
      expect(decimalToCents("1234.56")).toBe(123456);
    });

    it("handles number inputs gracefully", () => {
      expect(decimalToCents(50.25)).toBe(5025);
      expect(decimalToCents(100)).toBe(10000);
      expect(decimalToCents(-10)).toBeNull();
      expect(decimalToCents(NaN)).toBeNull();
      expect(decimalToCents(Infinity)).toBeNull();
    });

    it("returns null for invalid strings", () => {
      expect(decimalToCents("")).toBeNull();
      expect(decimalToCents("abc")).toBeNull();
      expect(decimalToCents("10.999")).toBeNull();
      expect(decimalToCents("-5.00")).toBeNull();
      expect(decimalToCents("$100")).toBeNull();
    });
  });

  describe("centsToDecimalString", () => {
    it("formats integer cents to two decimal places string", () => {
      expect(centsToDecimalString(10000)).toBe("100.00");
      expect(centsToDecimalString(10050)).toBe("100.50");
      expect(centsToDecimalString(99)).toBe("0.99");
      expect(centsToDecimalString(1)).toBe("0.01");
      expect(centsToDecimalString(0)).toBe("0.00");
    });
  });
});

describe("orderFormSchema validation", () => {
  const validItem = {
    description: "Design Services",
    quantity: 2,
    unitPrice: "500.00",
  };

  const validOrder = {
    customerName: "Acme Enterprises",
    dueDate: "2026-09-01",
    items: [validItem],
  };

  it("validates a compliant order successfully", () => {
    const result = orderFormSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
  });

  it("rejects empty customer name", () => {
    const result = orderFormSchema.safeParse({
      ...validOrder,
      customerName: "   ",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Customer name is required.",
      );
    }
  });

  it("rejects customer name exceeding 200 chars", () => {
    const result = orderFormSchema.safeParse({
      ...validOrder,
      customerName: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid due date format", () => {
    const result = orderFormSchema.safeParse({
      ...validOrder,
      dueDate: "09/01/2026",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty items array", () => {
    const result = orderFormSchema.safeParse({
      ...validOrder,
      items: [],
    });
    expect(result.success).toBe(false);
  });

  describe("orderLineItemFormSchema", () => {
    it("rejects blank item description", () => {
      const result = orderLineItemFormSchema.safeParse({
        description: "",
        quantity: 1,
        unitPrice: "10.00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero or negative quantity", () => {
      const zeroResult = orderLineItemFormSchema.safeParse({
        description: "Test",
        quantity: 0,
        unitPrice: "10.00",
      });
      expect(zeroResult.success).toBe(false);

      const negResult = orderLineItemFormSchema.safeParse({
        description: "Test",
        quantity: -5,
        unitPrice: "10.00",
      });
      expect(negResult.success).toBe(false);
    });

    it("rejects non-integer quantity", () => {
      const result = orderLineItemFormSchema.safeParse({
        description: "Test",
        quantity: 1.5,
        unitPrice: "10.00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unit price of $0.00", () => {
      const result = orderLineItemFormSchema.safeParse({
        description: "Test",
        quantity: 1,
        unitPrice: "0.00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects unit price with more than 2 decimals", () => {
      const result = orderLineItemFormSchema.safeParse({
        description: "Test",
        quantity: 1,
        unitPrice: "10.123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("financial limit checks", () => {
    it("rejects line item that exceeds maximum allowable order value ($9,999,999.99)", () => {
      const result = orderFormSchema.safeParse({
        ...validOrder,
        items: [
          {
            description: "Huge item",
            quantity: 1000,
            unitPrice: "1000000.00",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects grand total that exceeds maximum allowable order value across multiple items", () => {
      const result = orderFormSchema.safeParse({
        ...validOrder,
        items: [
          {
            description: "Item 1",
            quantity: 1,
            unitPrice: "6000000.00",
          },
          {
            description: "Item 2",
            quantity: 1,
            unitPrice: "5000000.00",
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });
});
