import type {
  OrderDetail,
  OrderDetailResponse,
  OrderListResponse,
  OrderSummaryResponse,
  RecordPaymentRequest,
  RecordPaymentResponse,
  RecordPaymentResult,
} from "@crossval/contracts";

import { apiRequest } from "../../lib/api-client";

export const getOrders = async (
  signal?: AbortSignal,
): Promise<OrderListResponse> =>
  apiRequest<OrderListResponse>(
    "/orders?status=all&sort=createdAt&direction=desc&page=1&pageSize=50",
    { ...(signal !== undefined && { signal }) },
  );

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
