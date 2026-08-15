import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../../lib/api-client";
import {
  createOrder,
  deleteOrder,
  getOrderDetail,
  getOrders,
  getOrderSummary,
  recordPayment,
  replaceOrder,
  serializeOrderListRequest,
} from "./api";

describe("order API client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("order list request serialization", () => {
    it("includes every normalized parameter and URL-encodes search", () => {
      expect(
        serializeOrderListRequest({
          status: "overdue",
          search: "Acme & MENA",
          sort: "totalAmount",
          direction: "asc",
          page: 3,
          pageSize: 25,
        }).toString(),
      ).toBe(
        "status=overdue&search=Acme+%26+MENA&sort=totalAmount&direction=asc&page=3&pageSize=25",
      );
    });

    it("sends explicit defaults while canonical browser URLs may omit them", () => {
      expect(
        serializeOrderListRequest({
          status: "all",
          sort: "createdAt",
          direction: "desc",
          page: 1,
          pageSize: 10,
        }).toString(),
      ).toBe(
        "status=all&search=&sort=createdAt&direction=desc&page=1&pageSize=10",
      );
    });
  });

  describe("createOrder", () => {
    it("sends POST /orders with payload and returns created order", async () => {
      const mockOrder = {
        id: "order_123",
        displayId: "ORD-0001",
        customerName: "Acme Corp",
        dueDate: "2026-09-01",
        status: "pending",
        totalAmountCents: 10000,
        paidAmountCents: 0,
        balanceDueCents: 10000,
        isEditable: true,
        isDeletable: true,
        items: [
          {
            id: "item_1",
            description: "Consulting",
            quantity: 1,
            unitPriceCents: 10000,
            lineTotalCents: 10000,
            position: 1,
          },
        ],
        payments: [],
        createdAt: "2026-08-15T00:00:00.000Z",
        updatedAt: "2026-08-15T00:00:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockOrder }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await createOrder({
        customerName: "Acme Corp",
        dueDate: "2026-09-01",
        items: [
          { description: "Consulting", quantity: 1, unitPriceCents: 10000 },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            customerName: "Acme Corp",
            dueDate: "2026-09-01",
            items: [
              { description: "Consulting", quantity: 1, unitPriceCents: 10000 },
            ],
          }),
        }),
      );
      expect(result).toEqual(mockOrder);
    });

    it("throws ApiError when server returns 422 validation failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "VALIDATION_FAILED",
              message: "Please correct the highlighted fields.",
              details: {
                fields: { customerName: ["Customer name is required."] },
              },
              requestId: "req_test",
            },
          }),
          { status: 422, headers: { "Content-Type": "application/json" } },
        ),
      );

      await expect(
        createOrder({ customerName: "", dueDate: "2026-09-01", items: [] }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("replaceOrder", () => {
    it("sends PATCH /orders/:id with payload and returns updated order", async () => {
      const mockUpdated = {
        id: "order_123",
        displayId: "ORD-0001",
        customerName: "Acme Updated",
        dueDate: "2026-09-05",
        status: "pending",
        totalAmountCents: 15000,
        paidAmountCents: 0,
        balanceDueCents: 15000,
        isEditable: true,
        isDeletable: true,
        items: [
          {
            id: "item_1",
            description: "Consulting",
            quantity: 3,
            unitPriceCents: 5000,
            lineTotalCents: 15000,
            position: 1,
          },
        ],
        payments: [],
        createdAt: "2026-08-15T00:00:00.000Z",
        updatedAt: "2026-08-15T01:00:00.000Z",
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUpdated }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await replaceOrder("order_123", {
        customerName: "Acme Updated",
        dueDate: "2026-09-05",
        items: [
          { description: "Consulting", quantity: 3, unitPriceCents: 5000 },
        ],
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders/order_123",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            customerName: "Acme Updated",
            dueDate: "2026-09-05",
            items: [
              { description: "Consulting", quantity: 3, unitPriceCents: 5000 },
            ],
          }),
        }),
      );
      expect(result).toEqual(mockUpdated);
    });

    it("throws ApiError with 409 ORDER_LOCKED_AFTER_PAYMENT if order has payments", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "ORDER_LOCKED_AFTER_PAYMENT",
              message: "Orders cannot be changed after the first payment.",
              requestId: "req_lock",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      );

      await expect(
        replaceOrder("order_123", {
          customerName: "Acme Updated",
          dueDate: "2026-09-01",
          items: [
            { description: "Consulting", quantity: 1, unitPriceCents: 1000 },
          ],
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe("deleteOrder", () => {
    it("sends DELETE /orders/:id and handles 204 No Content correctly", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      );

      await expect(deleteOrder("order_123")).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders/order_123",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    it("throws ApiError with 409 ORDER_LOCKED_AFTER_PAYMENT if delete rejected on paid order", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: "ORDER_LOCKED_AFTER_PAYMENT",
              message: "Orders cannot be deleted after the first payment.",
              requestId: "req_lock_del",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } },
        ),
      );

      await expect(deleteOrder("order_123")).rejects.toThrow(ApiError);
    });
  });

  describe("getOrderDetail", () => {
    it("fetches order detail from GET /orders/:id", async () => {
      const mockOrder = { id: "order_123", customerName: "Acme" };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockOrder }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await getOrderDetail("order_123");
      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders/order_123",
        expect.objectContaining({ credentials: "include" }),
      );
      expect(result).toEqual(mockOrder);
    });
  });

  describe("getOrderSummary", () => {
    it("fetches order summary metrics from GET /orders/summary", async () => {
      const mockSummary = {
        data: {
          totalOrders: 10,
          outstandingAmountCents: 50000,
          collectedAmountCents: 20000,
          overdueAmountCents: 5000,
        },
        meta: { asOfDate: "2026-08-15" },
      };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockSummary), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await getOrderSummary();
      expect(result).toEqual(mockSummary);
    });
  });

  describe("getOrders", () => {
    it("fetches paginated order list with query params", async () => {
      const mockList = {
        data: [],
        meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
      };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockList), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await getOrders({
        status: "all",
        sort: "createdAt",
        direction: "desc",
        page: 1,
        pageSize: 10,
      });
      expect(result).toEqual(mockList);
    });
  });

  describe("recordPayment", () => {
    it("sends POST /orders/:id/payments with Idempotency-Key header", async () => {
      const mockPaymentResult = {
        payment: {
          id: "pay_1",
          amountCents: 5000,
          paymentDate: "2026-08-15",
          note: "Deposit",
          createdAt: "2026-08-15T00:00:00.000Z",
        },
        order: {
          id: "order_123",
          status: "partially_paid",
          totalAmountCents: 10000,
          paidAmountCents: 5000,
          balanceDueCents: 5000,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockPaymentResult }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await recordPayment({
        orderId: "order_123",
        idempotencyKey: "e4eaaaf2-d142-11e1-b3e4-080027620cdd",
        payment: { amountCents: 5000, paymentDate: "2026-08-15", note: "Deposit" },
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders/order_123/payments",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify({
            amountCents: 5000,
            paymentDate: "2026-08-15",
            note: "Deposit",
          }),
        }),
      );
      expect(result).toEqual(mockPaymentResult);
    });
  });
});
