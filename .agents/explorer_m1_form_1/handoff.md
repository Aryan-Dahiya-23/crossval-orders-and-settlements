# Handoff Report: Order Form & Create/Edit Routes (Milestone 1 / Phase 8)

## 1. Observation

1. **Contracts & API Endpoints**:
   - `packages/contracts/src/orders.ts` (lines 49–63) exports `createOrderRequestSchema` and `replaceOrderRequestSchema`:
     ```typescript
     export const createOrderRequestSchema = z.strictObject({
       customerName: z
         .string()
         .trim()
         .min(1, "Customer name is required.")
         .max(200, "Customer name must contain at most 200 characters."),
       dueDate: dateOnlySchema,
       items: z
         .array(orderLineItemInputSchema)
         .min(1, "At least one line item is required.")
         .max(100, "An order can contain at most 100 line items."),
     });
     export const replaceOrderRequestSchema = createOrderRequestSchema;
     ```
   - `packages/contracts/src/orders.ts` (lines 35–47) defines `orderLineItemInputSchema`:
     ```typescript
     export const orderLineItemInputSchema = z.strictObject({
       description: z.string().trim().min(1, "Description is required.").max(500, "Description must contain at most 500 characters."),
       quantity: z.number().int("Quantity must be a whole number.").min(1, "Quantity must be at least 1.").max(1_000_000, "Quantity must not exceed 1,000,000."),
       unitPriceCents: positiveCentsSchema,
     });
     ```
   - `apps/api/src/modules/orders/routes.ts` (lines 58–65, 96–107) exposes:
     - `POST /orders` -> status 201 with created `OrderDetail`
     - `PATCH /orders/:orderId` -> status 200 with updated `OrderDetail` or 409 `ORDER_LOCKED_AFTER_PAYMENT`

2. **MongoDB Strict Collection Validator**:
   - `apps/api/src/db/validators/collection-validators.ts` (lines 82–237) validates `orders` with `additionalProperties: false` requiring `_id`, `userId`, `customerName`, `customerNameNormalized`, `dueDate`, `lineItems`, `totalAmountCents`, `balanceDueCents`, `paymentCount`, `payments`, `createdAt`, `updatedAt`.
   - `customerEmail` is not a persisted field in the database or schema; `customerName` and `dueDate` are the authoritative entity fields.

3. **Existing Frontend App Layout & Primitives**:
   - Next.js App Router root is at `apps/web/` without a `src/` subfolder.
   - `apps/web/components/layout/app-shell.tsx` provides `<AppShell viewer={viewer}>`.
   - `apps/web/components/auth/auth-boundary.tsx` provides `<ProtectedRoute>{(viewer) => ...}</ProtectedRoute>`.
   - `apps/web/components/ui/` contains Align UI-inspired primitives: `Button` (`button.tsx`), `Field`, `Input`, `Textarea` (`input.tsx`), `Alert` (`alert.tsx`), `Modal` (`modal.tsx`), `Skeleton` (`skeleton.tsx`).
   - `apps/web/lib/format.ts` provides `formatUsd(cents)`, `formatDateOnly(date)`, and `statusLabel(status)`.

4. **Existing Mutations & API Integration**:
   - Peer plan in `.agents/explorer_m1_hooks_1/plan.md` establishes `useCreateOrder()` and `useReplaceOrder(orderId)` in `apps/web/features/orders/queries.ts` and `createOrder` / `replaceOrder` in `apps/web/features/orders/api.ts`.
   - Dynamic error parsing in `apps/web/features/orders/errors.ts` maps 409 `ORDER_LOCKED_AFTER_PAYMENT`, 422 `VALIDATION_FAILED`, and 404 `ORDER_NOT_FOUND`.

---

## 2. Logic Chain

1. **Integer Money Representation Invariant** (from Observation 1 & 2):
   - The backend recalculates order totals authoritatively from line items (`unitPriceCents * quantity`).
   - The frontend form must capture user input as standard dollar strings (e.g. `"100.00"`, `"45.50"`), validate with regular expressions up to two decimal places, and parse into integer cents deterministically using string arithmetic (`whole * 100 + fraction`) to avoid floating-point errors before sending to the API.

2. **Real-time Subtotal & Total Preview** (from Observation 1 & 3):
   - Using `useWatch` on form line items allows instant calculation of item subtotals (`qty * unitPriceCents`) and order grand total as the user types, without causing full form re-renders.

3. **Dynamic Line Items Management** (from Observation 1 & 3):
   - `useFieldArray` provides accessible addition and removal of items, with guardrails preventing removal when only 1 item remains or addition beyond 100 items.

4. **Immutability Guard Enforcement** (from Observation 1 & 2):
   - On `/orders/[orderId]/edit`, if the order has recorded payments (`order.paymentCount > 0` or `order.payments.length > 0` or `!order.isEditable`), the form is replaced by `OrderEditGuard`, clearly explaining ledger auditability and directing the user back to the order details page.

5. **Navigation & Cache Synchronization** (from Observation 3 & 4):
   - Upon successful creation at `/orders/new`, `useCreateOrder` caches the new `OrderDetail` and invalidates list/summary queries, then `router.push('/orders/' + created.id)` transitions the user seamlessly to the newly created order.
   - Upon successful edit at `/orders/[orderId]/edit`, `useReplaceOrder` updates the cached detail, invalidates lists/summaries, and redirects back to `/orders/[orderId]`.

---

## 3. Caveats

1. **Customer Email Field**: While mentioned colloquially in user requests, the MongoDB schema validator (`collection-validators.ts`) enforces `additionalProperties: false` without a `customerEmail` property. Persisting `customerEmail` without updating the database schema validator and contracts would fail schema validation on insert. Therefore, the form strictly adheres to `@crossval/contracts` (`customerName`, `dueDate`, `items`).
2. **Next.js Route Param Resolution**: In Next.js 15/16 (React 19), page parameters are passed as `params: Promise<{ orderId: string }>`. The server page must `await params` before passing `orderId` to the client workspace.
3. **Concurrent Payment Guard**: If an order receives a payment in another browser session while an operator is on the edit page, submitting the form will return `409 ORDER_LOCKED_AFTER_PAYMENT`. The error handler intercepts this and refreshes the query to trigger the lock guard view.

---

## 4. Conclusion

The architectural design and implementation specifications for `order-form.tsx`, `/orders/new`, and `/orders/[orderId]/edit` are complete, robust, and aligned with domain invariants:
1. `apps/web/components/orders/order-form.tsx`: Reusable React Hook Form + Zod component with dynamic `useFieldArray`, live `useWatch` subtotal/total calculations, and lossless decimal-to-integer-cent conversion.
2. `apps/web/app/orders/new/page.tsx` & `apps/web/components/orders/create-order-workspace.tsx`: Create order page with header, breadcrumbs, mutation handling, and redirect to detail.
3. `apps/web/app/orders/[orderId]/edit/page.tsx` & `apps/web/components/orders/edit-order-workspace.tsx`: Edit order page with prefilled values, `useReplaceOrder` mutation, and immutability lock guard (`OrderEditGuard`).

---

## 5. Verification Method

1. **Unit Tests**:
   - Run Vitest component tests:
     ```bash
     pnpm --filter @crossval/web test
     ```
   - Verify line item addition, deletion, real-time total preview, validation errors, and integer-cent payload generation.

2. **TypeScript & Lint Verification**:
   - Run full workspace typechecking and linting:
     ```bash
     pnpm typecheck
     pnpm lint
     ```

3. **End-to-End User Journey Verification**:
   - Navigate to `/orders/new`, create a multi-item order (e.g. 2 x $250.00 + 1 x $500.00 = $1,000.00), verify redirect to `/orders/[orderId]`.
   - Navigate to `/orders/[orderId]/edit` for the unpaid order, update an item, verify total updates and saves.
   - Record a partial payment ($400.00), navigate to `/orders/[orderId]/edit`, and verify the immutability lock guard is rendered and form inputs are blocked.
