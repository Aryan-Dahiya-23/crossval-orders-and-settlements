# 4-Tier E2E & Integration Test Requirements Specification
**Project**: CrossVal Orders & Settlements  
**Author**: Specification Miner (`spec_miner_m3_1`)  
**Scope**: Milestones M1, M2, M3 (Integration & End-to-End Test Suite Hardening)  
**Date**: 2026-08-15  

---

## 1. Executive Summary & Specification Architecture

CrossVal Orders & Settlements is a full-stack B2B finance platform engineered with Next.js (App Router, Align UI, React Hook Form, TanStack React Query), Express.js (TypeScript, Zod validation, structured errors), `@crossval/contracts` (shared schemas and domain types), and MongoDB (official Node.js driver, schema validators, compound indexes, atomic conditional writes).

This specification establishes the authoritative testing requirements and test case catalog for the **4-Tier E2E / Integration Test Suite** conforming to:
- `ORIGINAL_REQUEST.md` (R1: Order Lifecycle, R2: Settlement Polish, R3: Quality Assurance & Hardening)
- `PROJECT.md` (Milestones M1–M4, Interface Contracts, Layout)
- `TEST_INFRA.md` (Test Philosophy: Category-Partition, BVA, Pairwise Interaction, Real-World Workloads)
- `AGENTS.md` (Domain Invariants, Stack Boundaries, Reviewer Signal Priorities)
- `docs/DOMAIN_RULES.md` (Authoritative Rules for Money, Invariants, Statuses, Concurrency, Idempotency)
- `docs/API.md` (Public REST Endpoints, HTTP Statuses, Error Codes, Request/Response Envelopes)
- `docs/TESTING.md` (Test Strategy, Concurrency Scenarios A–D, E2E Journeys 01–05)

---

## 2. Authoritative Feature Inventory & Interface Contracts

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Order Lifecycle | Order Creation | Creates a new order document with embedded line items and initial balance | `CreateOrderRequest` (`customerName`, `dueDate`, `items: [{ description, quantity, unitPriceCents }]`) | `201 Created` with full `OrderDetail` envelope | `401 AUTHENTICATION_REQUIRED`, `422 VALIDATION_FAILED` | `ORIGINAL_REQUEST §R1`, `docs/API.md §8` |
| 2 | Financial Math | Dynamic Line-Item Calculations | Computes integer-cent line totals, order totals, and initial balances without float drift | Line item `quantity` (int >= 1), `unitPriceCents` (int >= 1) | `lineTotalCents`, `totalAmountCents`, `balanceDueCents` | `422 VALIDATION_FAILED` (overflow > $9,999,999.99, non-integers) | `docs/DOMAIN_RULES.md §4`, `packages/contracts` |
| 3 | Order Lifecycle | Order Replacement / Edit | Completely replaces editable order fields and line items before any payments exist | `orderId`, `ReplaceOrderRequest` (`customerName`, `dueDate`, `items`) | `200 OK` with recalculated `OrderDetail` | `401`, `404 ORDER_NOT_FOUND`, `409 ORDER_LOCKED_AFTER_PAYMENT`, `422` | `docs/DOMAIN_RULES.md §9`, `docs/API.md §10` |
| 4 | Order Lifecycle | Order Deletion & Unpaid Guard | Permanently deletes an unpaid order document conditionally | `orderId` | `204 No Content` | `401`, `404 ORDER_NOT_FOUND`, `409 ORDER_LOCKED_AFTER_PAYMENT` | `docs/DOMAIN_RULES.md §10`, `docs/API.md §11` |
| 5 | Settlement | Payment Recording | Atomically records an append-only payment, decrements balance, and updates status | `orderId`, `Idempotency-Key` header, `RecordPaymentRequest` (`amountCents`, `paymentDate`, optional `note`) | `201 Created` with `RecordPaymentResult` (`payment`, `order` snapshot) | `401`, `404 ORDER_NOT_FOUND`, `422 PAYMENT_EXCEEDS_BALANCE`, `422 ORDER_ALREADY_PAID`, `422 PAYMENT_LIMIT_REACHED`, `503` | `docs/DOMAIN_RULES.md §11`, `docs/API.md §12` |
| 6 | Settlement Safety | Idempotency Replay & Safety | Replays original payment on duplicate UUID or flags conflict if payload was modified | `orderId`, `Idempotency-Key` header, `RecordPaymentRequest` | `200 OK` with `Idempotency-Replayed: true` | `409 IDEMPOTENCY_KEY_REUSED`, `422 VALIDATION_FAILED` (malformed UUID) | `docs/DOMAIN_RULES.md §13`, `docs/API.md §12` |
| 7 | State Derivation | Derived Status Progression | Pure function evaluating `balanceDueCents`, `dueDate`, and `paymentCount` relative to UTC today | `balanceDueCents`, `dueDate`, `paymentCount`, `todayUtc` | `OrderStatus` (`pending`, `partially_paid`, `paid`, `overdue`) | N/A (Status is server-derived, never client-authored) | `docs/DOMAIN_RULES.md §7`, `docs/API.md §5` |
| 8 | Dashboard | List & Search Querying | Scoped pagination, prefix customer search, status filtering, and sorting | `status`, `search`, `sort`, `direction`, `page`, `pageSize` | `200 OK` with `OrderListResponse` + pagination metadata | `400 INVALID_RESOURCE_ID`, `401`, `422 VALIDATION_FAILED` | `docs/API.md §7`, `docs/DOMAIN_RULES.md §14` |
| 9 | Dashboard | Account Summary Aggregation | Computes portfolio totals: order count, outstanding, collected, and overdue cents | Authenticated session | `200 OK` with `OrderSummaryResponse` (`totalOrders`, `outstandingAmountCents`, `collectedAmountCents`, `overdueAmountCents`) | `401 AUTHENTICATION_REQUIRED` | `docs/API.md §6`, `docs/DOMAIN_RULES.md §14` |
| 10 | Access Control | Multi-Tenant Ownership Isolation | Guarantees all data access is strictly bounded to the authenticated user ID | Session cookie (`userId`) | Scoped documents or `404 ORDER_NOT_FOUND` | `404 ORDER_NOT_FOUND` for all foreign orders (no 403 leaks) | `docs/DOMAIN_RULES.md §15` |

---

## 3. Tier 1: Feature Coverage Specifications (>= 5 Cases per Feature)

### Feature 1: Order Creation (`POST /v1/orders`)
- **T1-ORD-01: Single Line-Item Order Creation**: Create an order with 1 line item (`quantity: 2`, `unitPriceCents: 50000`). Verify `201 Created`, `totalAmountCents: 100000`, `balanceDueCents: 100000`, `paidAmountCents: 0`, `status: "pending"`, `isEditable: true`, `isDeletable: true`, `paymentCount: 0`.
- **T1-ORD-02: Multi Line-Item Order Creation**: Create an order with 3 distinct line items ($150.00, $250.00, $600.00). Verify server calculates `totalAmountCents: 100000`, items array preserves sequential positions (0, 1, 2) and assigns valid hex ObjectIds.
- **T1-ORD-03: Customer Name & Whitespace Normalization**: Submit customer name with excessive leading/trailing/inner whitespace (`"  Acme   Corporation   LLC  "`). Verify stored and returned customer name is `"Acme Corporation LLC"` and normalized customer search index matches `"acme corporation llc"`.
- **T1-ORD-04: Date Parsing & Future Due Date**: Submit `dueDate: "2026-12-31"`. Verify canonical `YYYY-MM-DD` date preservation, status is `pending`, and timestamps (`createdAt`, `updatedAt`) are UTC ISO strings.
- **T1-ORD-05: Rejection of Client-Supplied Financial Fields**: Attempt to create an order passing client-supplied `totalAmountCents: 10`, `status: "paid"`, `balanceDueCents: 0`, or `userId`. Verify `422 VALIDATION_FAILED` (Zod `strictObject` rejection).

### Feature 2: Dynamic Line-Item Calculations
- **T1-CALC-01: Line Subtotal Multiplication**: Verify `lineTotalCents = quantity * unitPriceCents` for standard values (`quantity: 5`, `unitPriceCents: 1234` -> `6170` cents / $61.70).
- **T1-CALC-02: Grand Total Summation**: Verify `totalAmountCents = sum(lineTotalCents)` across multiple items (e.g. 3 items summing to exactly $1,452.87 / 145287 cents).
- **T1-CALC-03: Frontend Real-Time Math Synchronization**: Input decimal values (`"19.99"` unit price, `"3"` quantity) into form. Verify client-side calculation yields `$59.97` subtotal and exact integer 5997 cents in submission payload.
- **T1-CALC-04: Derived Financial Fields in Detail**: Verify order detail derivation yields `paidAmountCents = totalAmountCents - balanceDueCents` and line items contain derived `lineTotalCents` without persistent duplication.
- **T1-CALC-05: Non-Zero Order Invariant**: Verify that line items totaling $0.00 or empty items are rejected with `422 VALIDATION_FAILED` (minimum order value is 1 cent).

### Feature 3: Order Replacement / Edit (`PATCH /v1/orders/:orderId`)
- **T1-EDIT-01: Complete Order Replacement**: Update customer name, due date, and replace 2 line items with 1 new line item on an unpaid order. Verify `200 OK`, `totalAmountCents` and `balanceDueCents` updated authoritatively, `updatedAt > createdAt`.
- **T1-EDIT-02: Modify Line Item Quantities & Prices**: Change unit prices and quantities of existing items. Verify total and balance due are recalculated identically to a fresh creation.
- **T1-EDIT-03: Reorder and Add Line Items**: Add additional line items and change line item ordering. Verify items are assigned fresh subdocument ObjectIds and consecutive 0-based positions.
- **T1-EDIT-04: Customer Name Modification & Index Update**: Edit customer name from `"Beta Industries"` to `"Alpha Logistics"`. Verify search queries for `"alpha"` match and search for `"beta"` no longer match.
- **T1-EDIT-05: Rejection of Partial / Sparse Updates**: Send a partial payload (`{ customerName: "New Name" }` without `items` or `dueDate`). Verify `422 VALIDATION_FAILED` (endpoint enforces complete document replacement schema).

### Feature 4: Order Deletion & Unpaid Guard (`DELETE /v1/orders/:orderId`)
- **T1-DEL-01: Clean Deletion of Unpaid Order**: Call `DELETE /v1/orders/:id` on an unpaid order (`paymentCount === 0`). Verify `204 No Content`.
- **T1-DEL-02: Post-Deletion 404 Verification**: Request `GET /v1/orders/:id` on the deleted order ID. Verify `404 ORDER_NOT_FOUND`.
- **T1-DEL-03: Immediate Dashboard List Removal**: Query `GET /v1/orders` immediately after deletion. Verify the deleted order is absent from list and `totalItems` count is decremented by 1.
- **T1-DEL-04: Portfolio Summary Recalculation**: Query `GET /v1/orders/summary` after deleting an unpaid $500.00 order. Verify `totalOrders` decrements by 1 and `outstandingAmountCents` decrements by 50000.
- **T1-DEL-05: Embedded Cleanup Invariant**: Verify deletion drops the document and all embedded line items atomically without orphan records.

### Feature 5: Payment Recording & Settlement (`POST /v1/orders/:orderId/payments`)
- **T1-PAY-01: Valid Partial Payment**: Post $400.00 (`40000` cents) against a $1,000.00 order. Verify `201 Created`, order snapshot returns `paidAmountCents: 40000`, `balanceDueCents: 60000`, `status: "partially_paid"`, `isEditable: false`, `isDeletable: false`.
- **T1-PAY-02: Exact Final Settlement**: Post remaining $600.00 (`60000` cents) against the $600.00 balance. Verify `201 Created`, order snapshot returns `paidAmountCents: 100000`, `balanceDueCents: 0`, `status: "paid"`.
- **T1-PAY-03: Single Full Payment Settlement**: Post $1,000.00 in a single transaction against a fresh $1,000.00 order. Verify `201 Created`, immediate `paid` status, 0 balance due, and `paymentCount: 1`.
- **T1-PAY-04: Payment Note Normalization**: Submit payment with note `"  Wire transfer ref #9876  "`. Verify stored and returned note is `"Wire transfer ref #9876"`. Optional note omission stores `null`.
- **T1-PAY-05: Chronological Ledger Ordering in Detail View**: Retrieve `GET /v1/orders/:id` after 3 partial payments. Verify payments array lists entries in reverse chronological order (newest first) with unique ObjectIds and amounts.

### Feature 6: Idempotency Replay & Safety
- **T1-IDEMP-01: Initial Submission with UUID**: Send payment request with fresh UUID `Idempotency-Key` header. Verify `201 Created` with new payment subdocument.
- **T1-IDEMP-02: Identical Replay Returns 200 OK**: Resend the identical payment request (same UUID, amount, date, note). Verify `200 OK`, `Idempotency-Replayed: true` header, identical response body, and zero duplicate ledger entries.
- **T1-IDEMP-03: Case-Insensitive UUID Handling**: Submit initial payment with uppercase UUID `F47AC10B-58CC-4372-A567-0E02B2C3D479` and replay with lowercase `f47ac10b-58cc-4372-a567-0e02b2c3d479`. Verify seamless replay recognition.
- **T1-IDEMP-04: Non-Semantic Whitespace Invariance**: Submit payment with note `"Wire payment"` and replay with `"  Wire   payment  "`. Verify both produce the same SHA-256 fingerprint and trigger successful 200 replay.
- **T1-IDEMP-05: Multiple Consecutive Replays**: Replay the identical request 10 consecutive times. Verify all 10 return `200 OK` with `Idempotency-Replayed: true`, `paymentCount` remains 1, and balance remains unchanged.

### Feature 7: Derived Status Progression
- **T1-STAT-01: Fresh Unpaid Future Order -> `pending`**: Order with `balanceDueCents === totalAmountCents`, `paymentCount === 0`, `dueDate >= todayUtc`. Status is strictly `pending`.
- **T1-STAT-02: Partial Payment Future Order -> `partially_paid`**: Order with `0 < balanceDueCents < totalAmountCents`, `paymentCount > 0`, `dueDate >= todayUtc`. Status is strictly `partially_paid`.
- **T1-STAT-03: Zero Balance Order -> `paid`**: Order with `balanceDueCents === 0`. Status is strictly `paid` regardless of whether `dueDate` is in the past, today, or future.
- **T1-STAT-04: Unpaid Past Due Order -> `overdue`**: Order with `balanceDueCents === totalAmountCents`, `paymentCount === 0`, `dueDate < todayUtc`. Status is strictly `overdue`.
- **T1-STAT-05: Partially Paid Past Due Order -> `overdue`**: Order with `0 < balanceDueCents < totalAmountCents`, `paymentCount > 0`, `dueDate < todayUtc`. Status is strictly `overdue` (`overdue` overrides `partially_paid` when positive balance is past due).

---

## 4. Tier 2: Boundary & Corner Cases (>= 5 Cases per Feature)

### Feature 1: Order Creation Boundaries
- **T2-ORD-01: Minimum Permitted Value ($0.01 / 1 Cent)**: Create an order with `quantity: 1`, `unitPriceCents: 1`. Verify `201 Created`, `totalAmountCents: 1`, `balanceDueCents: 1`.
- **T2-ORD-02: Maximum Permitted Value ($9,999,999.99 / 999,999,999 Cents)**: Create an order with `quantity: 1`, `unitPriceCents: 999999999`. Verify `201 Created`. Attempting $10,000,000.00 (`1000000000` cents) returns `422 VALIDATION_FAILED`.
- **T2-ORD-03: Line Items Array Upper Bound (100 Items)**: Create an order with exactly 100 line items. Verify `201 Created`. Submitting 101 line items returns `422 VALIDATION_FAILED`.
- **T2-ORD-04: Quantity Upper Bound (1,000,000 Units)**: Create an order with `quantity: 1000000`, `unitPriceCents: 1`. Verify `201 Created`. Submitting `quantity: 1000001` or `quantity: 0` returns `422 VALIDATION_FAILED`.
- **T2-ORD-05: Calendar Leap Day Boundary (`2024-02-29` vs `2025-02-29`)**: Submit `dueDate: "2024-02-29"` (valid leap year) -> `201 Created`. Submit `dueDate: "2025-02-29"` (non-leap year) or `"2026-02-30"` (impossible date) -> `422 VALIDATION_FAILED`.

### Feature 2: Dynamic Calculations Boundaries
- **T2-CALC-01: Sub-Cent Precision Rejection**: Submit decimal inputs with 3+ decimal digits (`"10.001"`, `"0.009"`, `"1.2345"`). Verify conversion helper returns `null` and validation rejects the input.
- **T2-CALC-02: Arithmetic Overflow Hazard Detection**: Submit `quantity: 2`, `unitPriceCents: 500000000` ($5,000,000.00 * 2 = $10,000,000.00 > $9,999,999.99). Verify domain layer catches multiplication overflow before database write and throws structured error.
- **T2-CALC-03: Multi-Line Summation Overflow**: Submit two items each costing $5,000,000.00 ($10,000,000.00 total). Verify rejection of grand total exceeding safe integer cents bound.
- **T2-CALC-04: Zero Cents Unit Price Rejection ($0.00)**: Attempt to pass `unitPriceCents: 0` or decimal `"0.00"`. Verify rejection with `"Amount must be at least 1 cent"`.
- **T2-CALC-05: Floating Point Hazard Oracle (IEEE-754 Invariance)**: Verify exact conversion for notorious floating point edge cases without decimal drift: `$0.07` -> 7, `$0.14` -> 14, `$0.28` -> 28, `$0.29` -> 29, `$0.57` -> 57, `$1.14` -> 114, `$19.99` -> 1999, `$29.99` -> 2999, `$89.99` -> 8999.

### Feature 3: Order Replacement / Edit Boundaries
- **T3-EDIT-01: Micro-Payment Edit Lock (1 Cent Paid)**: Record a 1-cent payment ($0.01) against a $1,000.00 order. Attempt `PATCH /v1/orders/:id`. Verify immediate `409 ORDER_LOCKED_AFTER_PAYMENT` with message `"Orders cannot be changed after the first payment."`.
- **T3-EDIT-02: 100% Paid Settlement Edit Lock**: Fully pay an order ($100.00 balance -> $100.00 payment). Attempt `PATCH /v1/orders/:id`. Verify `409 ORDER_LOCKED_AFTER_PAYMENT`.
- **T3-EDIT-03: Edit with 0 Line Items**: Attempt to replace order with `items: []`. Verify `422 VALIDATION_FAILED` (`"At least one line item is required."`).
- **T3-EDIT-04: Edit Exceeding Maximum Order Value**: Attempt to replace order items such that recalculated total is $10,000,000.00. Verify `422 VALIDATION_FAILED`.
- **T3-EDIT-05: Edit Missing / Unowned Order**: Call `PATCH` with non-existent ObjectId or another user's order ID. Verify `404 ORDER_NOT_FOUND` (never 409 or 403).

### Feature 4: Order Deletion Boundaries
- **T4-DEL-01: Micro-Payment Deletion Lock (1 Cent Paid)**: Record a 1-cent payment ($0.01) against a $500.00 order. Attempt `DELETE /v1/orders/:id`. Verify `409 ORDER_LOCKED_AFTER_PAYMENT` and document remains intact in MongoDB.
- **T4-DEL-02: 100% Paid Deletion Lock**: Fully settle an order. Attempt `DELETE /v1/orders/:id`. Verify `409 ORDER_LOCKED_AFTER_PAYMENT`.
- **T4-DEL-03: Deletion of Non-Existent Order**: Call `DELETE /v1/orders/66bd00000000000000009999`. Verify `404 ORDER_NOT_FOUND`.
- **T4-DEL-04: Deletion of Foreign User's Order**: Authenticate as User A and attempt `DELETE` on User B's unpaid order. Verify `404 ORDER_NOT_FOUND` and User B's order is NOT deleted.
- **T4-DEL-05: Malformed ObjectId Deletion**: Call `DELETE /v1/orders/invalid-hex-id`. Verify `400 INVALID_RESOURCE_ID` before any database query is executed.

### Feature 5: Payment Recording Boundaries
- **T5-PAY-01: 0 Cents Payment Rejection ($0.00)**: Submit payment with `amountCents: 0`. Verify `422 VALIDATION_FAILED` (`"Amount must be at least 1 cent."`).
- **T5-PAY-02: Negative Payment Rejection**: Submit payment with `amountCents: -500`. Verify `422 VALIDATION_FAILED`.
- **T5-PAY-03: 1 Cent Overpayment Rejection**: On an order with $500.00 (`50000` cents) balance, submit $500.01 (`50001` cents). Verify `422 PAYMENT_EXCEEDS_BALANCE` with `details.remainingAmountCents: 50000` and balance unchanged.
- **T5-PAY-04: Payment Against Fully Settled Order (0 Balance)**: On an order with $0.00 balance, submit a 1-cent ($0.01) payment. Verify `422 ORDER_ALREADY_PAID` with `details.remainingAmountCents: 0`.
- **T5-PAY-05: Payment Date Temporal Boundaries**:
  - Payment date = UTC Today -> `201 Created` (Accepted).
  - Payment date = Past Date (e.g. 5 days ago) -> `201 Created` (Accepted for historical settlements).
  - Payment date = Tomorrow (Future Date) -> `422 VALIDATION_FAILED` (`"Payment date cannot be in the future."`).
  - Payment date = Impossible Calendar Date (`"2026-02-30"`) -> `422 VALIDATION_FAILED`.

### Feature 6: Idempotency Replay Boundaries
- **T6-IDEMP-01: Payload Conflict: Amount Mismatch (1 Cent Difference)**: Use key `UUID-1` for $400.00 payment (succeeds 201). Reuse `UUID-1` for $400.01 payment. Verify `409 IDEMPOTENCY_KEY_REUSED`.
- **T6-IDEMP-02: Payload Conflict: Payment Date Mismatch**: Use key `UUID-2` for payment on `"2026-08-14"`. Reuse `UUID-2` with date `"2026-08-13"`. Verify `409 IDEMPOTENCY_KEY_REUSED`.
- **T6-IDEMP-03: Payload Conflict: Semantic Note Mismatch**: Use key `UUID-3` with note `"Wire #1"`. Reuse `UUID-3` with note `"Wire #2"` or omitted note. Verify `409 IDEMPOTENCY_KEY_REUSED`.
- **T6-IDEMP-04: Missing `Idempotency-Key` Header**: Submit payment omitting `Idempotency-Key` header entirely. Verify `422 VALIDATION_FAILED`.
- **T6-IDEMP-05: Malformed UUID Key**: Submit `Idempotency-Key: "not-a-uuid"` or `Idempotency-Key: "12345"`. Verify `422 VALIDATION_FAILED` (`"Idempotency-Key must be a valid UUID."`).

### Feature 7: Derived Status Progression Boundaries
- **T7-STAT-01: Due Today Boundary (0 Payments)**: Order with `dueDate === todayUtc` and `balanceDueCents === totalAmountCents`. Status is `pending` (Due today is NOT overdue).
- **T7-STAT-02: Due Today Boundary (Partial Payment)**: Order with `dueDate === todayUtc` and `0 < balanceDueCents < totalAmountCents`. Status is `partially_paid` (Due today is NOT overdue).
- **T7-STAT-03: Overdue Boundary at 00:00:00 UTC Next Day**: Order with `dueDate: "2026-08-14"` evaluated when `todayUtc: "2026-08-15"`. Unpaid balance transitions immediately to `overdue`.
- **T7-STAT-04: Paid Precedence Over Historic Overdue Due Date**: Order with `dueDate: "2020-01-01"` (years past due) when `balanceDueCents === 0`. Status is strictly `paid` (`paid` takes absolute precedence over `overdue`).
- **T7-STAT-05: 1 Cent Outstanding Past Due**: Order with $1,000.00 total and $999.99 paid (1 cent remaining balance) with past due date. Status is `overdue` (not `partially_paid`).

---

## 5. Tier 3: Cross-Feature Combinations & Pairwise Interactions

### Interaction Matrix

| Interaction | Primary Action | Competing / Secondary Action | Expected Resolution & System State |
|-------------|----------------|------------------------------|-----------------------------------|
| **C3-01: Edit -> Payment -> Edit Attempt** | Replace unpaid order | Record partial payment | Replace succeeds (200), payment succeeds (201), subsequent edit rejected (409 `ORDER_LOCKED_AFTER_PAYMENT`). |
| **C3-02: Concurrent Payment vs Edit Race** | Client 1: Record payment ($200) | Client 2: Replace order ($600 -> $800) | MongoDB serializes document write. If payment commits first, edit fails 409. If edit commits first, payment operates against new balance. No corrupt intermediate state. |
| **C3-03: Concurrent Payment vs Delete Race** | Client 1: Record payment ($100) | Client 2: Delete order | MongoDB serializes write. If payment commits first, delete fails 409. If delete commits first, payment returns 404. |
| **C3-04: Concurrent Duplicate Payment (Same Key)** | Client 1: Record payment ($400, Key `K1`) | Client 2: Record payment ($400, Key `K1`) | Exactly one request receives `201 Created`. Other request receives `200 OK` (Replayed). Exactly one payment added to ledger; balance decremented once. |
| **C3-05: Concurrent Overpayment Race** | Client 1: Record payment ($400) against $500 balance | Client 2: Record payment ($400) against $500 balance | Atomic match predicate `balanceDueCents >= 40000`. First client commits (201, balance becomes $100). Second client fails predicate and returns `422 PAYMENT_EXCEEDS_BALANCE` with `remainingAmountCents: 10000`. Balance never negative. |
| **C3-06: Payment Mutation & Cache Invalidation** | User records payment on Order Detail | Active Dashboard Query & Summary Queries | Mutation invalidates `orderKeys.detail(id)`, `orderKeys.lists()`, and `orderKeys.summaries()`. Dashboard list reflects updated status badge, summary metrics reflect increased collected cents. |
| **C3-07: Deletion Mutation & Pagination Refetch** | User deletes last order on Page 2 | Dashboard active query (`page=2`) | Query cache invalidates `orderKeys.lists()`. React Query / list-state automatically recovers or displays updated page count without throwing undefined errors. |
| **C3-08: Status Filter Transitions Across Payments** | Order in `pending` tab | Record payment ($400 on $1,000) | Order automatically drops from `?status=pending` filter query and appears in `?status=partially_paid` query. Settle remaining $600 -> moves to `?status=paid`. |

---

## 6. Tier 4: Real-World Workload Scenarios

### Scenario 1: Authoritative Assignment Core Flow ($1,000 -> $400 -> $600 -> Reject $1)
- **Step 1: Create Order**: Create order for $1,000.00 (`100000` cents) with 2 line items ($400.00 + $600.00). Verify `201 Created`, `status: "pending"`, `balanceDueCents: 100000`, `paidAmountCents: 0`, `isEditable: true`, `isDeletable: true`.
- **Step 2: Verify Unpaid State in Dashboard**: Check `GET /v1/orders/summary` (`outstandingAmountCents: 100000`, `collectedAmountCents: 0`).
- **Step 3: Record $400.00 Partial Settlement**: Submit payment `amountCents: 40000`, key `UUID-STEP3`. Verify `201 Created`, snapshot `paidAmountCents: 40000`, `balanceDueCents: 60000`, `status: "partially_paid"`, `isEditable: false`, `isDeletable: false`.
- **Step 4: Verify Lock Enforcements**: Attempt `PATCH /v1/orders/:id` -> `409 ORDER_LOCKED_AFTER_PAYMENT`. Attempt `DELETE /v1/orders/:id` -> `409 ORDER_LOCKED_AFTER_PAYMENT`.
- **Step 5: Record $600.00 Final Settlement**: Submit payment `amountCents: 60000`, key `UUID-STEP5`. Verify `201 Created`, snapshot `paidAmountCents: 100000`, `balanceDueCents: 0`, `status: "paid"`.
- **Step 6: Attempt 1 Cent Overpayment ($0.01)**: Submit payment `amountCents: 1`, key `UUID-STEP6`. Verify `422 ORDER_ALREADY_PAID`, `details.remainingAmountCents: 0`.
- **Step 7: Ledger Integrity Audit**: Retrieve `GET /v1/orders/:id`. Verify `payments` array has exactly 2 entries totaling 100,000 cents, `balanceDueCents === 0`, `paymentCount === 2`. Portfolio summary reflects `collectedAmountCents: 100000`, `outstandingAmountCents: 0`.

### Scenario 2: Multi-User Isolation & Security Tenant Boundaries
- **Setup**: Create User A (`user-a@example.com`) and User B (`user-b@example.com`). User A creates Order A ($500.00). User B creates Order B ($1,200.00).
- **Test 2.1: Order Detail Isolation**: User A requests `GET /v1/orders/:orderBId`. API returns `404 ORDER_NOT_FOUND` (no data leakage).
- **Test 2.2: Payment Creation Isolation**: User A attempts `POST /v1/orders/:orderBId/payments`. API returns `404 ORDER_NOT_FOUND`.
- **Test 2.3: Order Edit & Delete Isolation**: User A attempts `PATCH /v1/orders/:orderBId` and `DELETE /v1/orders/:orderBId`. Both return `404 ORDER_NOT_FOUND`.
- **Test 2.4: List & Search Isolation**: User A queries `GET /v1/orders?search=`. User A sees only Order A; Order B is completely invisible.
- **Test 2.5: Summary Metric Isolation**: User A queries `GET /v1/orders/summary`. Summary reflects only User A's $500.00; User B's $1,200.00 has zero influence.

### Scenario 3: Heavy Portfolio Rollup & Multi-Page Lifecycle
- **Setup**: Seed authenticated user with 25 orders distributed across:
  - 10 `pending` orders ($100 each = $1,000 total)
  - 5 `partially_paid` orders ($200 total each, $100 paid = $500 outstanding, $500 collected)
  - 5 `paid` orders ($300 total each, $300 paid = $1,500 collected)
  - 5 `overdue` orders ($400 total each, unpaid, past due = $2,000 overdue)
- **Verification 3.1: Dashboard Portfolio Aggregates**:
  - `totalOrders`: 25
  - `outstandingAmountCents`: $1,000 + $500 + $0 + $2,000 = $3,500.00 (`350000` cents)
  - `collectedAmountCents`: $0 + $500 + $1,500 + $0 = $2,000.00 (`200000` cents)
  - `overdueAmountCents`: $2,000.00 (`200000` cents)
- **Verification 3.2: Pagination Navigation**:
  - Page 1 (`pageSize=10`): returns 10 items, `meta.totalPages: 3`, `meta.totalItems: 25`.
  - Page 2 (`pageSize=10`): returns 10 items.
  - Page 3 (`pageSize=10`): returns 5 items.
  - Page 4 (`pageSize=10`, out-of-range): returns `data: []`, `meta.totalPages: 3`.
- **Verification 3.3: Status Filtering**:
  - `GET /v1/orders?status=overdue`: returns exactly 5 items, all displaying `overdue` status.

### Scenario 4: Maximum Ledger Capacity Boundary (1,000 Payments Limit)
- **Setup**: Create an order for $10,000.00 (`1000000` cents).
- **Execution**: Insert 1,000 micro-payments of $1.00 (`100` cents) each (`paymentCount: 1000`, `balanceDueCents: 900000`).
- **Test 4.1: 1,001st Payment Attempt**: Submit payment for $1.00 (`100` cents) with fresh UUID.
- **Verification**: API returns `422 PAYMENT_LIMIT_REACHED` with message `"This order has reached the maximum payment count."`.
- **State Guarantee**: Balance remains exactly $9,000.00 (`900000` cents), `paymentCount` remains 1,000, document is not corrupted.

---

## 7. Edge Cases Reference Table

| # | Feature | Input / Condition | Observed & Enforced Behavior | Error Code / HTTP Status |
|---|---------|-------------------|-----------------------------|--------------------------|
| 1 | Order Creation | Zero cent line item (`$0.00`) | Rejected by schema and domain rules | `422 VALIDATION_FAILED` |
| 2 | Order Creation | Order total exceeds `$9,999,999.99` | Arithmetic overflow detected and rejected | `422 VALIDATION_FAILED` |
| 3 | Order Creation | Impossible calendar date (`2026-02-30`) | Date validation fails regex & UTC parser | `422 VALIDATION_FAILED` |
| 4 | Order Creation | Non-leap year leap day (`2025-02-29`) | Leap year check fails | `422 VALIDATION_FAILED` |
| 5 | Order Creation | Client attempts to supply `status` | Zod `strictObject` rejects unpermitted keys | `422 VALIDATION_FAILED` |
| 6 | Order Edit | Edit order with 1 cent payment | Blocked by conditional write `paymentCount: 0` | `409 ORDER_LOCKED_AFTER_PAYMENT` |
| 7 | Order Edit | Edit foreign user's order | Scoped write matches 0 docs; owned read yields 404 | `404 ORDER_NOT_FOUND` |
| 8 | Order Deletion | Delete order with 1 cent payment | Blocked by conditional delete `paymentCount: 0` | `409 ORDER_LOCKED_AFTER_PAYMENT` |
| 9 | Order Deletion | Malformed hex ObjectId (`"abc"`) | Pre-DB ObjectId syntax validator fails | `400 INVALID_RESOURCE_ID` |
| 10 | Payment | 0 cents payment (`$0.00`) | Zod `min(1)` rejects input | `422 VALIDATION_FAILED` |
| 11 | Payment | Future payment date (`today + 1`) | Rejected by `preparePaymentDraft` | `422 VALIDATION_FAILED` |
| 12 | Payment | Payment exceeding balance | `findOneAndUpdate` predicate fails; diagnostic returns error | `422 PAYMENT_EXCEEDS_BALANCE` |
| 13 | Payment | Payment on fully paid order | Predicate fails; diagnostic recognizes 0 balance | `422 ORDER_ALREADY_PAID` |
| 14 | Payment | 1,001st payment on order | Predicate `paymentCount: { $lt: 1000 }` fails | `422 PAYMENT_LIMIT_REACHED` |
| 15 | Idempotency | Replay with identical payload | Recognizes key & fingerprint; returns original payment | `200 OK` (`Idempotency-Replayed`) |
| 16 | Idempotency | Replay with altered amount | Key matched but SHA-256 fingerprint differs | `409 IDEMPOTENCY_KEY_REUSED` |
| 17 | Idempotency | Missing `Idempotency-Key` header | Header requirement validation fails | `422 VALIDATION_FAILED` |
| 18 | Status | Unpaid order with `dueDate == today` | Derives `pending` (due today is NOT overdue) | 200 OK |
| 19 | Status | Partial paid order with `dueDate == today` | Derives `partially_paid` | 200 OK |
| 20 | Status | Paid order with `dueDate < today` | Derives `paid` (`paid` takes precedence) | 200 OK |

---

## 8. Invariant Verification & Assertion Checkpoints

During execution of any integration or E2E test, the test suite MUST assert these strict domain invariants:

1. **Integer Money Invariant**: All API transport and MongoDB fields for money MUST be whole integer cents. Floating-point numbers are never persisted or returned as money.
2. **Balance Bounds Invariant**: `0 <= balanceDueCents <= totalAmountCents` is invariant for all orders at all times.
3. **Ledger Equality Invariant**: `sum(payments.map(p => p.amountCents)) === totalAmountCents - balanceDueCents === paidAmountCents`.
4. **Order Immutability Invariant**: When `paymentCount > 0`, `isEditable === false`, `isDeletable === false`, and any `PATCH` or `DELETE` MUST return HTTP 409.
5. **Idempotency Safety Invariant**: Replays never create duplicate payments; altered payload replays always fail with HTTP 409.
6. **Ownership Non-Leak Invariant**: Attempting to access, modify, or pay any unowned order MUST return HTTP 404 (never revealing existence via 403 or 409).
