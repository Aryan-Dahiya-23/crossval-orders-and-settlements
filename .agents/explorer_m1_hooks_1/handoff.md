# Milestone 1: Frontend API Client & React Query Mutations Handoff Report

## 1. Observation

1. **Backend Route Implementations (`apps/api/src/modules/orders/routes.ts`)**:
   - Lines 58–65: `POST /orders` handles order creation with `parseOrderInput(createOrderRequestSchema, request.body)` and returns `DataResponse<OrderDetail>` with status `201 Created`.
   - Lines 96–107: `PATCH /orders/:orderId` handles order replacement with `parseOrderInput(replaceOrderRequestSchema, request.body)` and returns `DataResponse<OrderDetail>` with status `200 OK`.
   - Lines 109–116: `DELETE /orders/:orderId` handles order deletion with `orderService.delete(context.userId, parseOrderId(request.params.orderId))` and returns status `204 No Content`.
   - Lines 413–423 in `apps/api/src/modules/orders/service.ts`: When `paymentCount > 0`, `replace` and `delete` throw `AppError` with status `409` and code `ORDER_LOCKED_AFTER_PAYMENT` ("Orders cannot be changed after the first payment.").
   - Lines 33–38 in `apps/api/src/modules/orders/validation.ts`: Validation errors return status `422` with code `VALIDATION_FAILED` and `details.fields`.

2. **Frontend API Client (`apps/web/features/orders/api.ts` & `apps/web/lib/api-client.ts`)**:
   - `apps/web/lib/api-client.ts` (lines 57–59, 62–67): Handles HTTP requests, parses `204 No Content` as `undefined`, and throws `ApiError` instances containing `status`, `code`, `details`, and `requestId`.
   - `apps/web/features/orders/api.ts`: Currently implements `getOrders` (lines 26–34), `getOrderSummary` (lines 36–41), `getOrderDetail` (lines 43–51), and `recordPayment` (lines 59–71). API client methods for `createOrder`, `replaceOrder`, and `deleteOrder` are missing.

3. **React Query Hooks (`apps/web/features/orders/queries.ts` & `query-keys.ts`)**:
   - `apps/web/features/orders/query-keys.ts` (lines 3–19): Defines `orderKeys.all`, `orderKeys.lists()`, `orderKeys.list(params)`, `orderKeys.summaries()`, and `orderKeys.detail(orderId)`.
   - `apps/web/features/orders/queries.ts`: Exports `useOrders`, `useOrderSummary`, `useOrderDetail`, and `useRecordPayment`. React Query mutation hooks `useCreateOrder`, `useReplaceOrder`, and `useDeleteOrder` are missing.

4. **Directory Structure & Path Alignment**:
   - Next.js root in `apps/web` does not use `src/`; files are organized into `apps/web/features/orders/`, `apps/web/components/`, `apps/web/lib/`, and `apps/web/app/`.

---

## 2. Logic Chain

1. *From Observation 1*: The Express API backend is fully functional for `POST /orders`, `PATCH /orders/:orderId`, and `DELETE /orders/:orderId`, producing typed `OrderDetail` responses or 204 status, with specific HTTP 409 and 422 error codes on domain and validation violations.
2. *From Observation 2 & 4*: In `apps/web/features/orders/api.ts` (and aliased at `apps/web/lib/api/orders.ts` if needed), we must implement `createOrder`, `replaceOrder`, and `deleteOrder` calling `apiRequest` with matching HTTP methods (POST, PATCH, DELETE) and payloads from `@crossval/contracts`.
3. *From Observation 3*: In `apps/web/features/orders/queries.ts`:
   - `useCreateOrder` must call `createOrder`, seed `orderKeys.detail(created.id)`, and invalidate `orderKeys.lists()` and `orderKeys.summaries()`.
   - `useReplaceOrder` must call `replaceOrder`, update `orderKeys.detail(orderId)`, and invalidate `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()`.
   - `useDeleteOrder` must call `deleteOrder`, remove `orderKeys.detail(orderId)` from cache via `queryClient.removeQueries`, and invalidate `orderKeys.lists()` and `orderKeys.summaries()`.
4. *From Observation 1 & 2*: Error handling must inspect `ApiError` instances, providing clean domain messages for 409 `ORDER_LOCKED_AFTER_PAYMENT` ("Orders cannot be changed after the first payment.") and unpacking `details.fields` from 422 `VALIDATION_FAILED` to bind directly to form inputs.

---

## 3. Caveats

- **Path Conventions**: The prompt specifies paths like `apps/web/src/lib/api/orders.ts`. The repository structure uses `apps/web/features/orders/api.ts` and `apps/web/lib/api-client.ts`. Our architecture accounts for both by providing the canonical feature-based implementation and re-export compatibility.
- **Optimistic Updates**: Optimistic cache updates are intentionally avoided for order deletion and replacement because financial state, derived status, and server totals must remain authoritative. `queryClient.invalidateQueries` and `queryClient.setQueryData` on success guarantee strict consistency.

---

## 4. Conclusion

The architectural design and implementation plan for Milestone 1 Frontend API Client & React Query Mutations is complete and documented in `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1/plan.md`.

The plan specifies:
1. `createOrder`, `replaceOrder`, and `deleteOrder` API functions in `apps/web/features/orders/api.ts`.
2. `useCreateOrder`, `useReplaceOrder`, and `useDeleteOrder` hooks in `apps/web/features/orders/queries.ts` with exact cache invalidation and query removal behavior.
3. A robust error parsing utility (`parseOrderApiError`, `applyApiFieldErrorsToForm`) in `apps/web/features/orders/errors.ts` for handling 409 locks and 422 field errors.
4. Comprehensive unit test suites for API calls and error mappings in Vitest.

---

## 5. Verification Method

To verify the design against the codebase:
1. Review `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1/plan.md`.
2. Check existing test suite status:
   ```bash
   pnpm test
   ```
3. When implemented, verify all unit and integration tests:
   ```bash
   pnpm --filter @crossval/web test
   pnpm typecheck
   ```
