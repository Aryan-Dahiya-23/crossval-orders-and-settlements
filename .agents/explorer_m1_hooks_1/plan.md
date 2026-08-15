# Milestone 1: Frontend API Client & React Query Hooks Blueprint

## 1. Executive Summary & Architecture Overview

This blueprint provides the complete architectural design and implementation specification for the frontend API client methods and React Query mutations required for **Milestone 1 (Order Lifecycle UI/UX - Phase 8)**.

### Objectives
1. Implement client API wrappers in `@crossval/web` for order creation (`POST /orders`), replacement (`PATCH /orders/:orderId`), and deletion (`DELETE /orders/:orderId`).
2. Implement TanStack React Query mutation hooks (`useCreateOrder`, `useReplaceOrder`, `useDeleteOrder`) with fine-grained cache management and invalidation.
3. Establish comprehensive error handling for API error envelopes, converting 409 `ORDER_LOCKED_AFTER_PAYMENT`, 422 `VALIDATION_FAILED`, and 404 `ORDER_NOT_FOUND` into actionable UI feedback and React Hook Form field errors.
4. Define rigorous unit and integration testing patterns for API calls and mutation lifecycles.

---

## 2. Codebase Layout & Path Convention

In the repository structure:
- Next.js application root is at `apps/web/` (without `src/`).
- Feature domain modules reside at `apps/web/features/orders/` and `apps/web/features/auth/`.
- Shared HTTP client and utility helpers reside at `apps/web/lib/api-client.ts` and `apps/web/lib/format.ts`.
- Shared schemas, types, and error codes reside in the `@crossval/contracts` workspace package.

### Target File Mapping

| Concept | Primary Canonical Path | Re-export / Compatibility Path |
|---|---|---|
| **API Client Methods** | `apps/web/features/orders/api.ts` | `apps/web/lib/api/orders.ts` |
| **React Query Hooks** | `apps/web/features/orders/queries.ts` | `apps/web/lib/hooks/use-orders.ts` |
| **Query Key Factory** | `apps/web/features/orders/query-keys.ts` | `apps/web/lib/query-keys.ts` |
| **Error Handling Helper** | `apps/web/features/orders/errors.ts` | `apps/web/lib/errors/orders.ts` |
| **Unit / Integration Tests** | `apps/web/features/orders/api.test.ts` | — |

---

## 3. Data Contracts & Type Signatures

All domain types are imported from `@crossval/contracts`.

```typescript
import type {
  CreateOrderRequest,
  OrderDetail,
  OrderDetailResponse,
  OrderLineItemInput,
  OrderStatus,
  ReplaceOrderRequest,
  ApiErrorResponse,
  ApiErrorCode,
} from "@crossval/contracts";
```

### Type Aliases & Input Shapes

```typescript
// Type aliases for flexible consumer usage
export type CreateOrderInput = CreateOrderRequest;
export type ReplaceOrderInput = ReplaceOrderRequest;
export type OrderResponse = OrderDetail;

export interface ReplaceOrderParams {
  orderId: string;
  order: ReplaceOrderRequest;
}
```

---

## 4. API Client Implementation Blueprint

### File: `apps/web/features/orders/api.ts`

```typescript
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

/**
 * Creates a new multi-item order.
 * Endpoint: POST /orders
 * Status: 201 Created
 */
export const createOrder = async (
  input: CreateOrderRequest,
): Promise<OrderDetail> => {
  const response = await apiRequest<OrderDetailResponse>("/orders", {
    method: "POST",
    body: input,
  });
  return response.data;
};

/**
 * Replaces an existing unpaid order in full.
 * Endpoint: PATCH /orders/:orderId
 * Status: 200 OK
 * Errors: 409 ORDER_LOCKED_AFTER_PAYMENT, 404 ORDER_NOT_FOUND, 422 VALIDATION_FAILED
 */
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

/**
 * Deletes an existing unpaid order.
 * Endpoint: DELETE /orders/:orderId
 * Status: 204 No Content
 * Errors: 409 ORDER_LOCKED_AFTER_PAYMENT, 404 ORDER_NOT_FOUND
 */
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
```

---

## 5. React Query Hooks Implementation Blueprint

### File: `apps/web/features/orders/queries.ts`

```typescript
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

/**
 * Mutation hook to create a new order.
 * - Posts to POST /orders
 * - Populates order detail cache with the created order
 * - Invalidates active lists and summary metrics
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrderRequest) => createOrder(input),
    onSuccess: async (createdOrder) => {
      queryClient.setQueryData(
        orderKeys.detail(createdOrder.id),
        createdOrder,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);
    },
  });
};

/**
 * Mutation hook to replace an unpaid order.
 * Supports both:
 * 1. useReplaceOrder(orderId).mutateAsync(input)
 * 2. useReplaceOrder().mutateAsync({ orderId, order })
 *
 * Cache actions on success:
 * - Updates the specific order detail cache with new data
 * - Invalidates orderKeys.detail(orderId)
 * - Invalidates orderKeys.lists()
 * - Invalidates orderKeys.summaries()
 */
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

/**
 * Mutation hook to delete an unpaid order.
 * Supports:
 * 1. useDeleteOrder(orderId).mutateAsync()
 * 2. useDeleteOrder().mutateAsync(orderId)
 *
 * Cache actions on success:
 * - Removes orderKeys.detail(orderId) from React Query cache
 * - Invalidates orderKeys.lists()
 * - Invalidates orderKeys.summaries()
 */
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
```

---

## 6. Comprehensive Error Handling & Envelope Parsing

### Error Model Overview

The backend returns a standard JSON error envelope:
```json
{
  "error": {
    "code": "ORDER_LOCKED_AFTER_PAYMENT",
    "message": "Orders cannot be changed after the first payment.",
    "details": {
      "fields": {
        "customerName": ["Customer name is required."],
        "items.0.unitPriceCents": ["Amount must be at least 1 cent."]
      }
    },
    "requestId": "req_12345"
  }
}
```

The frontend HTTP fetcher `apps/web/lib/api-client.ts` intercepts non-2xx responses and throws an `ApiError`:
```typescript
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details: ApiErrorResponse["error"]["details"];
  public readonly requestId: string;
}
```

### Dedicated Error Mapping Utility: `apps/web/features/orders/errors.ts`

```typescript
import type { UseFormSetError, FieldValues, Path } from "react-hook-form";
import { ApiError } from "../../lib/api-client";

export interface ParsedOrderError {
  title: string;
  message: string;
  isLocked: boolean;
  isNotFound: boolean;
  fieldErrors: Record<string, string[]>;
}

/**
 * Parses and categorizes errors from order API mutations.
 */
export const parseOrderApiError = (error: unknown): ParsedOrderError => {
  if (error instanceof ApiError) {
    if (error.code === "ORDER_LOCKED_AFTER_PAYMENT" || error.status === 409) {
      return {
        title: "Order is locked",
        message:
          "This order has recorded payments and is permanently locked against modifications or deletion for financial audit integrity.",
        isLocked: true,
        isNotFound: false,
        fieldErrors: {},
      };
    }

    if (error.code === "ORDER_NOT_FOUND" || error.status === 404) {
      return {
        title: "Order not found",
        message:
          "The requested order could not be found or belongs to a different workspace.",
        isLocked: false,
        isNotFound: true,
        fieldErrors: {},
      };
    }

    if (error.code === "VALIDATION_FAILED" || error.status === 422) {
      return {
        title: "Validation error",
        message: error.message || "Please review and correct the highlighted fields.",
        isLocked: false,
        isNotFound: false,
        fieldErrors: error.details?.fields ?? {},
      };
    }

    if (error.code === "AUTHENTICATION_REQUIRED" || error.status === 401) {
      return {
        title: "Session expired",
        message: "Your session has expired. Please sign in again to continue.",
        isLocked: false,
        isNotFound: false,
        fieldErrors: {},
      };
    }

    return {
      title: "Request failed",
      message: error.message || "An unexpected error occurred. Please try again.",
      isLocked: false,
      isNotFound: false,
      fieldErrors: error.details?.fields ?? {},
    };
  }

  return {
    title: "Network error",
    message:
      error instanceof Error
        ? error.message
        : "Unable to connect to the server. Please check your network connection.",
    isLocked: false,
    isNotFound: false,
    fieldErrors: {},
  };
};

/**
 * Applies parsed field errors to a React Hook Form instance.
 */
export const applyApiFieldErrorsToForm = <TFormValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TFormValues>,
): boolean => {
  let appliedAny = false;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      setError(field as Path<TFormValues>, {
        type: "server",
        message: messages[0],
      });
      appliedAny = true;
    }
  }
  return appliedAny;
};
```

---

## 7. Unit & Integration Testing Strategy

### 1. API Client Testing (`apps/web/features/orders/api.test.ts`)

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrder, replaceOrder, deleteOrder } from "./api";
import { ApiError } from "../../lib/api-client";

describe("order API mutations", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("createOrder", () => {
    it("sends POST /orders with JSON payload and returns created order", async () => {
      const mockOrder = { id: "order_123", customerName: "Acme Corp", totalAmountCents: 10000 };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockOrder }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await createOrder({
        customerName: "Acme Corp",
        dueDate: "2026-09-01",
        items: [{ description: "Consulting", quantity: 1, unitPriceCents: 10000 }],
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify({
            customerName: "Acme Corp",
            dueDate: "2026-09-01",
            items: [{ description: "Consulting", quantity: 1, unitPriceCents: 10000 }],
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
              details: { fields: { customerName: ["Customer name is required."] } },
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
      const mockUpdated = { id: "order_123", customerName: "Acme Updated" };
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify({ data: mockUpdated }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const result = await replaceOrder("order_123", {
        customerName: "Acme Updated",
        dueDate: "2026-09-01",
        items: [{ description: "Consulting", quantity: 2, unitPriceCents: 5000 }],
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/v1/orders/order_123",
        expect.objectContaining({ method: "PATCH" }),
      );
      expect(result).toEqual(mockUpdated);
    });

    it("throws ApiError with 409 ORDER_LOCKED_AFTER_PAYMENT if order is paid", async () => {
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
          items: [{ description: "Consulting", quantity: 1, unitPriceCents: 1000 }],
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
  });
});
```

### 2. Error Parser Unit Tests (`apps/web/features/orders/errors.test.ts`)

```typescript
import { describe, expect, it } from "vitest";
import { parseOrderApiError } from "./errors";
import { ApiError } from "../../lib/api-client";

describe("parseOrderApiError", () => {
  it("formats 409 ORDER_LOCKED_AFTER_PAYMENT with clear financial lock explanation", () => {
    const error = new ApiError(409, {
      error: {
        code: "ORDER_LOCKED_AFTER_PAYMENT",
        message: "Orders cannot be changed after the first payment.",
        requestId: "req_1",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.isLocked).toBe(true);
    expect(parsed.title).toBe("Order is locked");
  });

  it("extracts field errors from 422 VALIDATION_FAILED", () => {
    const error = new ApiError(422, {
      error: {
        code: "VALIDATION_FAILED",
        message: "Validation error",
        details: { fields: { "items.0.unitPriceCents": ["Amount must be at least 1 cent."] } },
        requestId: "req_2",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.fieldErrors["items.0.unitPriceCents"]).toEqual(["Amount must be at least 1 cent."]);
  });
});
```

---

## 8. Implementation Steps & Checklist

- [ ] **Step 1**: Update `apps/web/features/orders/api.ts` to export `createOrder`, `replaceOrder`, `deleteOrder`, and related type aliases.
- [ ] **Step 2**: Update `apps/web/features/orders/queries.ts` to implement `useCreateOrder`, `useReplaceOrder`, and `useDeleteOrder` with precise query invalidations and cache removals.
- [ ] **Step 3**: Implement `apps/web/features/orders/errors.ts` for error parsing and React Hook Form field mapping.
- [ ] **Step 4**: Extend `apps/web/features/orders/api.test.ts` to test all new API functions and error cases.
- [ ] **Step 5**: If required for path consistency, add re-export entry points at `apps/web/lib/api/orders.ts` and `apps/web/lib/hooks/use-orders.ts`.
- [ ] **Step 6**: Execute `pnpm test` and `pnpm typecheck` to ensure 100% compliance.
