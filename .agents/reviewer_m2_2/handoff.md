# Milestone 2 Review Report: Payment & Settlement UX Polish (Phase 9)

**Reviewer**: Reviewer 2 (Reviewer & Adversarial Critic)  
**Target**: Milestone 2 (Phase 9 - Payment & Settlement UX Polish)  
**Verdict**: **APPROVE**

---

## 1. Observation

1. **Payment Dialog Settlement UX (`apps/web/components/orders/payment-dialog.tsx`)**:
   - Implements a dynamic settlement preview card:
     - Shows `Current balance` (e.g. `$1,000.00`).
     - Shows `Payment applied` in emerald text (`-$400.00`) dynamically as user inputs amount.
     - Shows `Projected balance` in real time (`$600.00` / `$0.00`), with contextual status badges:
       - `"Settled in full"` (`tone="success"`) in emerald when `amountCents === order.balanceDueCents`.
       - `"Partially paid"` (`tone="warning"`) in amber when `0 < amountCents < order.balanceDueCents`.
       - `"Exceeds balance"` (`tone="danger"`) in red when `amountCents > order.balanceDueCents`.
   - Adds `"Use remaining balance"` shortcut button in the field hint area that invokes `form.setValue("amount", centsToDecimalString(order.balanceDueCents), { shouldValidate: true, shouldDirty: true, shouldTouch: true })`, instantly updating the preview card and projected balance.
   - Preserves client-side idempotency UUID across identical payload retry attempts (`fingerprint = JSON.stringify([submittedAmountCents, values.paymentDate, normalizedNote])`), and generates a fresh UUID when form values change.
   - Cleans up state (`attempt`, `serverError`, form fields) upon modal dismissal (`handleClose`) and mutation success.
   - Correctly disables the submit button during in-flight mutations (`mutation.isPending`), overpayments (`isOverpaid`), or when balance is non-positive (`order.balanceDueCents <= 0`).

2. **Align UI Component Adherence & Accessibility**:
   - `apps/web/components/ui/status-badge.tsx` correctly defines semantic tone variants (`neutral`, `info`, `success`, `warning`, `danger`) with bullet indicator and ring borders.
   - `PaymentDialog` uses the Radix Dialog-backed `Modal` component with full keyboard navigation (escape to dismiss, focus trap, tab cycling), semantic labels (`Field`, `Input`, `Textarea`), `aria-invalid`, `aria-describedby`, and error announcement regions (`role="alert"` / `role="status"`).
   - Dialog closing is prevented while a payment write is pending (`if (mutation.isPending) return;`).

3. **React Query Cache Invalidation (`apps/web/features/orders/queries.ts`)**:
   - `useRecordPayment` mutation invalidates `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()` upon successful settlement.
   - Unit tests in `apps/web/features/orders/queries.test.ts` verify all 3 invalidation paths.

4. **Automated Verification Checks**:
   - `pnpm typecheck`: Exit code 0 (all 3 workspace packages pass with 0 errors).
   - `pnpm lint`: Exit code 0 (0 errors, 0 warnings across contracts, api, and web).
   - `pnpm test`: Exit code 0 (14 test files passed, 113 tests passed).
   - `pnpm build`: Exit code 0 (successful production build for contracts, api, and web).
   - `pnpm --filter @crossval/api test:integration`: Exit code 0 (31 integration tests passed against real MongoDB Atlas).
   - `tests/orders/challenger-m1-immutability.integration.test.ts`: Exit code 0 (3 integration tests passed).

5. **Integrity Audit**:
   - No hardcoded test results, facade mocks, or shortcut bypasses detected in source code.
   - Pure domain money calculations use strict integer cents without floating-point drift.

---

## 2. Logic Chain

1. **Financial Clarity & Pre-flight Feedback**:
   - Deriving `amountCents` via `useWatch` and computing projected balance and settlement status in real time ensures operators never execute a settlement with uncertain financial consequences.
   - Disabling the submit button on overpayment prevents invalid HTTP writes before submission, while the backend remains the authoritative gatekeeper.

2. **Network Resilience & Idempotency Lifecycle**:
   - Preserving idempotency UUID across identical retries protects operators from duplicate charges during transient network interruptions or gateway timeouts.
   - Generating a fresh UUID when form fields change ensures distinct settlement actions are not accidentally grouped under an earlier idempotency key.
   - Resetting idempotency state upon dialog dismissal ensures clean boundaries between independent payment attempts.

3. **Full System Verification**:
   - Passing typechecks, linter checks, hermetic unit tests, production builds, and real MongoDB integration tests proves the codebase is stable, type-safe, and free of regressions.

---

## 3. Caveats

- Backend integration tests require a live MongoDB Atlas connection via `MONGODB_TEST_URI` or `MONGODB_URI` (verified and passing).
- All monetary arithmetic across client previews, mutations, and database records is strictly integer-cent based in USD.

---

## 4. Conclusion

**Verdict: APPROVE**

Milestone 2 (Payment & Settlement UX Polish - Phase 9) satisfies all functional requirements, UI/UX guidelines, Align UI design patterns, accessibility standards, cache invalidation guarantees, and automated verification quality gates.

---

## 5. Verification Method

To independently verify:
```bash
# 1. Typecheck
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Unit Tests
pnpm test

# 4. Production Build
pnpm build

# 5. Integration Tests
pnpm --filter @crossval/api test:integration
```
