import {
  orderListQuerySchema,
  paymentIdempotencyKeySchema,
  type CreateOrderRequest,
  type OrderListQuery,
  type ReplaceOrderRequest,
} from "@crossval/contracts";
import type { ObjectId } from "mongodb";
import type { ZodError, ZodType } from "zod";

import { requireObjectId } from "../../db/object-id.js";
import { AppError } from "../../errors/app-error.js";
import { OrderDomainValidationError } from "./domain.js";

const toFieldErrors = (error: ZodError): Record<string, string[]> => {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "root";
    (fields[field] ??= []).push(issue.message);
  }
  return fields;
};

export const parseOrderInput = <Output>(
  schema: ZodType<Output>,
  body: unknown,
): Output => {
  const result = schema.safeParse(body);
  if (result.success) {
    return result.data;
  }

  throw new AppError({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Please correct the highlighted fields.",
    details: { fields: toFieldErrors(result.error) },
  });
};

export const parseOrderListQuery = (query: unknown): OrderListQuery =>
  parseOrderInput<OrderListQuery>(orderListQuerySchema, query);

export const parseOrderId = (value: unknown): ObjectId => {
  try {
    if (typeof value !== "string") {
      throw new Error("Order ID must be a string.");
    }
    return requireObjectId(value);
  } catch {
    throw new AppError({
      status: 400,
      code: "INVALID_RESOURCE_ID",
      message: "Order ID must be a 24-character hexadecimal ObjectId.",
    });
  }
};

export const parsePaymentIdempotencyKey = (value: unknown): string =>
  parseOrderInput(paymentIdempotencyKeySchema, value);

export const asOrderDomainValidationError = (
  error: unknown,
): AppError | null => {
  if (!(error instanceof OrderDomainValidationError)) {
    return null;
  }

  return new AppError({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Please correct the highlighted fields.",
    details: { fields: { [error.field]: [error.message] } },
  });
};

export type OrderInput = CreateOrderRequest | ReplaceOrderRequest;
