# Handoff Report: 4-Tier Test Requirements Specification (M3)

## 1. Observation

1. **Assignment & Requirements**:
   - `ORIGINAL_REQUEST.md` (lines 12–25) specifies core requirements: R1 Order Lifecycle Workflows (`/orders/new`, `/orders/[orderId]/edit`, unpaid deletion, edit/delete locks), R2 Settlement UX Polish (payment dialog shortcuts, idempotency preservation across retries, cache reconciliation), R3 Quality Assurance & Verification Hardening ($1,000 → $400 → $600 → reject $1 overpayment flow, atomic `findOneAndUpdate` race defenses, zero-error production quality gates).
   - `PROJECT.md` (lines 9–28, lines 40–52) defines feature inventory and contracts for `POST /orders`, `PATCH /orders/:id`, `DELETE /orders/:id`, and `POST /orders/:id/payments`.
   - `TEST_INFRA.md` (lines 8–37) defines the 4-tier testing hierarchy (Tier 1: Feature Coverage >=5 per feature, Tier 2: Boundary & Corner Cases >=5 per feature, Tier 3: Cross-Feature Combinations, Tier 4: Real-World Workloads) across 7 domain features.

2. **Authoritative Domain Specifications**:
   - `docs/DOMAIN_RULES.md` (lines 19–30, lines 57–80, lines 81–95, lines 112–146, lines 164–206, lines 208–280) specifies:
     - USD integer cents, minimum 1 cent, maximum 999,999,999 cents ($9,999,999.99).
     - Status derivation decision order: `if balanceDueCents == 0 -> paid`, `else if dueDate < todayUTC -> overdue`, `else if paymentCount > 0 -> partially_paid`, `else -> pending`.
     - Invariants: `0 <= balanceDueCents <= totalAmountCents`, `sum(payments.amountCents) == amountPaidCents`.
     - Locking: Order becomes permanently immutable upon recording first payment (`paymentCount > 0`).
     - Payment atomicity: `findOneAndUpdate` matching `_id`, `userId`, `balanceDueCents >= amount`, and absence of `idempotencyKey`.
     - Idempotency: UUID required; replay returns 200 with original payment on matching fingerprint; returns 409 `IDEMPOTENCY_KEY_REUSED` on fingerprint mismatch.
     - Maximum payment limit: 1,000 embedded payments per order.
   - `docs/API.md` (lines 43–66, lines 193–376) details response envelopes, error codes (`ORDER_NOT_FOUND`, `ORDER_LOCKED_AFTER_PAYMENT`, `PAYMENT_EXCEEDS_BALANCE`, `ORDER_ALREADY_PAID`, `IDEMPOTENCY_KEY_REUSED`, `PAYMENT_LIMIT_REACHED`, `VALIDATION_FAILED`), query parameters, and HTTP statuses.
   - `docs/TESTING.md` (lines 48–175, lines 189–221) outlines test catalogues, concurrency scenarios A–D, and E2E journeys 01–05.

3. **Existing Implementation & Tests**:
   - `apps/api/src/modules/orders/domain.ts` (lines 43–215): Implements `prepareOrderDraft`, `preparePaymentDraft`, `deriveOrderStatus`, `normalizeCustomerName`, and `isCanonicalDateOnly`.
   - `apps/api/src/modules/orders/service.ts` (lines 53–398): Implements conditional writes with `paymentCount: 0` for replace/delete and atomic `$inc`/`$push` updates for payments.
   - `apps/api/tests/orders/` & `apps/web/`: Existing integration and unit tests prove database migrations, authentication, basic CRUD, concurrency race conditions, and frontend cache invalidation.

---

## 2. Logic Chain

1. **Mapping Requirements to Test Tiers**:
   - Following `TEST_INFRA.md` and `docs/TESTING.md`, the 7 foundational features (Order Creation, Dynamic Calculations, Order Edit, Order Deletion, Payment Recording, Idempotency Replay, Derived Status Progression) require systematic partitioning across 4 tiers.
2. **Tier 1 (Feature Coverage >= 5 cases/feature)**:
   - For each of the 7 features, at least 5 standard user journeys and input variations were extracted covering single/multi-item payloads, whitespace normalization, ISO date parsing, authoritative calculation, full/partial replacement, deletion verification, partial/exact settlements, payment notes, idempotency UUID processing, and status decision branches (yielding 35 Tier 1 specifications).
3. **Tier 2 (Boundary & Corner Cases >= 5 cases/feature)**:
   - BVA was applied to money bounds (1 cent minimum, $9,999,999.99 maximum, sub-cent rejection), quantity limits (1 to 1,000,000), item count limits (1 to 100), calendar rules (leap days, impossible dates, temporal payment boundaries), micro-payment locks (1 cent locking edit/delete with HTTP 409), 1-cent overpayment rejection, 0-balance settlement errors, idempotency payload tampering (1-cent drift causing 409), and due-today vs overdue boundaries at 00:00:00 UTC (yielding 35 Tier 2 specifications).
4. **Tier 3 (Cross-Feature Combinations & Pairwise)**:
   - Evaluated lifecycle state transitions and competing concurrent mutations: edit before vs after payment, payment racing edit, payment racing deletion, duplicate idempotency submissions racing across independent clients, concurrent payments exceeding balance together, and mutation-driven cache invalidation across list/summary/detail queries.
5. **Tier 4 (Real-World Workloads)**:
   - Mapped the full assignment verification flow ($1,000 order → $400 payment → $600 payment → reject $1 overpayment with ledger auditing), multi-user tenant isolation (User A vs User B cross-resource protection returning 404), 25-order portfolio rollup with multi-page pagination navigation, and the 1,000-payment ledger capacity boundary.

---

## 3. Caveats

- **No Caveats**: All domain features, interface contracts, error codes, and edge cases have been mined directly from authoritative specifications (`ORIGINAL_REQUEST.md`, `PROJECT.md`, `TEST_INFRA.md`, `docs/DOMAIN_RULES.md`, `docs/API.md`, `docs/TESTING.md`) and verified against existing codebase implementation and integration tests.
- Implementation of new test suites is assigned to subsequent phases/agents; this report provides the complete specification foundation.

---

## 4. Conclusion

A comprehensive, authoritative 4-Tier Test Requirements Specification has been successfully produced and documented in `/Users/aryandahiya/Desktop/Programming/crossval/.agents/spec_miner_m3_1/analysis.md`. It covers:
- **7 Core Features**: Order Creation, Dynamic Calculations, Order Edit, Order Deletion, Payment Recording, Idempotency Replay, Derived Status Progression.
- **Tier 1 (35 Test Cases)**: Standard feature coverage (>= 5 cases per feature).
- **Tier 2 (35 Test Cases)**: Boundary & corner cases (>= 5 cases per feature).
- **Tier 3 (8 Cross-Feature Scenarios)**: Pairwise interactions, concurrency races, and cache invalidation.
- **Tier 4 (4 Comprehensive Scenarios)**: Full real-world journeys including the assignment core settlement flow, multi-user isolation, portfolio rollups, and maximum ledger capacity.
- **Strict Invariant Checkpoints**: Integer cents precision, balance bounds, ledger equality, micro-payment locking, and multi-tenant security isolation.

---

## 5. Verification Method

To independently verify this specification against the codebase and domain documentation:

1. **Inspect Analysis Specification**:
   - View `/Users/aryandahiya/Desktop/Programming/crossval/.agents/spec_miner_m3_1/analysis.md`.
2. **Execute Unit Test Suites**:
   ```bash
   pnpm test
   ```
3. **Execute Real-MongoDB Integration Test Suites**:
   ```bash
   pnpm test:integration
   ```
4. **Invalidation Conditions**:
   - Any deviation from integer cents or floating-point exposure.
   - Any allowance of order modification after a 1-cent payment.
   - Any leakage of foreign order existence via HTTP 403 instead of HTTP 404.
