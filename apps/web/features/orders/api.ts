import type {
  CreateOrderRequest,
  OrderDetail,
  OrderDetailResponse,
  OrderListQuery,
  OrderListResponse,
  OrderSummaryResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
  RecordPaymentResult,
  ReplaceOrderRequest,
} from "@crossval/contracts";

import { apiRequest } from "../../lib/api-client";

export type CreateOrderInput = CreateOrderRequest;
export type ReplaceOrderInput = ReplaceOrderRequest;
export type OrderResponse = OrderDetail;

export interface ReplaceOrderParams {
  orderId: string;
  order: ReplaceOrderRequest;
}

export const serializeOrderListRequest = (
  query: OrderListQuery,
): URLSearchParams =>
  new URLSearchParams({
    status: query.status,
    search: query.search ?? "",
    sort: query.sort,
    direction: query.direction,
    page: String(query.page),
    pageSize: String(query.pageSize),
  });

export const getOrders = async (
  query: OrderListQuery,
  signal?: AbortSignal,
): Promise<OrderListResponse> => {
  const searchParams = serializeOrderListRequest(query);
  return apiRequest<OrderListResponse>(`/orders?${searchParams.toString()}`, {
    ...(signal !== undefined && { signal }),
  });
};

export const getOrderSummary = async (
  signal?: AbortSignal,
): Promise<OrderSummaryResponse> =>
  apiRequest<OrderSummaryResponse>("/orders/summary", {
    ...(signal !== undefined && { signal }),
  });

export const getOrderDetail = async (
  orderId: string,
  signal?: AbortSignal,
): Promise<OrderDetail> => {
  const response = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`, {
    ...(signal !== undefined && { signal }),
  });
  return response.data;
};

export const createOrder = async (
  input: CreateOrderRequest,
): Promise<OrderDetail> => {
  const response = await apiRequest<OrderDetailResponse>("/orders", {
    method: "POST",
    body: input,
  });
  return response.data;
};

export const replaceOrder = async (
  orderId: string,
  input: ReplaceOrderRequest,
): Promise<OrderDetail> => {
  const response = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`, {
    method: "PATCH",
    body: input,
  });
  return response.data;
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  await apiRequest<void>(`/orders/${orderId}`, {
    method: "DELETE",
  });
};

export interface RecordPaymentInput {
  orderId: string;
  idempotencyKey: string;
  payment: RecordPaymentRequest;
}

export const recordPayment = async (
  input: RecordPaymentInput,
): Promise<RecordPaymentResult> => {
  const response = await apiRequest<RecordPaymentResponse>(
    `/orders/${input.orderId}/payments`,
    {
      method: "POST",
      headers: { "Idempotency-Key": input.idempotencyKey },
      body: input.payment,
    },
  );
  return response.data;
};

