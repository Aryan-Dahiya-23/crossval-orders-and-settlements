"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getOrderDetail,
  getOrders,
  getOrderSummary,
  recordPayment,
} from "./api";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => ["orders", "list"] as const,
  list: () => ["orders", "list", "latest"] as const,
  summaries: () => ["orders", "summary"] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
};

export const useOrders = () =>
  useQuery({
    queryKey: orderKeys.list(),
    queryFn: ({ signal }) => getOrders(signal),
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
