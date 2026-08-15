"use client";

import type {
  CreateOrderRequest,
  OrderDetail,
  OrderListQuery,
  ReplaceOrderRequest,
} from "@crossval/contracts";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createOrder,
  deleteOrder,
  getOrderDetail,
  getOrders,
  getOrderSummary,
  recordPayment,
  replaceOrder,
  type ReplaceOrderParams,
} from "./api";
import { orderKeys } from "./query-keys";

export { orderKeys } from "./query-keys";

export const useOrders = (query: OrderListQuery) =>
  useQuery({
    queryKey: orderKeys.list(query),
    queryFn: ({ signal }) => getOrders(query, signal),
    placeholderData: keepPreviousData,
  });

export const useOrderSummary = () =>
  useQuery({
    queryKey: orderKeys.summaries(),
    queryFn: ({ signal }) => getOrderSummary(signal),
  });

export const useOrderDetail = (orderId: string) =>
  useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: ({ signal }) => getOrderDetail(orderId, signal),
    retry: false,
  });

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderRequest) => createOrder(input),
    onSuccess: async (createdOrder) => {
      queryClient.setQueryData(orderKeys.detail(createdOrder.id), createdOrder);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);
    },
  });
};

export const useReplaceOrder = (boundOrderId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      variables: ReplaceOrderRequest | ReplaceOrderParams,
    ): Promise<OrderDetail> => {
      if ("orderId" in variables && "order" in variables) {
        return replaceOrder(variables.orderId, variables.order);
      }
      if (!boundOrderId) {
        throw new Error("Order ID must be provided to useReplaceOrder.");
      }
      return replaceOrder(boundOrderId, variables as ReplaceOrderRequest);
    },
    onSuccess: async (updatedOrder, variables) => {
      const targetId =
        "orderId" in variables ? variables.orderId : boundOrderId!;
      queryClient.setQueryData(orderKeys.detail(targetId), updatedOrder);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(targetId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);
    },
  });
};

export const useDeleteOrder = (boundOrderId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetOrderId?: string): Promise<void> => {
      const id = targetOrderId ?? boundOrderId;
      if (!id) {
        throw new Error("Order ID must be provided to useDeleteOrder.");
      }
      return deleteOrder(id);
    },
    onSuccess: async (_data, targetOrderId) => {
      const id = targetOrderId ?? boundOrderId!;
      queryClient.removeQueries({ queryKey: orderKeys.detail(id) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);
    },
  });
};

export const useRecordPayment = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: recordPayment,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);
    },
  });
};

