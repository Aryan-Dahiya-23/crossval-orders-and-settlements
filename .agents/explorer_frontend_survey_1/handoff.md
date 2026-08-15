# Handoff Report: Frontend Architecture & Order Management Survey

## 1. Observation
- **Route Tree & App Router**:
  - Inspected `apps/web/app/orders`: Contains `page.tsx` (dashboard) and `[orderId]/page.tsx` (detail view).
  - Observed that `apps/web/app/orders/new` and `apps/web/app/orders/[orderId]/edit` **do not exist**.
- **Backend API Endpoints**:
  - `apps/api/src/modules/orders/routes.ts`:
    - Line 58: `router.post("/", ...)` -> `orderService.create` returns 201 with `CreateOrderRequest`.
    - Line 96: `router.patch("/:orderId", ...)` -> `orderService.replace` returns 200 with `ReplaceOrderRequest`.
    - Line 110: `router.delete("/:orderId", ...)` -> `orderService.delete` returns 204.
    - Line 68: `router.post("/:orderId/payments", ...)` -> `orderService.recordPayment`.
  - `apps/api/src/modules/orders/service.ts`:
    - Line 187: `replace` queries `{ _id: orderId, userId, paymentCount: 0 }`. If `paymentCount > 0`, line 413 throws HTTP 409 `ORDER_LOCKED_AFTER_PAYMENT`.
    - Line 217: `delete` queries `{ _id: orderId, userId, paymentCount: 0 }`. If `paymentCount > 0`, line 413 throws HTTP 409 `ORDER_LOCKED_AFTER_PAYMENT`.
- **Order Feature Layer**:
  - `apps/web/features/orders/api.ts`: Lines 26–71 export `getOrders`, `getOrderSummary`, `getOrderDetail`, and `recordPayment`. `createOrder`, `replaceOrder`, and `deleteOrder` are missing.
  - `apps/web/features/orders/queries.ts`: Lines 21–53 export `useOrders`, `useOrderSummary`, `useOrderDetail`, and `useRecordPayment`. Missing `useCreateOrder`, `useReplaceOrder`, and `useDeleteOrder`.
  - `apps/web/features/orders/query-keys.ts`: Lines 3–19 define `orderKeys` (`all`, `lists()`, `list(params)`, `summaries()`, `detail(orderId)`).
- **Order Detail Workspace**:
  - `apps/web/components/orders/order-detail-workspace.tsx`:
    - Lines 108–123 render a header with "Record payment" button or "Paid in full" badge.
    - No Edit or Delete buttons are present.
    - No delete confirmation dialog is wired.
    - No contextual banner/explanation is displayed when `detail.payments.length > 0` or `!detail.isEditable`.
- **Payment Dialog UX**:
  - `apps/web/components/orders/payment-dialog.tsx`:
    - Lines 180–195: "Use remaining" shortcut button sets the form's amount field to `(order.balanceDueCents / 100).toFixed(2)` with `shouldValidate: true`.
    - Lines 160–165: Current balance display banner.
    - Lines 81–91: Client-side idempotency preservation calculates fingerprint `JSON.stringify([submittedAmountCents, values.paymentDate, normalizedNote])` and preserves UUID attempt key across retry attempts.
    - Lines 107–120: `PAYMENT_EXCEEDS_BALANCE` error handler extracts `remainingAmountCents` and updates field validation message.

## 2. Logic Chain
1. *From Observation of Backend Routes & Services (`apps/api/src/modules/orders/routes.ts:58-115`)*: The backend and `@crossval/contracts` already fully support order creation (`POST /orders`), replacement (`PATCH /orders/:orderId`), conditional unpaid deletion (`DELETE /orders/:orderId`), and payment recording (`POST /orders/:orderId/payments`), enforcing `paymentCount === 0` locks with HTTP 409.
2. *From Observation of `apps/web/features/orders/api.ts` and `queries.ts`*: Frontend order queries currently only implement reads (`getOrders`, `getOrderSummary`, `getOrderDetail`) and payment mutation (`recordPayment`). Mutations for order creation, replacement, and deletion are missing from the API client and query hooks.
3. *From Observation of `apps/web/app/orders` directory*: Route pages for `/orders/new` and `/orders/[orderId]/edit` are not yet created in the Next.js App Router tree.
4. *From Observation of `order-detail-workspace.tsx`*: The order detail view successfully renders line items, financials, and payment history, but lacks the action controls (Edit/Delete), delete confirmation modal, and contextual locked-state indicators required for Phase 8.
5. *From Observation of `payment-dialog.tsx`*: The payment modal already fulfills the core Phase 9 UX specifications ("use remaining" shortcut, balance feedback, retry idempotency preservation, and query invalidation).
6. *From Observation of `query-keys.ts`*: The query key factory provides clear hierarchical prefixes (`orderKeys.lists()`, `orderKeys.summaries()`, `orderKeys.detail(orderId)`) that make full cache reconciliation across list, detail, and portfolio summary trivial to wire into the upcoming create/replace/delete mutations.

## 3. Caveats
- No caveats. All files in `apps/web`, `packages/contracts`, and `apps/api` were directly inspected.

## 4. Conclusion
- The frontend codebase has a clean, robust foundation (Align UI primitives, TanStack Query, React Hook Form, Zod contracts, and App Router structure).
- The payment modal (`PaymentDialog`) is already well-implemented for Phase 9 requirements.
- The primary frontend gaps are concentrated in Phase 8:
  1. Adding `createOrder`, `replaceOrder`, and `deleteOrder` to `apps/web/features/orders/api.ts` and `queries.ts` with comprehensive cache invalidation.
  2. Building the reusable `OrderForm` with dynamic line items (`useFieldArray`), real-time USD subtotal preview, and integer-cent conversion.
  3. Creating `/orders/new/page.tsx` and `/orders/[orderId]/edit/page.tsx` with unpaid guard logic.
  4. Adding the Action Bar (Edit/Delete controls), Delete Confirmation Dialog, and contextual locked status banner to `OrderDetailWorkspace`.
  5. Adding the "Create order" action button to the dashboard header and empty state in `OrdersDashboard`.

## 5. Verification Method
1. Inspect files:
   - `apps/web/features/orders/api.ts`
   - `apps/web/features/orders/queries.ts`
   - `apps/web/components/orders/order-detail-workspace.tsx`
   - `apps/web/components/orders/payment-dialog.tsx`
2. Run test suites and typechecks:
   - `pnpm --filter @crossval/web test`
   - `pnpm --filter @crossval/web typecheck`
   - `pnpm --filter @crossval/web lint`
