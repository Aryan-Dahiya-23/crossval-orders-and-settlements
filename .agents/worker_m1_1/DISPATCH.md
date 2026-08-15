## 2026-08-14T21:15:40Z

You are the Order Lifecycle Worker implementing Milestone 1 (Order Lifecycle UI/UX - Phase 8).
Your working directory is /Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1_1.

Read the following documents before starting:
1. /Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md
2. /Users/aryandahiya/Desktop/Programming/crossval/PROJECT.md
3. /Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md
4. /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_form_1/plan.md
5. /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_actions_1/plan.md
6. /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1/plan.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement all Phase 8 order lifecycle features cleanly and robustly:
1. API Client Functions (`apps/web/lib/api/orders.ts`):
   - `createOrder`: POST /orders
   - `replaceOrder`: PATCH /orders/:id (with proper payload schema)
   - `deleteOrder`: DELETE /orders/:id
2. React Query Hooks (`apps/web/lib/hooks/use-orders.ts`):
   - `useCreateOrder`: invalidates `orderKeys.lists()` and `orderKeys.summaries()`
   - `useReplaceOrder`: invalidates `orderKeys.detail(id)`, `orderKeys.lists()`, and `orderKeys.summaries()`
   - `useDeleteOrder`: invalidates `orderKeys.lists()` and `orderKeys.summaries()`, cleans detail cache
3. Order Form Component (`apps/web/components/orders/order-form.tsx`):
   - React Hook Form + Zod validation using contract schemas
   - Dynamic line items array (useFieldArray) allowing adding, removing, editing line items
   - Integer-cent money handling (decimal display formatted in USD, exact integer-cent conversions without floating-point errors)
   - Real-time line item subtotal and total calculations
   - Customer name, customer email, due date (YYYY-MM-DD)
   - Accessible error messages and clean Align UI styling
4. Create Order Page (`apps/web/app/orders/new/page.tsx`):
   - Full page layout with header and breadcrumbs
   - Integrated `OrderForm`
   - Redirects to `/orders/[orderId]` upon creation
5. Edit Order Page (`apps/web/app/orders/[orderId]/edit/page.tsx`):
   - Prefills form with current order data
   - Strictly guarded: if `paymentCount > 0` or `payments.length > 0`, renders a clear audit-trail lock banner explaining why the order cannot be edited, and disables/hides form submission
   - Redirects to `/orders/[orderId]` upon save
6. Order Detail Action Bar & Delete Dialog (`apps/web/components/orders/order-action-bar.tsx`, `apps/web/components/orders/order-delete-dialog.tsx`):
   - "Edit Order" and "Delete Order" buttons in order detail view
   - If order is locked (has payments), buttons are disabled or action bar renders an informative contextual banner explaining that recorded settlements lock the order
   - Delete confirmation dialog with clear warning, cancel and confirm actions, and loading states
   - Successful deletion redirects to `/orders`
   - Integrated into `apps/web/app/orders/[orderId]/page.tsx` / `order-detail-view.tsx`

Verification:
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` across the workspace.
- Document all modified files, test outputs, and commands in your handoff report at `/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1_1/handoff.md`.
- When finished, send a completion message to parent.
