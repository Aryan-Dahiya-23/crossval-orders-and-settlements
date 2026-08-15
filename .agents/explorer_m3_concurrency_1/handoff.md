# Handoff Report: Concurrency Defenses, Idempotency Replay & Verification Architecture

**Author:** explorer_m3_concurrency_1  
**Target:** parent (`40b96d38-5dcb-43fa-aa36-9cb80aa47038`)  
**Working Directory:** `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m3_concurrency_1`  
**Date:** 2026-08-15  

---

## 1. Observation

Direct observations from source code and database configurations:

### 1.1 Atomic Payment Write Execution
- In `apps/api/src/modules/orders/service.ts:265-282`, `recordPayment` executes:
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
    { returnDocument: "after" },
  );
  ```
- Fast-path check for existing payment exists at `service.ts:237-254` via `findOne({ _id: orderId, userId, "payments.idempotencyKey": idempotencyKey })`.
- Post-miss diagnostic read at `service.ts:291-332` queries `findOne({ _id: orderId, userId })` and categorizes the failure into `404 ORDER_NOT_FOUND`, `409 IDEMPOTENCY_KEY_REUSED`, `422 PAYMENT_LIMIT_REACHED`, `422 ORDER_ALREADY_PAID`, `422 PAYMENT_EXCEEDS_BALANCE`, or `503 PAYMENT_TEMPORARILY_UNAVAILABLE`.

### 1.2 Idempotency Fingerprint and Replay
- In `apps/api/src/modules/orders/domain.ts:100-105`:
  ```typescript
  const normalizedNote = input.note === undefined ? "" : normalizeWhitespace(input.note);
  const note = normalizedNote.length === 0 ? null : normalizedNote;
  const requestFingerprint = createHash("sha256")
    .update(JSON.stringify([input.amountCents, input.paymentDate, note]))
    .digest("hex");
  ```
- In `apps/api/src/modules/orders/service.ts:372-389`:
  - If `payment.requestFingerprint === requestFingerprint`: returns `replayed: true` and mapped payment/order data.
  - If `payment.requestFingerprint !== requestFingerprint`: throws `AppError({ status: 409, code: "IDEMPOTENCY_KEY_REUSED", ... })`.
- In `apps/api/src/modules/orders/routes.ts:78-81`:
  - When `result.replayed === true`, sets header `Idempotency-Replayed: true` and status `200 OK`. Fresh payments return status `201 Created`.

### 1.3 Order Immutability and Edit/Delete Guards
- In `apps/api/src/modules/orders/service.ts:186-206` (`replace`):
  - Match predicate is `{ _id: orderId, userId, paymentCount: 0 }`.
- In `apps/api/src/modules/orders/service.ts:216-220` (`delete`):
  - Match predicate is `{ _id: orderId, userId, paymentCount: 0 }`.
- In `apps/api/src/modules/orders/service.ts:400-424` (`throwConditionalMiss`):
  - Queries `findOne({ _id: orderId, userId })`. If `order.paymentCount > 0`, throws `409 ORDER_LOCKED_AFTER_PAYMENT`. If `order === null`, throws `404 ORDER_NOT_FOUND`.

### 1.4 Database Collection Validators
- In `apps/api/src/db/validators/collection-validators.ts:220-233`:
  - MongoDB strict collection validator includes:
    ```javascript
    $expr: {
      $and: [
        { $lte: ["$balanceDueCents", "$totalAmountCents"] },
        { $eq: ["$paymentCount", { $size: "$payments" }] },
        {
          $eq: [
            { $subtract: ["$totalAmountCents", "$balanceDueCents"] },
            { $sum: "$payments.amountCents" },
          ],
        },
      ],
    }
    ```

---

## 2. Logic Chain

1. **Atomic Concurrency Defense (Observations 1.1, 1.4)**:
   - Because MongoDB's document-level locking serializes writes to a single order document, `findOneAndUpdate` checks `balanceDueCents >= draft.amountCents` atomically at write time.
   - If two requests attempt to claim the remaining balance concurrently, the first write decrements `balanceDueCents`. When the second write evaluates, the match predicate fails, returning `null`.
   - The diagnostic read immediately identifies `balanceDueCents < draft.amountCents` and returns `422 PAYMENT_EXCEEDS_BALANCE` with the actual remaining balance.
   - The database `$expr` validator guarantees that no document state can ever violate `totalAmountCents - balanceDueCents === sum(payments.amountCents)`.

2. **Idempotency Replay and Conflict Detection (Observations 1.1, 1.2)**:
   - Because every payment is fingerprinted with a SHA-256 hash of `[amountCents, paymentDate, note]` and stores its UUID key:
   - A network retry with identical payload matches the existing key and fingerprint, returning `200 OK` + `Idempotency-Replayed: true` with zero balance deduction.
   - A malformed client attempt to reuse an existing UUID key for a different payment amount, date, or note is detected and rejected with `409 IDEMPOTENCY_KEY_REUSED`.

3. **Order Lifecycle Immutability (Observation 1.3)**:
   - Because both `replace` (`findOneAndUpdate`) and `delete` (`deleteOne`) require `paymentCount: 0` in their write filters:
   - Any order with at least 1 payment (even $0.01) is permanently locked against modifications or deletion.
   - In a concurrent race between a payment and an edit/delete, whichever write acquires the lock first serializes the state cleanly without partial updates or orphaned records.

4. **Testing Architecture (Observations 1.1–1.4)**:
   - To thoroughly verify these guarantees according to `TEST_INFRA.md`, a 4-Tier test structure is designed:
     - **Tier 3 (Cross-Feature Combinations)**: 7 tests (`T3-01` to `T3-07`) verifying pairwise interactions across payments, order lifecycle guards, idempotency replay, summary aggregations, overdue date transitions, and pagination.
     - **Tier 4 (Real-World Workloads & Stress)**: 4 tests (`T4-01` to `T4-04`) verifying the assignment verification flow ($1,000 → $400 → $600 → reject $1), multi-user isolation, 10-client high-contention balance stampede, and the full business lifecycle.

---

## 3. Caveats

1. **MongoDB Server Selection**: Concurrency tests and collection validators require a real MongoDB server (Atlas test cluster or local MongoDB instance). In-memory mock drivers cannot evaluate `$expr` schema constraints or document-level write locks.
2. **Network Mode in Agent Environment**: Integration tests running `pnpm test:integration` require access to `MONGODB_TEST_URI` or `MONGODB_URI` environment variables.
3. **Ledger Size Bound**: The backend enforces a maximum of 1,000 embedded payments per order (`maximumPaymentsPerOrder = 1_000`). This is an MVP constraint to prevent BSON document size limits (16MB).

---

## 4. Conclusion

The CrossVal backend implements robust, production-grade atomic concurrency defenses and financial invariants:
- `recordPayment` executes single-document atomic `findOneAndUpdate` with ownership, balance, ledger limit, and idempotency match predicates.
- Duplicate idempotency replay cleanly differentiates between identical retries (`200 OK` + `Idempotency-Replayed: true`) and altered payloads (`409 IDEMPOTENCY_KEY_REUSED`).
- Order edits (`PATCH`) and deletions (`DELETE`) are strictly guarded with `{ paymentCount: 0 }`.
- Complete test suites for Tier 3 (7 pairwise combination tests) and Tier 4 (4 real-world workload/stress tests) are fully designed and documented in `analysis.md`.

---

## 5. Verification Method

To verify these findings independently:

1. **Inspect Source Code**:
   - `apps/api/src/modules/orders/service.ts:227-346` (`recordPayment`)
   - `apps/api/src/modules/orders/domain.ts:77-113` (`preparePaymentDraft` & fingerprinting)
   - `apps/api/src/modules/orders/service.ts:180-225` (`replace` & `delete` guards)
   - `apps/api/src/db/validators/collection-validators.ts:220-234` (`$expr` balance validators)
2. **Review Detailed Analysis**:
   - Inspect `.agents/explorer_m3_concurrency_1/analysis.md` for complete match predicate breakdown, idempotency matrices, and Tier 3/Tier 4 test specifications.
3. **Execute Existing Test Suites**:
   - `pnpm --filter @crossval/api test` (pure domain unit tests)
   - `pnpm --filter @crossval/api test:integration` (runs real-MongoDB integration and existing concurrency tests in `payments.integration.test.ts`, `challenger-m1-immutability.integration.test.ts`, and `challenger-m2-settlement.integration.test.ts`)
