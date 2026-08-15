# Milestone 2: Settlement UX Polish — Challenger Verification Report

## 1. Observation

### Implementation Inspection
1. **Payment Dialog Component (`apps/web/components/orders/payment-dialog.tsx`)**:
   - **Dynamic Settlement Card (lines 192–245)**:
     - Real-time balance calculations derived from `useWatch({ control: form.control, name: "amount" })` and `decimalToCents`.
     - Contextual status badges dynamically rendered:
       - `"Settled in full"` (`tone="success"`) when `amountCents === order.balanceDueCents`.
       - `"Partially paid"` (`tone="warning"`) when `0 < amountCents < order.balanceDueCents`.
       - `"Exceeds balance"` (`tone="danger"`) when `amountCents > order.balanceDueCents`.
     - Projected balance computation `projectedBalanceCents = Math.max(0, order.balanceDueCents - amountCents)` guarantees non-negative preview display.
     - Submit button disabled when `mutation.isPending || isOverpaid || order.balanceDueCents <= 0`.
   - **"Use Remaining Balance" Shortcut (lines 81–87, 260–269)**:
     - Renders conditional action button when `order.balanceDueCents > 0`.
     - Invokes `form.setValue("amount", centsToDecimalString(order.balanceDueCents), { shouldValidate: true, shouldDirty: true, shouldTouch: true })`, updating the input field and triggering immediate preview recalculation.
   - **Idempotency Lifecycle & Retry State (lines 50–53, 89–95, 111–135)**:
     - Request fingerprint computed via `JSON.stringify([submittedAmountCents, values.paymentDate, normalizedNote])` with whitespace normalization (`trim().replaceAll(/\s+/g, " ")`).
     - Preserves the same `idempotencyKey` on submission retries when the payload remains identical (`attempt?.fingerprint === fingerprint`).
     - Generates a fresh UUID when any input parameter changes.
     - Resets `attempt` state to `null` upon modal dismissal (`handleClose`) and successful mutation (`onSuccess`), guaranteeing fresh idempotency keys for future transactions.

2. **React Query Invalidation (`apps/web/features/orders/queries.ts:112-124`)**:
   - `useRecordPayment` mutation invalidates `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()` concurrently on success.

### Empirical Test Suite Execution
1. **Workspace Typecheck**:
   - Command: `pnpm typecheck`
   - Result: Exit code 0 across `@crossval/contracts`, `@crossval/api`, and `@crossval/web`.

2. **Workspace Linter**:
   - Command: `pnpm lint`
   - Result: Exit code 0, 0 errors, 0 warnings across all packages.

3. **Workspace Unit Tests**:
   - Command: `pnpm test`
   - Result: 11 test files passed, 127 tests passed.
   - Includes:
     - `apps/web/features/orders/challenger-m2-settlement.test.ts` (12 unit & property tests covering dynamic badge oracle, "Use remaining balance" mathematical invariants, idempotency state machine, and cache invalidation keys).
     - `apps/web/components/orders/payment-dialog.test.ts` (10 tests).
     - `apps/web/features/orders/queries.test.ts` (4 tests).

4. **Production Build**:
   - Command: `pnpm build`
   - Result: Exit code 0 across `@crossval/contracts`, `@crossval/api`, and `@crossval/web` (Turbopack static & dynamic pages generated with zero errors).

5. **MongoDB Integration Test Suite**:
   - Command: `pnpm --filter @crossval/api test:integration`
   - Result: 6 test files passed, 39 integration tests passed on real MongoDB instance.
   - Includes:
     - `apps/api/tests/orders/challenger-m2-settlement.integration.test.ts` (5 tests):
       - Core assignment flow: $1,000 order → $400 payment (status `partially_paid`, balance $600.00) → $600 payment (status `paid`, balance $0.00) → reject $0.01 overpayment with HTTP 422 `ORDER_ALREADY_PAID`.
       - Odd-cents exact settlement: $19.99 order settled in one transaction down to $0.00 balance.
       - Micro-penny step-down sequence: $0.05 order settled in five 1-cent payments, 6th penny rejected.
       - Overpayment by $0.01 on partial balance: $100.00 order with $70.00 paid → reject $30.01 with HTTP 422 `PAYMENT_EXCEEDS_BALANCE` and `remainingAmountCents: 3000`.
       - Idempotency replay: Replaying full settlement returns HTTP 200 with `idempotency-replayed: true` and order state stays unchanged at balance $0.00 without double-debiting.
     - `apps/api/tests/orders/payments.integration.test.ts` (8 tests).
     - `apps/api/tests/orders/challenger-m1-immutability.integration.test.ts` (3 tests).
     - `apps/api/tests/orders/orders.integration.test.ts` (7 tests).
     - `apps/api/tests/auth/auth.integration.test.ts` (11 tests).
     - `apps/api/tests/db/migrations.integration.test.ts` (5 tests).

---

## 2. Logic Chain

1. **Deterministic Preview & Visual Feedback**:
   - Deriving settlement calculations from `decimalToCents(watchedAmount)` guarantees accurate integer-cent projections.
   - The status badge logic covers all exhaustive states: null when empty or zero, `"Partially paid"` for $0 < amount < balance, `"Settled in full"` for $amount === balance, and `"Exceeds balance"` for $amount > balance.
   - Testing across diverse balances ($0.01, $0.05, $19.99, $400.00, $600.00, $1,000.00, $9,999,999.99) verified exact calculations with zero floating-point drift.

2. **Shortcut Robustness**:
   - Formatting `order.balanceDueCents` with `centsToDecimalString` and populating via React Hook Form ensures the input value is always an exact two-decimal representation.
   - Clicking the shortcut immediately transitions projected balance to `$0.00` and activates the `"Settled in full"` success badge.

3. **Idempotency Safety**:
   - Preserving the idempotency UUID across identical payloads ensures that network retry attempts do not generate duplicate debits.
   - Normalizing note whitespace prevents spurious UUID rotation on accidental space edits.
   - Clearing attempt state on modal close or success ensures that each subsequent payment action generates an independent, unique UUID.

4. **Backend Invariant & Race Defenses**:
   - The conditional update predicate in MongoDB (`balanceDueCents >= amountCents`, `userId`, `payments.idempotencyKey != key`) strictly rejects overpayments and duplicate keys atomically.
   - Verification confirmed that all rejected overpayments leave document balances and ledger arrays untouched.

---

## 3. Caveats

- **External MongoDB Test Server**: The backend integration tests require a running MongoDB instance (`MONGODB_TEST_URI` or `MONGODB_URI`). All unit tests run hermetically.
- **Client Date Default**: Default payment date is derived from client-side UTC `new Date().toISOString().slice(0, 10)`, and backend verifies that payment dates do not exceed today in UTC.

---

## 4. Conclusion

**Verdict: CONFIRMED**

Milestone 2 (Payment & Settlement UX Polish - Phase 9) satisfies all requirements and invariants:
- Dynamic settlement preview card and contextual badges ("Settled in full", "Partially paid", "Exceeds balance") operate deterministically.
- "Use remaining balance" shortcut functions accurately across all monetary boundaries.
- Client-side idempotency lifecycle preserves keys on retry and rotates cleanly on modification or modal close.
- React Query cache invalidation synchronizes order detail, lists, and summary metrics.
- The assignment flow ($1,000 → $400 → $600 → reject $1) and all settlement edge cases pass with zero errors across unit, lint, typecheck, build, and MongoDB integration suites.

---

## 5. Verification Method

To independently verify these results:

1. **Workspace Typecheck**:
   ```bash
   pnpm typecheck
   ```
   *Expected: Exit code 0, 0 errors across contracts, api, and web.*

2. **Workspace Lint**:
   ```bash
   pnpm lint
   ```
   *Expected: Exit code 0, 0 errors, 0 warnings.*

3. **Workspace Unit Tests**:
   ```bash
   pnpm test
   ```
   *Expected: 11 test files passed, 127 tests passed.*

4. **Workspace Build**:
   ```bash
   pnpm build
   ```
   *Expected: Exit code 0, successful production build across all packages.*

5. **MongoDB Integration Test Suite**:
   ```bash
   pnpm --filter @crossval/api test:integration
   ```
   *Expected: 6 test files passed, 39 integration tests passed on MongoDB.*
