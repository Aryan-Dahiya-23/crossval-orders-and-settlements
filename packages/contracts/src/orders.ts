import { z } from "zod";

export const orderStatusValues = [
  "pending",
  "partially_paid",
  "paid",
  "overdue",
] as const;

export type OrderStatus = (typeof orderStatusValues)[number];

export const orderSortValues = ["createdAt", "dueDate", "totalAmount"] as const;

export const orderDirectionValues = ["asc", "desc"] as const;
export const orderPageSizeValues = [10, 25, 50] as const;

const maximumOrderAmountCents = 999_999_999;

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");

const positiveCentsSchema = z
  .number()
  .int("Amount must be a whole number of cents.")
  .min(1, "Amount must be at least 1 cent.")
  .max(
    maximumOrderAmountCents,
    "Amount exceeds the maximum allowed order value.",
  );

const paymentIdempotencyKeyPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export const orderLineItemInputSchema = z.strictObject({
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(500, "Description must contain at most 500 characters."),
  quantity: z
    .number()
    .int("Quantity must be a whole number.")
    .min(1, "Quantity must be at least 1.")
    .max(1_000_000, "Quantity must not exceed 1,000,000."),
  unitPriceCents: positiveCentsSchema,
});

export const createOrderRequestSchema = z.strictObject({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(200, "Customer name must contain at most 200 characters."),
  dueDate: dateOnlySchema,
  items: z
    .array(orderLineItemInputSchema)
    .min(1, "At least one line item is required.")
    .max(100, "An order can contain at most 100 line items."),
});

export const replaceOrderRequestSchema = createOrderRequestSchema;

export const recordPaymentRequestSchema = z.strictObject({
  amountCents: positiveCentsSchema,
  paymentDate: dateOnlySchema,
  note: z
    .string()
    .trim()
    .max(500, "Note must contain at most 500 characters.")
    .optional(),
});

export const paymentIdempotencyKeySchema = z
  .string()
  .trim()
  .regex(paymentIdempotencyKeyPattern, "Idempotency-Key must be a valid UUID.")
  .transform((value) => value.toLowerCase());

const positiveQueryIntegerSchema = z
  .string()
  .regex(/^[1-9]\d*$/, "Must be a positive whole number.")
  .refine(
    (value) => Number.isSafeInteger(Number(value)),
    "Must be a safe whole number.",
  )
  .transform(Number);

const pageSizeQuerySchema = z
  .enum(["10", "25", "50"], "Page size must be 10, 25, or 50.")
  .transform(Number) as z.ZodType<(typeof orderPageSizeValues)[number]>;

export const orderListQuerySchema = z.strictObject({
  status: z.enum(["all", ...orderStatusValues]).default("all"),
  search: z
    .string()
    .trim()
    .max(200, "Search must contain at most 200 characters.")
    .optional(),
  sort: z.enum(orderSortValues).default("createdAt"),
  direction: z.enum(orderDirectionValues).default("desc"),
  page: positiveQueryIntegerSchema.default(1),
  pageSize: pageSizeQuerySchema.default(10),
});

export type OrderLineItemInput = z.infer<typeof orderLineItemInputSchema>;
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;
export type ReplaceOrderRequest = z.infer<typeof replaceOrderRequestSchema>;
export type RecordPaymentRequest = z.infer<typeof recordPaymentRequestSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;

export interface OrderListItem {
  id: string;
  displayId: string;
  customerName: string;
  dueDate: string;
  status: OrderStatus;
  totalAmountCents: number;
  paidAmountCents: number;
  balanceDueCents: number;
  isEditable: boolean;
  isDeletable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  position: number;
}

export interface OrderPayment {
  id: string;
  amountCents: number;
  paymentDate: string;
  note: string | null;
  createdAt: string;
}

export interface OrderDetail extends OrderListItem {
  items: OrderLineItem[];
  payments: OrderPayment[];
}

export interface PaymentOrderSnapshot {
  id: string;
  status: OrderStatus;
  totalAmountCents: number;
  paidAmountCents: number;
  balanceDueCents: number;
}

export interface RecordPaymentResult {
  payment: OrderPayment;
  order: PaymentOrderSnapshot;
}

export interface OrderSummary {
  totalOrders: number;
  outstandingAmountCents: number;
  collectedAmountCents: number;
  overdueAmountCents: number;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface SummaryMeta {
  asOfDate: string;
}

export interface OrderListResponse {
  data: OrderListItem[];
  meta: PaginationMeta;
}

export interface OrderDetailResponse {
  data: OrderDetail;
}

export interface OrderSummaryResponse {
  data: OrderSummary;
  meta: SummaryMeta;
}

export interface RecordPaymentResponse {
  data: RecordPaymentResult;
}

export interface PopulateSampleResult {
  ordersCreated: number;
}

export interface PopulateSampleResponse {
  data: PopulateSampleResult;
}

