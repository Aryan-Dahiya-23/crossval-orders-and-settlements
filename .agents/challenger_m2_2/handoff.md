# Challenger 2 Review Report: Milestone 2 (Settlement UX Polish - Phase 9)

**Verdict**: **CONFIRMED**

---

## 1. Observation

1. **Idempotency Key Preservation & Lifecycle (`apps/web/components/orders/payment-dialog.tsx:50-136`)**:
   - `attempt` state stores `{ fingerprint, key }` where `fingerprint` is `JSON.stringify([submittedAmountCents, values.paymentDate, normalizedNote])` with whitespace normalization (`note.trim().replaceAll(/\s+/g, " ")`).
   - If a submission fails (e.g. 503, network drop, timeout) and the user retries without altering form inputs, `logicalAttempt` preserves the exact same UUID v4 idempotency key.
   - If the user modifies any field (even by 1 cent on the amount, date change, or note modification), `logicalAttempt` cleanly rotates to a fresh `crypto.randomUUID()`.
   - On modal dismissal (`handleClose`), `attempt` and `serverError` are set to `null`, and form inputs are reset to defaults. Subsequent dialog opens generate completely fresh UUIDs.
   - When a payment mutation is in-flight (`mutation.isPending`), modal dismissal is guarded (`if (mutation.isPending) return`), preventing corrupted state during mid-flight requests.
   - Upon successful payment mutation (`mutateAsync`), `setAttempt(null)` and `form.reset(...)` execute, ensuring clean cleanup.

2. **React Query Cache Invalidation & Multi-Surface Synchronization (`apps/web/features/orders/queries.ts:112-124`)**:
   - `useRecordPayment(orderId)` onSuccess triggers concurrent invalidations for:
     - `orderKeys.detail(orderId)` -> target order detail query.
     - `orderKeys.lists()` -> prefix key `["orders", "list"]` matching all active list queries (default, filtered, sorted, paginated).
     - `orderKeys.summaries()` -> key `["orders", "summary"]` matching portfolio totals.
   - Unrelated query keys (e.g., details for other orders `orderKeys.detail("ord_002")` or auth session `["auth", "session"]`) remain unaffected.

3. **Empirical Adversarial Test Suite (`apps/web/components/orders/challenger-m2-idempotency-cache.test.ts`)**:
   - Created and executed 18 automated unit tests covering:
     - UUID v4 structure verification and uniqueness across 100 independent payment transactions.
     - Preservation across consecutive retries (network failure, 503, timeout) with unchanged payload.
     - Preservation across non-semantic whitespace formatting in notes.
     - Key rotation on payload mutation (amount by 1 cent, date change, note content change).
     - Modal dismissal reset lifecycle (cancel, backdrop, escape).
     - In-flight mutation protection (`isPending`).
     - TanStack Query v5 cache invalidation across `orderKeys.detail`, `orderKeys.lists()`, and `orderKeys.summaries()`.
     - End-to-end data reconciliation for the full settlement journey ($1,000 order -> $400 payment -> $600 balance -> $600 final payment -> $0 balance).
     - Boundary math for full settlement, partial settlement (1 cent below), overpayment (1 cent above), and large amounts ($9,999,999.99).

4. **Automated Verification Command Execution**:
   - `pnpm typecheck`: Exit code 0, 0 errors across `@crossval/contracts`, `@crossval/api`, and `@crossval/web`.
   - `pnpm lint`: Exit code 0, 0 errors, 0 warnings across all packages.
   - `pnpm test`: Exit code 0, 11 test files, 127 web unit tests + 5 test files, 16 api unit tests passed.
   - `pnpm build`: Exit code 0, successful production build across contracts, api, and web.
   - `pnpm --filter @crossval/api test:integration`: Exit code 0, 4 test files, 31 integration tests passed including real MongoDB atomic settlement and concurrency tests.

---

## 2. Logic Chain

1. **Idempotency Invariant Verification**:
   - The backend API (`apps/api/src/modules/orders/service.ts:16-30`) requires that replayed requests with identical payload and identical `idempotencyKey` return the committed payment without double-debiting (`replayed: true`), while differing payloads with the same key produce HTTP 409 `IDEMPOTENCY_KEY_REUSED`.
   - The frontend's fingerprinting mechanism ensures that retries safely reuse the same key, while input modifications immediately generate a fresh key, preventing false 409 conflicts.
   - Empirical tests prove that retries preserve the UUID and modifications rotate the UUID.

2. **Modal Dismissal Lifecycle Verification**:
   - When a user closes a dialog after a failed attempt, that interaction session has ended.
   - If they reopen the modal later, it represents a new user intent; therefore, generating a fresh UUID avoids stale key reuse while keeping the form state clean.
   - Empirical tests verify that `handleClose` clears `attempt`, `serverError`, and resets form values, resulting in fresh UUID generation on next submission.

3. **Cache Reconciliation Verification**:
   - In TanStack React Query, query invalidation uses prefix matching. Invalidating `["orders", "list"]` marks all dashboard queries stale (regardless of search filters, status filters, sorting, or pagination).
   - Invalidation of `["orders", "detail", orderId]` and `["orders", "summary"]` ensures that the order detail workspace and portfolio summary metrics immediately refresh with latest figures.
   - Empirical tests verify that all three surfaces receive the invalidation signal concurrently without polluting unrelated cache entries.

---

## 3. Caveats

- **No Caveats**: All target invariants were directly tested through automated executable unit and integration test suites against live React Query cache instances and domain logic.

---

## 4. Conclusion

**Verdict: CONFIRMED**

Milestone 2 (Payment & Settlement UX Polish - Phase 9) satisfies all correctness, idempotency lifecycle, and cache synchronization requirements:
- Idempotency UUIDs are reliably preserved across retries and network failures.
- Idempotency keys reset cleanly upon modal dismissal and successful completion.
- React Query cache invalidation synchronizes order detail, dashboard list, and portfolio summary metrics deterministically.
- All workspace checks (`typecheck`, `lint`, `test`, `build`, `test:integration`) pass with 0 errors and 0 warnings.

---

## 5. Verification Method

To independently verify all findings and test suites:

1. **Run Unit Tests (including Challenger 2 Idempotency & Cache suite)**:
   ```bash
   pnpm test
   ```
   *Expected result: 11 web test files (127 tests) and 5 api test files (16 tests) pass.*

2. **Run Workspace Typecheck**:
   ```bash
   pnpm typecheck
   ```
   *Expected result: Exit code 0, 0 errors across contracts, api, and web.*

3. **Run Workspace Lint**:
   ```bash
   pnpm lint
   ```
   *Expected result: Exit code 0, 0 errors, 0 warnings.*

4. **Run Workspace Build**:
   ```bash
   pnpm build
   ```
   *Expected result: Production build succeeds cleanly.*

5. **Run Integration Tests (with MongoDB)**:
   ```bash
   pnpm --filter @crossval/api test:integration
   ```
   *Expected result: 4 test files, 31 integration tests pass.*
