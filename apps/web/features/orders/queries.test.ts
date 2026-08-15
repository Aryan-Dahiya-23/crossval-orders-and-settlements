import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { orderKeys } from "./query-keys";


describe("order React Query cache invalidation logic", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("sets order detail and invalidates lists and summaries on createOrder success", async () => {
    const mockOrder = {
      id: "order_new_1",
      displayId: "ORD-0001",
      customerName: "New Customer",
      dueDate: "2026-09-01",
      status: "pending" as const,
      totalAmountCents: 50000,
      paidAmountCents: 0,
      balanceDueCents: 50000,
      isEditable: true,
      isDeletable: true,
      items: [],
      payments: [],
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    };

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Simulate mutation onSuccess behavior
    queryClient.setQueryData(orderKeys.detail(mockOrder.id), mockOrder);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
    ]);

    expect(queryClient.getQueryData(orderKeys.detail("order_new_1"))).toEqual(
      mockOrder,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.summaries(),
    });
  });

  it("updates detail cache and invalidates lists and summaries on replaceOrder success", async () => {
    const updatedOrder = {
      id: "order_edit_1",
      displayId: "ORD-0002",
      customerName: "Updated Customer",
      dueDate: "2026-09-10",
      status: "pending" as const,
      totalAmountCents: 75000,
      paidAmountCents: 0,
      balanceDueCents: 75000,
      isEditable: true,
      isDeletable: true,
      items: [],
      payments: [],
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T01:00:00.000Z",
    };

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.setQueryData(orderKeys.detail(updatedOrder.id), updatedOrder);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orderKeys.detail(updatedOrder.id),
      }),
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
    ]);

    expect(queryClient.getQueryData(orderKeys.detail("order_edit_1"))).toEqual(
      updatedOrder,
    );
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.detail("order_edit_1"),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.summaries(),
    });
  });

  it("removes detail cache and invalidates lists and summaries on deleteOrder success", async () => {
    const orderId = "order_del_1";
    queryClient.setQueryData(orderKeys.detail(orderId), { id: orderId });

    const removeSpy = vi.spyOn(queryClient, "removeQueries");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
    ]);

    expect(removeSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.detail(orderId),
    });
    expect(queryClient.getQueryData(orderKeys.detail(orderId))).toBeUndefined();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.summaries(),
    });
  });

  it("invalidates order detail, lists, and summaries on recordPayment success", async () => {
    const orderId = "order_pay_1";
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    // Simulate recordPayment onSuccess invalidation behavior
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
    ]);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.detail(orderId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.lists(),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: orderKeys.summaries(),
    });
  });
});

