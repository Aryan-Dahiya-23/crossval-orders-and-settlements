import { describe, expect, it } from "vitest";

import {
  deriveOrderStatus,
  escapeRegularExpression,
  isCanonicalDateOnly,
  normalizeCustomerName,
  normalizeCustomerSearch,
  OrderDomainValidationError,
  prepareOrderDraft,
  toDisplayId,
} from "../../src/modules/orders/domain.js";

const validOrder = {
  customerName: "  Acme   Corporation ",
  dueDate: "2026-08-21",
  items: [
    {
      description: "  Implementation service  ",
      quantity: 2,
      unitPriceCents: 50_000,
    },
    {
      description: "Support",
      quantity: 1,
      unitPriceCents: 5_000,
    },
  ],
};

describe("order domain", () => {
  it("normalizes customer input and calculates integer-cent totals", () => {
    const draft = prepareOrderDraft(validOrder);

    expect(draft).toEqual({
      customerName: "Acme Corporation",
      customerNameNormalized: "acme corporation",
      dueDate: "2026-08-21",
      lineItems: [
        {
          description: "Implementation service",
          quantity: 2,
          unitPriceCents: 50_000,
          lineTotalCents: 100_000,
        },
        {
          description: "Support",
          quantity: 1,
          unitPriceCents: 5_000,
          lineTotalCents: 5_000,
        },
      ],
      totalAmountCents: 105_000,
    });
  });

  it("rejects semantic calendar dates and arithmetic overflow", () => {
    expect(() =>
      prepareOrderDraft({ ...validOrder, dueDate: "2026-02-30" }),
    ).toThrow(OrderDomainValidationError);
    expect(() =>
      prepareOrderDraft({
        ...validOrder,
        items: [
          {
            description: "Too large",
            quantity: 2,
            unitPriceCents: 500_000_000,
          },
        ],
      }),
    ).toThrow("Line item total exceeds the maximum allowed order value.");
  });

  it("recognizes canonical leap dates only", () => {
    expect(isCanonicalDateOnly("2024-02-29")).toBe(true);
    expect(isCanonicalDateOnly("2025-02-29")).toBe(false);
    expect(isCanonicalDateOnly("2026-8-01")).toBe(false);
  });

  it("derives statuses with paid precedence and due-today boundaries", () => {
    expect(
      deriveOrderStatus(
        { balanceDueCents: 0, dueDate: "2026-08-01", paymentCount: 1 },
        "2026-08-14",
      ),
    ).toBe("paid");
    expect(
      deriveOrderStatus(
        { balanceDueCents: 100, dueDate: "2026-08-13", paymentCount: 0 },
        "2026-08-14",
      ),
    ).toBe("overdue");
    expect(
      deriveOrderStatus(
        { balanceDueCents: 100, dueDate: "2026-08-14", paymentCount: 0 },
        "2026-08-14",
      ),
    ).toBe("pending");
    expect(
      deriveOrderStatus(
        { balanceDueCents: 100, dueDate: "2026-08-14", paymentCount: 1 },
        "2026-08-14",
      ),
    ).toBe("partially_paid");
  });

  it("normalizes search safely and derives stable display identifiers", () => {
    expect(normalizeCustomerName("  A\n B  ")).toBe("A B");
    expect(normalizeCustomerSearch("  ACME   Co ")).toBe("acme co");
    expect(escapeRegularExpression("a.*(b)")).toBe("a\\.\\*\\(b\\)");
    expect(toDisplayId("66bd00000000000000a1b2c3d4")).toBe("ORD-A1B2C3D4");
  });
});
