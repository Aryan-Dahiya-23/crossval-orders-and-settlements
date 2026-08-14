import type {
  CreateOrderRequest,
  OrderLineItemInput,
  OrderStatus,
  RecordPaymentRequest,
} from "@crossval/contracts";
import { createHash } from "node:crypto";

import { maximumOrderAmountCents } from "./constants.js";

export class OrderDomainValidationError extends Error {
  public constructor(
    public readonly field: string,
    message: string,
  ) {
    super(message);
    this.name = "OrderDomainValidationError";
  }
}

export interface CalculatedLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderDraft {
  customerName: string;
  customerNameNormalized: string;
  dueDate: string;
  lineItems: CalculatedLineItem[];
  totalAmountCents: number;
}

export interface PaymentDraft {
  amountCents: number;
  paymentDate: string;
  note: string | null;
  requestFingerprint: string;
}

const canonicalDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const normalizeWhitespace = (value: string): string =>
  value.trim().replaceAll(/\s+/g, " ");

export const normalizeCustomerName = (value: string): string =>
  normalizeWhitespace(value);

export const normalizeCustomerSearch = (value: string): string =>
  normalizeWhitespace(value).toLowerCase();

export const escapeRegularExpression = (value: string): string =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isCanonicalDateOnly = (value: string): boolean => {
  if (!canonicalDatePattern.test(value)) {
    return false;
  }

  const parts = value.split("-");
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
};

export const getUtcDateOnly = (now: Date): string =>
  now.toISOString().slice(0, 10);

export const preparePaymentDraft = (
  input: RecordPaymentRequest,
  todayUtc: string,
): PaymentDraft => {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents < 1) {
    throw new OrderDomainValidationError(
      "amountCents",
      "Payment amount must be a positive integer number of cents.",
    );
  }
  if (!isCanonicalDateOnly(input.paymentDate)) {
    throw new OrderDomainValidationError(
      "paymentDate",
      "Payment date must be a valid YYYY-MM-DD date.",
    );
  }
  if (input.paymentDate > todayUtc) {
    throw new OrderDomainValidationError(
      "paymentDate",
      "Payment date cannot be in the future.",
    );
  }

  const normalizedNote =
    input.note === undefined ? "" : normalizeWhitespace(input.note);
  const note = normalizedNote.length === 0 ? null : normalizedNote;
  const requestFingerprint = createHash("sha256")
    .update(JSON.stringify([input.amountCents, input.paymentDate, note]))
    .digest("hex");

  return {
    amountCents: input.amountCents,
    paymentDate: input.paymentDate,
    note,
    requestFingerprint,
  };
};

const calculateLineTotal = (
  item: OrderLineItemInput,
  index: number,
): CalculatedLineItem => {
  if (
    !Number.isSafeInteger(item.quantity) ||
    !Number.isSafeInteger(item.unitPriceCents)
  ) {
    throw new OrderDomainValidationError(
      `items.${index}`,
      "Line item values must be safe integers.",
    );
  }

  if (
    item.unitPriceCents > Math.floor(maximumOrderAmountCents / item.quantity)
  ) {
    throw new OrderDomainValidationError(
      `items.${index}.unitPriceCents`,
      "Line item total exceeds the maximum allowed order value.",
    );
  }

  return {
    description: item.description.trim(),
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: item.quantity * item.unitPriceCents,
  };
};

export const prepareOrderDraft = (input: CreateOrderRequest): OrderDraft => {
  const customerName = normalizeCustomerName(input.customerName);
  if (customerName.length === 0) {
    throw new OrderDomainValidationError(
      "customerName",
      "Customer name is required.",
    );
  }

  if (!isCanonicalDateOnly(input.dueDate)) {
    throw new OrderDomainValidationError(
      "dueDate",
      "Due date must be a valid YYYY-MM-DD date.",
    );
  }

  let totalAmountCents = 0;
  const lineItems = input.items.map((item, index) => {
    const calculated = calculateLineTotal(item, index);
    if (
      calculated.lineTotalCents >
      maximumOrderAmountCents - totalAmountCents
    ) {
      throw new OrderDomainValidationError(
        `items.${index}`,
        "Order total exceeds the maximum allowed value.",
      );
    }
    totalAmountCents += calculated.lineTotalCents;
    return calculated;
  });

  if (totalAmountCents < 1) {
    throw new OrderDomainValidationError(
      "items",
      "Order total must be at least 1 cent.",
    );
  }

  return {
    customerName,
    customerNameNormalized: customerName.toLowerCase(),
    dueDate: input.dueDate,
    lineItems,
    totalAmountCents,
  };
};

export const deriveOrderStatus = (
  input: {
    balanceDueCents: number;
    dueDate: string;
    paymentCount: number;
  },
  todayUtc: string,
): OrderStatus => {
  if (input.balanceDueCents === 0) {
    return "paid";
  }
  if (input.dueDate < todayUtc) {
    return "overdue";
  }
  if (input.paymentCount > 0) {
    return "partially_paid";
  }
  return "pending";
};

export const toDisplayId = (hexObjectId: string): string =>
  `ORD-${hexObjectId.slice(-8).toUpperCase()}`;
