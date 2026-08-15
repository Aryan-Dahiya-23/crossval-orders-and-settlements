import type { OrderDetail, OrderListQuery } from "@crossval/contracts";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  centsToDecimalString,
  decimalToCents,
  orderFormSchema,
  orderLineItemFormSchema,
} from "./form-schema";
import { applyApiFieldErrorsToForm, parseOrderApiError } from "./errors";
import { orderKeys } from "./query-keys";
import { formatDateOnly, formatUsd } from "../../lib/format";
import { ApiError } from "../../lib/api-client";
import { isCanonicalDateOnly } from "../../../../apps/api/src/modules/orders/domain";

describe("Adversarial Stress Suite — Milestone 1", () => {
  /* ========================================================================
   * Area 1: React Query Cache Consistency & Invalidation Hierarchy
   * ======================================================================== */
  describe("Area 1: React Query Cache Consistency & Invalidation Hierarchy", () => {
    let queryClient: QueryClient;

    beforeEach(() => {
      queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      });
    });

    it("invalidating orderKeys.lists() correctly marks ALL filtered and paginated list queries stale", async () => {
      // Populate multiple list queries with different parameters
      const q1: OrderListQuery = { status: "pending", sort: "createdAt", direction: "desc", page: 1, pageSize: 10, search: "" };
      const q2: OrderListQuery = { status: "paid", sort: "totalAmount", direction: "asc", page: 2, pageSize: 25, search: "Acme" };
      const q3: OrderListQuery = { status: "overdue", sort: "dueDate", direction: "asc", page: 1, pageSize: 50, search: "" };

      queryClient.setQueryData(orderKeys.list(q1), { data: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
      queryClient.setQueryData(orderKeys.list(q2), { data: [], meta: { page: 2, pageSize: 25, totalItems: 0, totalPages: 0 } });
      queryClient.setQueryData(orderKeys.list(q3), { data: [], meta: { page: 1, pageSize: 50, totalItems: 0, totalPages: 0 } });

      // Verify queries are initially fresh
      const state1Before = queryClient.getQueryState(orderKeys.list(q1));
      const state2Before = queryClient.getQueryState(orderKeys.list(q2));
      const state3Before = queryClient.getQueryState(orderKeys.list(q3));
      expect(state1Before?.isInvalidated).toBe(false);
      expect(state2Before?.isInvalidated).toBe(false);
      expect(state3Before?.isInvalidated).toBe(false);

      // Invalidate the root list key
      await queryClient.invalidateQueries({ queryKey: orderKeys.lists() });

      // Check that all 3 distinct list queries were invalidated
      const state1After = queryClient.getQueryState(orderKeys.list(q1));
      const state2After = queryClient.getQueryState(orderKeys.list(q2));
      const state3After = queryClient.getQueryState(orderKeys.list(q3));
      expect(state1After?.isInvalidated).toBe(true);
      expect(state2After?.isInvalidated).toBe(true);
      expect(state3After?.isInvalidated).toBe(true);
    });

    it("order creation populates detail cache and invalidates lists and summaries", async () => {
      const mockCreatedOrder: OrderDetail = {
        id: "66bc90000000000000000001",
        displayId: "ORD-00000001",
        customerName: "Apex Logistics",
        dueDate: "2026-09-15",
        status: "pending",
        totalAmountCents: 150000,
        paidAmountCents: 0,
        balanceDueCents: 150000,
        isEditable: true,
        isDeletable: true,
        items: [
          {
            id: "66bc90000000000000000002",
            description: "Consulting",
            quantity: 1,
            unitPriceCents: 150000,
            lineTotalCents: 150000,
            position: 0,
          },
        ],
        payments: [],
        createdAt: "2026-08-15T00:00:00.000Z",
        updatedAt: "2026-08-15T00:00:00.000Z",
      };

      // Set summary query
      queryClient.setQueryData(orderKeys.summaries(), {
        data: { totalOrders: 10, outstandingAmountCents: 50000, collectedAmountCents: 10000, overdueAmountCents: 0 },
        meta: { asOfDate: "2026-08-15" },
      });

      // Simulate onSuccess of useCreateOrder
      queryClient.setQueryData(orderKeys.detail(mockCreatedOrder.id), mockCreatedOrder);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);

      // Assertions
      const cachedDetail = queryClient.getQueryData<OrderDetail>(orderKeys.detail(mockCreatedOrder.id));
      expect(cachedDetail).toEqual(mockCreatedOrder);
      expect(cachedDetail?.customerName).toBe("Apex Logistics");

      const summaryState = queryClient.getQueryState(orderKeys.summaries());
      expect(summaryState?.isInvalidated).toBe(true);
    });

    it("order deletion removes target detail query from cache and invalidates lists and summaries", async () => {
      const orderId = "66bc90000000000000000099";
      queryClient.setQueryData(orderKeys.detail(orderId), { id: orderId, customerName: "To Delete" });

      // Verify detail is present
      expect(queryClient.getQueryData(orderKeys.detail(orderId))).toBeDefined();

      // Simulate useDeleteOrder onSuccess
      queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);

      // Verify target detail was completely removed, not just invalidated
      expect(queryClient.getQueryData(orderKeys.detail(orderId))).toBeUndefined();
      expect(queryClient.getQueryState(orderKeys.detail(orderId))).toBeUndefined();
    });

    it("order replacement updates detail data and invalidates detail, lists, and summaries", async () => {
      const orderId = "66bc90000000000000000088";
      const oldOrder: OrderDetail = {
        id: orderId,
        displayId: "ORD-00000088",
        customerName: "Old Name",
        dueDate: "2026-08-20",
        status: "pending",
        totalAmountCents: 10000,
        paidAmountCents: 0,
        balanceDueCents: 10000,
        isEditable: true,
        isDeletable: true,
        items: [],
        payments: [],
        createdAt: "2026-08-10T00:00:00.000Z",
        updatedAt: "2026-08-10T00:00:00.000Z",
      };

      const updatedOrder: OrderDetail = {
        ...oldOrder,
        customerName: "Brand New Name",
        totalAmountCents: 25000,
        balanceDueCents: 25000,
        updatedAt: "2026-08-15T01:00:00.000Z",
      };

      queryClient.setQueryData(orderKeys.detail(orderId), oldOrder);

      // Simulate useReplaceOrder onSuccess
      queryClient.setQueryData(orderKeys.detail(orderId), updatedOrder);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);

      const cached = queryClient.getQueryData<OrderDetail>(orderKeys.detail(orderId));
      expect(cached?.customerName).toBe("Brand New Name");
      expect(cached?.totalAmountCents).toBe(25000);
      expect(queryClient.getQueryState(orderKeys.detail(orderId))?.isInvalidated).toBe(true);
    });
  });

  /* ========================================================================
   * Area 2: Delete Redirects & Error Handling
   * ======================================================================== */
  describe("Area 2: Delete Redirects & Dialog Safety", () => {
    it("handles 409 conflict when deleting an order that received a concurrent payment", () => {
      const conflictError = new ApiError(409, {
        error: {
          code: "ORDER_LOCKED_AFTER_PAYMENT",
          message: "Orders cannot be changed after the first payment.",
          requestId: "req_del_conflict",
        },
      });

      const parsed = parseOrderApiError(conflictError);
      expect(parsed.isLocked).toBe(true);
      expect(parsed.isNotFound).toBe(false);
      expect(parsed.title).toBe("Order is locked");
      expect(parsed.message).toContain("permanently locked");
    });

    it("handles 404 when deleting an order that was already deleted by another session", () => {
      const notFoundError = new ApiError(404, {
        error: {
          code: "ORDER_NOT_FOUND",
          message: "Order not found.",
          requestId: "req_del_404",
        },
      });

      const parsed = parseOrderApiError(notFoundError);
      expect(parsed.isNotFound).toBe(true);
      expect(parsed.isLocked).toBe(false);
      expect(parsed.title).toBe("Order not found");
    });
  });

  /* ========================================================================
   * Area 3: Error Recovery (409, 422, 404, 401, Network Errors)
   * ======================================================================== */
  describe("Area 3: Error Recovery & Field Error Mapping", () => {
    it("parses 422 validation errors with deep field paths", () => {
      const error = new ApiError(422, {
        error: {
          code: "VALIDATION_FAILED",
          message: "Validation failed across multiple fields.",
          details: {
            fields: {
              customerName: ["Customer name cannot be empty."],
              dueDate: ["Due date must be in YYYY-MM-DD format."],
              "items.0.description": ["Description is required."],
              "items.1.unitPrice": ["Unit price must be at least $0.01."],
            },
          },
          requestId: "req_val_deep",
        },
      });

      const parsed = parseOrderApiError(error);
      expect(parsed.isLocked).toBe(false);
      expect(parsed.isNotFound).toBe(false);
      expect(parsed.title).toBe("Validation error");
      expect(parsed.fieldErrors["customerName"]).toEqual(["Customer name cannot be empty."]);
      expect(parsed.fieldErrors["items.0.description"]).toEqual(["Description is required."]);
      expect(parsed.fieldErrors["items.1.unitPrice"]).toEqual(["Unit price must be at least $0.01."]);
    });

    it("maps field errors into react-hook-form setError callback", () => {
      const setErrorMock = vi.fn();
      const fieldErrors = {
        customerName: ["First error message", "Second error message"],
        "items.0.unitPrice": ["Price is too low"],
      };

      const applied = applyApiFieldErrorsToForm(fieldErrors, setErrorMock);
      expect(applied).toBe(true);
      expect(setErrorMock).toHaveBeenCalledTimes(2);
      expect(setErrorMock).toHaveBeenCalledWith("customerName", {
        type: "server",
        message: "First error message",
      });
      expect(setErrorMock).toHaveBeenCalledWith("items.0.unitPrice", {
        type: "server",
        message: "Price is too low",
      });
    });

    it("handles empty or malformed field errors gracefully", () => {
      const setErrorMock = vi.fn();
      const emptyApplied = applyApiFieldErrorsToForm({}, setErrorMock);
      expect(emptyApplied).toBe(false);
      expect(setErrorMock).not.toHaveBeenCalled();

      const blankMessageApplied = applyApiFieldErrorsToForm({ customerName: [""] }, setErrorMock);
      expect(blankMessageApplied).toBe(false);
      expect(setErrorMock).not.toHaveBeenCalled();
    });

    it("recovers from 401 session expiry", () => {
      const error = new ApiError(401, {
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required.",
          requestId: "req_auth",
        },
      });
      const parsed = parseOrderApiError(error);
      expect(parsed.title).toBe("Session expired");
      expect(parsed.message).toContain("session has expired");
    });

    it("recovers from generic network errors and unhandled exceptions", () => {
      const netError = new TypeError("Failed to fetch");
      const parsed = parseOrderApiError(netError);
      expect(parsed.title).toBe("Network error");
      expect(parsed.message).toBe("Failed to fetch");

      const unknownError = parseOrderApiError({ random: "payload" });
      expect(unknownError.title).toBe("Network error");
    });
  });

  /* ========================================================================
   * Area 4: Date Format Handling & Timezone Boundary Tests
   * ======================================================================== */
  describe("Area 4: Date Format Handling & Timezone Boundary Tests", () => {
    it("formatDateOnly formats YYYY-MM-DD deterministically regardless of timezone", () => {
      expect(formatDateOnly("2026-01-01")).toBe("Jan 1, 2026");
      expect(formatDateOnly("2026-08-15")).toBe("Aug 15, 2026");
      expect(formatDateOnly("2026-12-31")).toBe("Dec 31, 2026");
      expect(formatDateOnly("2024-02-29")).toBe("Feb 29, 2024"); // Leap day
    });

    it("canonical date validator correctly identifies valid and invalid dates", () => {
      // Valid dates
      expect(isCanonicalDateOnly("2026-08-15")).toBe(true);
      expect(isCanonicalDateOnly("2024-02-29")).toBe(true); // 2024 is leap year
      expect(isCanonicalDateOnly("2000-02-29")).toBe(true); // 2000 is leap century
      expect(isCanonicalDateOnly("2026-12-31")).toBe(true);

      // Invalid dates
      expect(isCanonicalDateOnly("2026-02-29")).toBe(false); // 2026 is NOT leap year
      expect(isCanonicalDateOnly("2026-04-31")).toBe(false); // April has 30 days
      expect(isCanonicalDateOnly("2026-13-01")).toBe(false); // Month 13
      expect(isCanonicalDateOnly("2026-00-10")).toBe(false); // Month 0
      expect(isCanonicalDateOnly("2026-01-00")).toBe(false); // Day 0
      expect(isCanonicalDateOnly("2026-01-32")).toBe(false); // Day 32
      expect(isCanonicalDateOnly("2026/08/15")).toBe(false); // Slash separator
      expect(isCanonicalDateOnly("08-15-2026")).toBe(false); // MM-DD-YYYY
      expect(isCanonicalDateOnly("2026-8-15")).toBe(false); // Unpadded month
      expect(isCanonicalDateOnly("2026-08-5")).toBe(false); // Unpadded day
      expect(isCanonicalDateOnly("2026-08-15T00:00:00Z")).toBe(false); // ISO timestamp
    });

    it("orderFormSchema strictly enforces YYYY-MM-DD format regex", () => {
      const validBase = {
        customerName: "Valid Customer",
        dueDate: "2026-09-01",
        items: [{ description: "Item 1", quantity: 1, unitPrice: "10.00" }],
      };

      expect(orderFormSchema.safeParse(validBase).success).toBe(true);

      expect(orderFormSchema.safeParse({ ...validBase, dueDate: "2026/09/01" }).success).toBe(false);
      expect(orderFormSchema.safeParse({ ...validBase, dueDate: "09-01-2026" }).success).toBe(false);
      expect(orderFormSchema.safeParse({ ...validBase, dueDate: "2026-9-1" }).success).toBe(false);
      expect(orderFormSchema.safeParse({ ...validBase, dueDate: "2026-09-01T12:00:00.000Z" }).success).toBe(false);
    });
  });

  /* ========================================================================
   * Area 5: Financial Precision & Line Item Boundaries
   * ======================================================================== */
  describe("Area 5: Financial Precision & Line Item Boundaries", () => {
    it("handles binary floating-point edge cases in decimalToCents", () => {
      // Classical JS float precision hazards: 19.99 * 100 = 1998.9999999999998
      expect(decimalToCents("19.99")).toBe(1999);
      expect(decimalToCents("29.99")).toBe(2999);
      expect(decimalToCents("0.07")).toBe(7);
      expect(decimalToCents("1.14")).toBe(114);
      expect(decimalToCents("4.99")).toBe(499);
      expect(decimalToCents("1000.00")).toBe(100000);
      expect(decimalToCents("9999999.99")).toBe(999999999);
    });

    it("rejects sub-cent fractions and invalid string representations", () => {
      expect(decimalToCents("10.001")).toBeNull();
      expect(decimalToCents("10.999")).toBeNull();
      expect(decimalToCents("-0.01")).toBeNull();
      expect(decimalToCents("1e2")).toBeNull();
      expect(decimalToCents("Infinity")).toBeNull();
      expect(decimalToCents("NaN")).toBeNull();
      expect(decimalToCents("")).toBeNull();
    });

    it("orderLineItemFormSchema enforces strict constraints on individual items", () => {
      expect(
        orderLineItemFormSchema.safeParse({
          description: "Valid Line Item",
          quantity: 1000000,
          unitPrice: "9.99",
        }).success,
      ).toBe(true);

      // Quantity exceeds 1,000,000
      expect(
        orderLineItemFormSchema.safeParse({
          description: "Valid Line Item",
          quantity: 1000001,
          unitPrice: "9.99",
        }).success,
      ).toBe(false);

      // Description exceeds 500 characters
      expect(
        orderLineItemFormSchema.safeParse({
          description: "X".repeat(501),
          quantity: 1,
          unitPrice: "9.99",
        }).success,
      ).toBe(false);
    });

    it("centsToDecimalString converts integer cents back accurately", () => {
      expect(centsToDecimalString(1999)).toBe("19.99");
      expect(centsToDecimalString(7)).toBe("0.07");
      expect(centsToDecimalString(0)).toBe("0.00");
      expect(centsToDecimalString(100000)).toBe("1000.00");
      expect(centsToDecimalString(999999999)).toBe("9999999.99");
    });

    it("formatUsd formats values correctly with currency symbol and commas", () => {
      expect(formatUsd(100000)).toBe("$1,000.00");
      expect(formatUsd(40000)).toBe("$400.00");
      expect(formatUsd(60000)).toBe("$600.00");
      expect(formatUsd(0)).toBe("$0.00");
      expect(formatUsd(999999999)).toBe("$9,999,999.99");
    });

    it("enforces order maximum limit ($9,999,999.99 = 999,999,999 cents) across multiple line items", () => {
      const orderAtLimit = {
        customerName: "Limit Corp",
        dueDate: "2026-10-01",
        items: [
          { description: "Item 1", quantity: 1, unitPrice: "5000000.00" },
          { description: "Item 2", quantity: 1, unitPrice: "4999999.99" },
        ],
      };
      expect(orderFormSchema.safeParse(orderAtLimit).success).toBe(true);

      const orderExceedingLimit = {
        customerName: "Limit Corp",
        dueDate: "2026-10-01",
        items: [
          { description: "Item 1", quantity: 1, unitPrice: "5000000.00" },
          { description: "Item 2", quantity: 1, unitPrice: "5000000.00" },
        ],
      };
      const result = orderFormSchema.safeParse(orderExceedingLimit);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("exceeds the maximum allowed value");
      }
    });
  });
});
