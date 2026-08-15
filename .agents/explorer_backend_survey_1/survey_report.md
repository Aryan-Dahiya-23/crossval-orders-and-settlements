# Backend & Contracts Survey Report: CrossVal Orders & Settlements

**Date**: 2026-08-14  
**Investigator**: Backend Codebase Explorer (`explorer_backend_survey_1`)  
**Scope**: `apps/api`, `packages/contracts`, database setup, schema validators, indexes, services, routes, middleware, and test suites.

---

## 1. Executive Summary

The backend architecture and shared contracts for CrossVal Orders & Settlements are in a **complete, verified, and robust state for Phases 1 through 7**. The core domain invariants, atomic financial transitions, ownership scoping, conditional unpaid order guards, idempotency mechanisms, and MongoDB Atlas schema validations are fully implemented and verified via automated unit and integration tests.

The backend is completely prepared to support Phase 8 (Order creation `/orders/new`, replacement edit `/orders/[orderId]/edit`, and unpaid order deletion) and Phase 9 (Payment & settlement UX polish) as soon as frontend work begins.

---

## 2. Shared Contracts (`packages/contracts`)

### 2.1 Domain Schemas & Constants
- **Money & Quantities**:
  - `maximumOrderAmountCents = 999_999_999` ($9,999,999.99).
  - Positive integer cents (`positiveCentsSchema`): `z.number().int().min(1).max(999_999_999)`.
  - Line item quantity: `z.number().int().min(1).max(1_000_000)`.
- **Date Handling**:
  - Date-only regex: `^\d{4}-\d{2}-\d{2}$` (`dateOnlySchema`).
- **Idempotency Key**:
  - UUID regex: `^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`, automatically trimmed and lowercased (`paymentIdempotencyKeySchema`).
- **Order Mutation Schemas**:
  - `orderLineItemInputSchema`: `{ description: string (1-500 chars), quantity: number (1-1,000,000), unitPriceCents: number (1-999,999,999) }`.
  - `createOrderRequestSchema`: `{ customerName: string (1-200 chars), dueDate: string (YYYY-MM-DD), items: array of 1-100 line items }`. Rejects client-supplied totals, balances, payment counts, or statuses.
  - `replaceOrderRequestSchema`: Aliased to `createOrderRequestSchema` (complete replacement of editable fields).
  - `recordPaymentRequestSchema`: `{ amountCents: number, paymentDate: string (YYYY-MM-DD), note?: string (max 500 chars) }`.
- **Query & Error Contracts**:
  - `orderListQuerySchema`: Supports status filter (`all`, `pending`, `partially_paid`, `paid`, `overdue`), customer search string (max 200), sort (`createdAt`, `dueDate`, `totalAmount`), direction (`asc`, `desc`), page (positive int), pageSize (`10`, `25`, `50`).
  - `ApiErrorResponse` / `ApiErrorCode`: Typed error codes including `ORDER_LOCKED_AFTER_PAYMENT`, `ORDER_NOT_FOUND`, `ORDER_ALREADY_PAID`, `PAYMENT_EXCEEDS_BALANCE`, `IDEMPOTENCY_KEY_REUSED`, `PAYMENT_LIMIT_REACHED`, `PAYMENT_TEMPORARILY_UNAVAILABLE`, `VALIDATION_FAILED`, `INVALID_RESOURCE_ID`, `AUTHENTICATION_REQUIRED`.
  - Error `details` envelope supports `remainingAmountCents` for actionable payment errors.

---

## 3. Order Lifecycle API & Domain Logic (`apps/api`)

### 3.1 Order Creation (`POST /v1/orders`)
- **Route**: Mounted in `apps/api/src/modules/orders/routes.ts` (lines 58-65). Requires authentication.
- **Validation & Calculation**:
  - `parseOrderInput(createOrderRequestSchema, request.body)` parses request and returns 422 `VALIDATION_FAILED` on bad input.
  - `prepareOrderDraft(input)` in `domain.ts`:
    - Normalizes customer name whitespace (`normalizeCustomerName`).
    - Validates canonical calendar date (`isCanonicalDateOnly`, checking leap years and real month lengths).
    - Calculates `lineTotalCents = quantity * unitPriceCents` for each item.
    - Sums line totals into authoritative `totalAmountCents`.
    - Enforces safety limits: prevents integer overflow against `maximumOrderAmountCents` (999,999,999 cents).
    - Sets initial `balanceDueCents = totalAmountCents`, `paymentCount = 0`, `payments = []`.
- **Persistence & Response**:
  - Inserts new `OrderDocument` into MongoDB `orders` collection.
  - Returns `201 Created` with `DataResponse<OrderDetail>` containing server-generated line item IDs, 0-indexed positions, derived `displayId` (`ORD-` + last 8 hex chars of ObjectId), `status: "pending"`, `isEditable: true`, `isDeletable: true`.

### 3.2 Replacement Edit (`PATCH /v1/orders/:orderId`)
- **Route**: Mounted in `apps/api/src/modules/orders/routes.ts` (lines 96-107) as `PATCH /:orderId`.
  > *Note on Method*: The API and `docs/API.md` Section 10 define `PATCH /api/v1/orders/:orderId` for the complete replacement of editable fields. The security middleware also accepts `PUT` in `requireJsonContentType`. If frontend or API routes need `PUT` alias in Phase 8, it can be mounted alongside `PATCH`.
- **Atomic Conditional Guard**:
  - Uses `findOneAndUpdate` with match filter `{ _id: orderId, userId, paymentCount: 0 }`.
  - Sets recalculated line items (new line item ObjectIds and positions), new `totalAmountCents`, `balanceDueCents = totalAmountCents`, `updatedAt = now()`.
- **Conflict Handling (409)**:
  - If `findOneAndUpdate` returns `null`, `throwConditionalMiss` checks if the order exists.
  - If order does not exist or belongs to another user: throws 404 `ORDER_NOT_FOUND`.
  - If order exists but `paymentCount > 0`: throws 409 `ORDER_LOCKED_AFTER_PAYMENT` with message `"Orders cannot be changed after the first payment."`.
  - If order state changed concurrently during write: throws 409 `ORDER_LOCKED_AFTER_PAYMENT`.

### 3.3 Order Deletion (`DELETE /v1/orders/:orderId`)
- **Route**: Mounted in `apps/api/src/modules/orders/routes.ts` (lines 109-116).
- **Atomic Conditional Guard**:
  - Uses `deleteOne` with match filter `{ _id: orderId, userId, paymentCount: 0 }`.
  - If `deletedCount === 0`, invokes `throwConditionalMiss`:
    - If unowned/nonexistent: throws 404 `ORDER_NOT_FOUND`.
    - If owned but `paymentCount > 0`: throws 409 `ORDER_LOCKED_AFTER_PAYMENT`.
  - On success: returns `204 No Content`.

---

## 4. Payment Recording & Financial Invariants

### 4.1 Payment Endpoint (`POST /v1/orders/:orderId/payments`)
- **Route**: `apps/api/src/modules/orders/routes.ts` (lines 67-83). Protected by `paymentRateLimit` middleware.
- **Idempotency Key & Validation**:
  - Inbound `Idempotency-Key` header required; validated as UUID format and lowercased.
  - Input parsed via `recordPaymentRequestSchema`: `amountCents` (> 0 int), `paymentDate` (valid canonical date `<= todayUtc`), optional `note` (trimmed, max 500 chars).
  - SHA-256 fingerprint generated: `sha256(JSON.stringify([amountCents, paymentDate, note]))`.

### 4.2 Idempotency Pre-Check & Conflict Detection
- Checks for existing payment on the order with the same `idempotencyKey`:
  - If existing payment found and `requestFingerprint` matches: returns cached payment and order snapshot with status `200 OK` and header `Idempotency-Replayed: true`.
  - If existing payment found but `requestFingerprint` differs: throws 409 `IDEMPOTENCY_KEY_REUSED`.

### 4.3 Atomic Single-Document Write
- Executes atomic `findOneAndUpdate`:
  ```typescript
  const updatedOrder = await orders.findOneAndUpdate(
    {
      _id: orderId,
      userId,
      balanceDueCents: { $gte: draft.amountCents },
      paymentCount: { $lt: maximumPaymentsPerOrder },
      payments: { $not: { $elemMatch: { idempotencyKey } } },
    },
    {
      $inc: {
        balanceDueCents: -draft.amountCents,
        paymentCount: 1,
      },
      $push: { payments: payment },
      $set: { updatedAt: timestamp },
    },
    { returnDocument: "after" }
  );
  ```
- Decrements `balanceDueCents`, increments `paymentCount`, and appends to `payments` array in a single atomic database operation without external transaction overhead.

### 4.4 Granular Failure Classification
- If atomic write predicate does not match, inspects current document state:
  1. If order missing / foreign: 404 `ORDER_NOT_FOUND`.
  2. If idempotency key was committed by a racing request: replays (200) or conflicts (409).
  3. If `paymentCount >= 1000`: 422 `PAYMENT_LIMIT_REACHED`.
  4. If `balanceDueCents === 0`: 422 `ORDER_ALREADY_PAID` with `details.remainingAmountCents = 0`.
  5. If `balanceDueCents < draft.amountCents`: 422 `PAYMENT_EXCEEDS_BALANCE` with `details.remainingAmountCents = currentOrder.balanceDueCents`.
  6. Retryable MongoDB driver errors mapped to 503 `PAYMENT_TEMPORARILY_UNAVAILABLE`.

---

## 5. Database Schema Validators & Indexes

### 5.1 MongoDB JSON Schema Validation (`apps/api/src/db/validators/collection-validators.ts`)
Strict validation level with `"error"` action enforced on `orders`:
- Required fields: `_id`, `userId`, `customerName`, `customerNameNormalized`, `dueDate`, `lineItems`, `totalAmountCents`, `balanceDueCents`, `paymentCount`, `payments`, `createdAt`, `updatedAt`.
- BSON type checking on all fields (e.g. `int` for cents/quantities, `objectId`, `string` with regex constraints).
- Compound `$expr` financial constraints:
  - `$lte: ["$balanceDueCents", "$totalAmountCents"]`
  - `$eq: ["$paymentCount", { $size: "$payments" }]`
  - `$eq: [{ $subtract: ["$totalAmountCents", "$balanceDueCents"] }, { $sum: "$payments.amountCents" }]`

### 5.2 Compound Named Indexes (`apps/api/src/db/indexes/index-definitions.ts`)
- `orders_user_created_at`: `{ userId: 1, createdAt: -1, _id: -1 }`
- `orders_user_due_balance`: `{ userId: 1, dueDate: 1, balanceDueCents: 1 }`
- `orders_user_payment_count_due_balance`: `{ userId: 1, paymentCount: 1, dueDate: 1, balanceDueCents: 1 }`
- `orders_user_customer_created_at`: `{ userId: 1, customerNameNormalized: 1, createdAt: -1 }`

---

## 6. Test Suite & Verification Status

### 6.1 Automated Verification Results
All test commands were executed and verified:

| Test Target | Type | Command | Result |
|---|---|---|---|
| Workspace Typecheck | Static Analysis | `pnpm typecheck` | **PASS** (zero errors across contracts, api, web) |
| Workspace Lint | Linter | `pnpm lint` | **PASS** (zero warnings / errors) |
| Unit Test Suites | Unit | `pnpm test` | **PASS** (28 tests across 8 files) |
| API Integration Test Suites | Real MongoDB | `pnpm test:integration` | **PASS** (31 tests across 4 files) |
| Production Build | Bundler | `pnpm build` | **PASS** (Contracts, API, Next.js build clean) |

### 6.2 Key Integration Scenarios Covered
1. **Core Assignment Scenario ($1,000 → $400 → $600 → reject $1)**: Verified in `payments.integration.test.ts` (lines 190-240).
2. **Two-Client Concurrency Tests**:
   - Concurrent duplicate idempotency key: exactly one payment committed, second receives identical replayed response.
   - Concurrent competing payments exceeding balance ($400 + $400 vs $500 balance): one succeeds (201), second rejected with 422 `PAYMENT_EXCEEDS_BALANCE` and remaining balance 10,000 cents ($100).
   - Concurrent payments exactly consuming balance ($400 + $600 vs $1,000 balance): both serialize and succeed (201).
   - Race between first payment and edit/delete: locking invariants strictly maintained without partial writes.
3. **Unpaid Order Lifecycle**:
   - Create order → verify initial derived flags (`isEditable: true`, `isDeletable: true`).
   - Replacement edit → replaces line items, recalculates totals authoritatively.
   - Delete order → deletes document from database.
   - Record payment → locks order (`isEditable: false`, `isDeletable: false`), edit and delete attempts return 409 `ORDER_LOCKED_AFTER_PAYMENT`.
4. **Ownership & Auth Scoping**: Cross-user data isolation verified; accessing foreign order IDs returns 404 `ORDER_NOT_FOUND` (no resource existence leak).

---

## 7. Frontend Integration Points for Phase 8 & 9

When Phase 8 commences, the frontend team should implement the client-side API wrappers in `apps/web/features/orders/api.ts`:
1. `createOrder(input: CreateOrderRequest): Promise<OrderDetail>` calling `POST /orders` (which maps via Next.js rewrite to `/api/v1/orders`).
2. `replaceOrder(orderId: string, input: ReplaceOrderRequest): Promise<OrderDetail>` calling `PATCH /orders/${orderId}`. *(Optional: support `PUT` on backend if frontend prefers standard PUT semantics)*.
3. `deleteOrder(orderId: string): Promise<void>` calling `DELETE /orders/${orderId}`.
4. Mutation hooks with React Query cache invalidation for `queryKeys.orders.all` and `queryKeys.orders.summary()`.
