# Handoff Report: Order Actions, Delete Dialog, and Lock Banner Architecture (Milestone 1)

## 1. Observation

1. **Existing Order Detail Workspace** (`apps/web/components/orders/order-detail-workspace.tsx` lines 93-125):
   The header currently only renders a single "Record payment" button or "Paid in full" status badge:
   ```tsx
   {detail.balanceDueCents > 0 ? (
     <Button
       type="button"
       onClick={() => {
         setSuccessMessage(null);
         setPaymentOpen(true);
       }}
     >
       <RiMoneyDollarCircleLine className="size-[18px]" />
       Record payment
     </Button>
   ) : (
     <span className="inline-flex h-10 items-center gap-2 self-start rounded-[10px] bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 sm:self-auto">
       <RiCheckboxCircleLine className="size-[18px]" /> Paid in full
     </span>
   )}
   ```
   No "Edit order" or "Delete order" buttons, lock banners, or delete dialogs exist in the component.

2. **Domain Invariant Flags in Contracts & API** (`packages/contracts/src/orders.ts` lines 121-122 & `apps/api/src/modules/orders/mapper.ts` lines 45-46):
   `OrderDetail` and `OrderListItem` already expose boolean flags computed by the backend:
   ```ts
   isEditable: order.paymentCount === 0,
   isDeletable: order.paymentCount === 0,
   ```

3. **Backend Delete Route & Service Implementation** (`apps/api/src/modules/orders/routes.ts` lines 109-116 & `apps/api/src/modules/orders/service.ts` lines 215-225):
   The backend already provides `DELETE /orders/:orderId`:
   ```ts
   public async delete(userId: ObjectId, orderId: ObjectId): Promise<void> {
     const result = await getCollections(this.database).orders.deleteOne({
       _id: orderId,
       userId,
       paymentCount: 0,
     });

     if (result.deletedCount === 0) {
       await this.throwConditionalMiss(userId, orderId);
     }
   }
   ```
   If `paymentCount > 0`, `throwConditionalMiss` throws `409 ORDER_LOCKED_AFTER_PAYMENT`. If not found, it throws `404 ORDER_NOT_FOUND`.

4. **Web Query Layer** (`apps/web/features/orders/api.ts` & `apps/web/features/orders/queries.ts`):
   Currently includes `getOrders`, `getOrderSummary`, `getOrderDetail`, and `recordPayment`. `deleteOrder` and `useDeleteOrder` are not yet defined.

5. **UI Primitives** (`apps/web/components/ui/modal.tsx`, `button.tsx`, `alert.tsx`):
   `Modal` wraps `@radix-ui/react-dialog` with header, title, description, close button, body, and footer slots. `Button` supports variants `primary`, `secondary`, `ghost`, and `danger`.

6. **Current Build & Test State**:
   Running `pnpm test` produced 12 passed tests in `apps/web` and 16 passed tests in `apps/api`.
   Running `pnpm typecheck` passed with zero errors across all packages.

---

## 2. Logic Chain

1. From Observation 2 and 3, the backend already enforces `paymentCount === 0` for deletion and edit operations and transmits `isEditable` / `isDeletable` booleans in `OrderDetail`.
2. From Observation 1, the order detail view lacks UI controls for editing and deleting unpaid orders, as well as an explicit explanation when an order is locked after payments.
3. Therefore, creating a modular `OrderActionBar` component allows rendering "Edit order", "Delete", and "Record payment" (or "Paid in full") in one cohesive container, cleanly driven by `order.isEditable`, `order.isDeletable`, and `order.balanceDueCents`.
4. From Observation 5, `OrderDeleteDialog` can leverage the existing `Modal` primitive (Radix Dialog) with `variant="danger"` for the delete button, `variant="secondary"` for cancellation, an order summary card, and an alert warning of permanent removal.
5. From Observation 3 and 4, adding `deleteOrder` to `features/orders/api.ts` and `useDeleteOrder` to `features/orders/queries.ts` will call `DELETE /orders/:id` and properly remove the order detail query from the cache while invalidating `orderKeys.lists()` and `orderKeys.summaries()`.
6. For locked orders (`!detail.isEditable`), rendering `OrderLockBanner` directly under the header on the order detail page satisfies the requirement to explain that orders with settlements are locked per accounting rules to maintain an immutable audit trail.
7. If a race condition occurs (e.g. order settled in another tab right before deletion), the API's conditional write rejects the delete with `409 ORDER_LOCKED_AFTER_PAYMENT`. `OrderDeleteDialog` catches this specific `ApiError` code and provides clear feedback.

---

## 3. Caveats

- **Scope Boundary**: This investigation focuses strictly on the Order Actions, Delete Dialog, and Lock Banner components and their integration on the order detail view. The `/orders/new` page and `/orders/[orderId]/edit` page forms are covered in companion specifications.
- **Visual Design Reference**: Design aligns strictly with local Align UI primitives and the calm B2B finance aesthetic specified in `docs/UI_UX.md`. No third-party components or external dependencies are introduced.

---

## 4. Conclusion

The architecture, component blueprints, state transition matrix, error handling strategies, and integration points for Milestone 1 (Order Actions, Delete Dialog, and Lock Banner) have been fully designed and documented in:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_actions_1/plan.md`.

All blueprints are ready for immediate implementation by the developer agent.

---

## 5. Verification Method

1. **Static Typecheck**:
   ```bash
   pnpm typecheck
   ```
   Must pass across all workspace packages (`@crossval/contracts`, `@crossval/api`, `@crossval/web`).

2. **Unit & Integration Tests**:
   ```bash
   pnpm test
   ```
   Must execute without failures.

3. **Component Inspection**:
   - Verify `apps/web/components/orders/order-action-bar.tsx` implements Edit, Delete, and Record Payment with correct disabled/enabled states based on `isEditable`/`isDeletable`.
   - Verify `apps/web/components/orders/order-delete-dialog.tsx` provides confirmation, irreversible warning, loading state, error display, and redirect to `/orders`.
   - Verify `apps/web/components/orders/order-lock-banner.tsx` displays the exact financial audit explanation.
   - Verify `apps/web/features/orders/api.ts` and `apps/web/features/orders/queries.ts` contain `deleteOrder` and `useDeleteOrder` with proper cache invalidation.
