# Investigation & Analysis: Existing Test Infrastructure and 4-Tier Test Suite Blueprint

## Executive Summary

This investigation analyzed the testing infrastructure, frameworks, execution scripts, test coverage, MongoDB integration wiring, and requirements for the upcoming 4-Tier E2E / Integration test suite across `@crossval/contracts`, `@crossval/api`, and `@crossval/web`.

### Current Test Suite Health
- **Web Unit Suite (`apps/web`)**: **11 test files, 127 tests passing** (639ms execution).
- **API Unit Suite (`apps/api`)**: **5 test files, 16 tests passing** (275ms execution).
- **API Integration Suite (`apps/api`)**: **6 integration test files, 39 integration & concurrency tests passing** against a real MongoDB server.
- **Combined Test Footprint**: **22 test files, 182 passing automated tests** across the repository.

---

## 1. Test Runners, Frameworks, and Workspace Scripts

### Tooling Architecture
| Package | Test Runner / Framework | Supplementary Libraries | Environment / Target |
|---|---|---|---|
| `apps/api` | **Vitest 4.1.10** | `supertest` 7.2.2, `@types/supertest`, `argon2` 0.45.1, `mongodb` 7.5.0 | Node.js environment; real MongoDB instance for integration |
| `apps/web` | **Vitest 4.1.10** | `@tanstack/react-query` 5.101.4 (`QueryClient`), `@crossval/contracts` | Node.js environment (in-memory DOM / JS runtime for unit logic) |
| `@crossval/contracts` | Shared Zod Schemas | Built via `tsc -p tsconfig.build.json` before test execution | TypeScript compilation |

### Configured Workspace Scripts
- **Root `package.json`**:
  - `pnpm test`: `pnpm -r --if-present run test` — runs unit suites across all workspaces concurrently.
  - `pnpm test:integration`: `pnpm --filter @crossval/api test:integration` — executes all MongoDB integration and concurrency tests in serial mode.
  - `pnpm test:watch`: `pnpm -r --if-present --parallel run test:watch` — interactive test watcher.
  - `pnpm typecheck`: `pnpm -r --if-present run typecheck` — TypeScript verification across all packages.
  - `pnpm lint`: `pnpm -r --if-present run lint` — ESLint checks.

- **`apps/api/package.json`**:
  - `test`: `pnpm --filter @crossval/contracts build && vitest run --exclude 'tests/**/*.integration.test.ts'` (executes unit tests: domain, query builders, config, object-id, health).
  - `test:integration`: `pnpm --filter @crossval/contracts build && vitest run --no-file-parallelism tests/db/migrations.integration.test.ts tests/auth/auth.integration.test.ts tests/orders/orders.integration.test.ts tests/orders/payments.integration.test.ts tests/orders/challenger-m1-immutability.integration.test.ts tests/orders/challenger-m2-settlement.integration.test.ts`.
  - `test:watch`: `vitest`.

- **`apps/web/package.json`**:
  - `test`: `vitest run` (executes all 11 test suites under `components/` and `features/`).

---

## 2. Existing Test Coverage Inventory

### A. Sessions & Authentication (`apps/api/tests/auth/auth.integration.test.ts`)
- **Coverage**: 11 integration tests verifying:
  1. Signup with email normalization (`  Reviewer@Example.COM  ` -> `reviewer@example.com`) and Argon2id password hashing.
  2. Prevention of duplicate email registrations (HTTP 409 `EMAIL_ALREADY_REGISTERED`).
  3. Dynamic public registration disabling (HTTP 403 `REGISTRATION_DISABLED`).
  4. Timing-safe generic invalid credentials parity for both unknown emails and incorrect passwords (HTTP 401 `INVALID_CREDENTIALS`).
  5. Session rotation upon login (revoking old session token hash and establishing new session token).
  6. Idempotent server-side logout and cookie deletion (`Max-Age=0`).
  7. Rejection of expired sessions even prior to MongoDB TTL worker execution.
  8. Unsafe cross-origin / CORS request rejection (HTTP 403 `ORIGIN_NOT_ALLOWED`).
  9. Structured error envelopes for 422 `VALIDATION_FAILED`, 415 `UNSUPPORTED_MEDIA_TYPE`, 400 `MALFORMED_JSON`, 413 `PAYLOAD_TOO_LARGE`.
  10. Race condition defense: only 1 of 2 concurrent duplicate signups succeeds (201 vs 409).
  11. Rate limiting on repeated credential attempts (HTTP 429 `RATE_LIMITED`).

### B. Orders (Lifecycle, Calculations, Queries, and Immutability)
- **API Domain Unit Tests (`apps/api/tests/orders/domain.test.ts`, `query.test.ts`)**:
  - Exact integer-cent line totals (`quantity * unitPriceCents`) and grand total summation.
  - Rejection of invalid calendar dates (e.g. `2026-02-30`) and arithmetic overflow (> $9,999,999.99).
  - Leap year validation (`2024-02-29` valid, `2025-02-29` invalid).
  - Authoritative derived status decision matrix (`paid` precedence, due-today boundary as `pending`, overdue past due date).
  - Normalized customer search string escaping and display identifier formatting (`ORD-XXXX`).
  - Idempotency SHA-256 fingerprint generation and date normalization.
  - Prefix regex filter generation and deterministic tiebreaker sort (`_id: 1` / `_id: -1`).
- **API Order Integration Tests (`apps/api/tests/orders/orders.integration.test.ts`)**:
  - Authentication requirement across all order endpoints.
  - Authoritative server total calculation and rejection of client-provided total/balance/status fields.
  - Ownership-scoped order detail fetch (hiding foreign orders with uniform 404 `ORDER_NOT_FOUND`).
  - Filtered order listing (pending, partially_paid, paid, overdue), search prefix matching, stable pagination, and projection exclusion of arrays.
  - Summary metrics computation (`/v1/orders/summary`) scoped strictly to authenticated user.
  - Unpaid order replacement (PATCH) and deletion (DELETE).
  - Lock enforcement on orders with payments (HTTP 409 `ORDER_LOCKED_AFTER_PAYMENT`).
- **Immutability Hardening Suite (`apps/api/tests/orders/challenger-m1-immutability.integration.test.ts`)**:
  - 1-cent ($0.01) micro-payment permanently locking order against edits and deletion (HTTP 409).
  - Unpaid order full lifecycle (create -> edit -> delete -> 404 verify).
  - 100% paid full settlement immutability.
- **Frontend Form, Schema, and Cache Tests (`apps/web/`)**:
  - Bijective decimal-to-cents conversion round-trip for 50,000 values (`challenger-m1-adversarial.test.ts`).
  - React Hook Form + Zod validation rules (`order-form.test.ts`).
  - React Query cache invalidation hierarchy (`queries.test.ts`, `adversarial-milestone1.test.ts`).
  - Error mapping and recovery (`errors.test.ts`).
  - Canonical URL search params parsing and pagination state (`list-state.test.ts`).

### C. Payments, Settlement, and Concurrency
- **API Payment Integration & Concurrency (`apps/api/tests/orders/payments.integration.test.ts`)**:
  - Authentication, ownership, idempotency UUID validation.
  - Core assignment scenario ($1,000 order -> $400 partial payment -> $600 settlement -> reject $1 overpayment).
  - Overpayment rejection with unchanged balance and payment ledger.
  - Idempotent replay returning cached response with `Idempotency-Replayed: true` header.
  - Conflict (HTTP 409 `IDEMPOTENCY_KEY_REUSED`) when reusing idempotency key with modified payload.
  - **Concurrency Scenario 1**: Simultaneous submission of duplicate idempotency key across two independent clients -> exactly 1 payment record committed, both callers receive success.
  - **Concurrency Scenario 2**: Two concurrent $400 payments against $500 balance -> atomic balance check permits only 1, rejects second with 422 `PAYMENT_EXCEEDS_BALANCE`.
  - **Concurrency Scenario 3**: Two concurrent payments ($400 and $600) exactly consuming $1,000 balance -> both serialize cleanly to reach $0 balance and `paid` status.
  - **Concurrency Scenario 4**: Race between payment and PATCH/DELETE -> atomic serialization ensures order locking invariants are never violated.
- **Settlement Hardening Suite (`apps/api/tests/orders/challenger-m2-settlement.integration.test.ts`)**:
  - Step-by-step $1,000 -> $400 -> $600 -> reject $0.01 and $1.00 flow.
  - Odd-cents settlement ($19.99).
  - Micro-penny step-down ($0.05 settled across five 1-cent payments).
  - Overpayment by 1 cent on partial balance ($100 order -> $70 paid -> reject $30.01).
  - Idempotency replay of full settlement.
- **Frontend Settlement UX (`apps/web/components/orders/`)**:
  - Dynamic preview badge states (`Settled in full`, `Partially paid`, `Exceeds balance`) in `payment-dialog.test.ts` and `challenger-m2-settlement.test.ts`.
  - "Use remaining balance" shortcut calculation and instant update.
  - Client-side idempotency UUID preservation across retries in `challenger-m2-idempotency-cache.test.ts`.

### D. Database Foundation & Migrations (`apps/api/tests/db/migrations.integration.test.ts`)
- Idempotent schema migration application (`runMigrations`).
- Installation and enforcement of collection validators (code 121 validation errors on schema violations).
- Index enforcement: `users_email_unique`, `sessions_token_hash_unique`, `sessions_expires_at_ttl`, `orders_user_created_at`, `orders_user_due_balance`, `orders_user_payment_count_due_balance`, `orders_user_customer_created_at`.
- Query planner verification (`explain("executionStats")`) confirming index usage without in-memory sorting.

---

## 3. MongoDB Integration Test Wiring

### Configuration and Harness
1. **URI Resolution**:
   - Tests read `MONGODB_TEST_URI ?? process.env.MONGODB_URI` using `loadRepositoryEnvironmentFile()` from root `.env`.
   - Fails fast with a descriptive error if neither variable is present.
2. **Dynamic Database Isolation**:
   - Each integration test file generates a cryptographically unique database name:
     ```typescript
     const databaseName = `crossval_${randomUUID().replaceAll("-", "").slice(0, 12)}_test`;
     ```
   - This ensures multiple test runs or parallel executions never collide or contaminate test data.
3. **Driver Connection**:
   - Uses official MongoDB Node.js driver `MongoClient` with `serverSelectionTimeoutMS: 15_000` and dedicated test `appName`.
4. **Lifecycle Hooks**:
   - `beforeAll`: Connects `MongoClient`, runs migrations via `runMigrations(database)` to create collections, validators, and indexes, then provisions test fixture users.
   - `beforeEach`: Cleans target collections (e.g. `orders.deleteMany({})`, `sessions.deleteMany({})`) to ensure deterministic test isolation.
   - `afterAll`: Calls `await database.dropDatabase()` to tear down the ephemeral test database and `await client.close()`.
5. **Concurrency Testing Wiring**:
   - Instantiates **two distinct `MongoClient` instances** (`primaryClient` and `concurrentClient`) connecting to the same generated database name.
   - Wraps Express apps with each client handle to execute genuine concurrent HTTP/database requests.

---

## 4. Implementation Blueprint for the 4-Tier Requirement-Driven E2E Test Suite

Based on `TEST_INFRA.md` and `PROJECT.md` Feature Inventory, the upcoming Milestone 3 test suite must fulfill the following structure:

### 7 In-Scope Features
1. **Order Creation** (ORIGINAL_REQUEST §R1)
2. **Line-Item Dynamic Calculations** (ORIGINAL_REQUEST §R1)
3. **Order Replacement / Edit** (ORIGINAL_REQUEST §R1)
4. **Order Deletion & Unpaid Guard** (ORIGINAL_REQUEST §R1)
5. **Payment Recording & Settlement** (ORIGINAL_REQUEST §R2)
6. **Idempotency Replay & Safety** (ORIGINAL_REQUEST §R2)
7. **Derived Status Progression** (DOMAIN_RULES.md)

### 4-Tier Test Architecture Breakdown

```
========================================================================================
                         4-TIER TEST ARCHITECTURE SPECIFICATION
========================================================================================

[ TIER 1: FEATURE COVERAGE (>=5 tests per feature) ]
- Basic nominal operations for all 7 features
- Valid order creation with single and multiple items
- Line-item addition, removal, quantity and unit price updates
- Full replacement edit on unpaid orders
- Clean deletion of unpaid orders
- Partial and exact payment recording
- Standard idempotency replay returning existing payment
- Correct status derivation (pending, partially_paid, paid, overdue)

[ TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature) ]
- 1-cent minimum values ($0.01) and maximum values ($9,999,999.99)
- Leap day due dates (Feb 29 on leap years vs non-leap years)
- Due today vs overdue boundary conditions ("due today" is pending, not overdue)
- Status precedence ("paid" status takes precedence over overdue due dates)
- Exact remaining balance payment down to 0 cents
- Overpayment by 1 cent rejection (HTTP 422 with remaining balance in details)
- Micro-payment (1 cent) triggering permanent lock on order
- Max string lengths (200-char customer name, 500-char line item description, 100 line items)

[ TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS ]
- Create order -> Edit unpaid -> Record partial payment -> Assert edit/delete locked (409)
- Record partial payment -> Search/Filter on dashboard -> Verify list & summary synchronization
- Record full settlement -> Verify order status transition to paid -> Attempt replay -> Attempt edit (409)
- Multi-user isolation: User A operations never visible or mutable by User B (uniform 404s)
- Concurrent balance settlement: Two payments racing to consume order balance

[ TIER 4: REAL-WORLD WORKLOAD SCENARIOS ]
- Scenario A (Assignment Core Flow): $1,000 order -> $400 partial -> $600 full settlement -> reject $1 overpayment
- Scenario B (Multi-Tenant Portfolio Workflow): Multiple users creating, editing, paying, and filtering orders simultaneously
- Scenario C (Full Lifecycle Journey): Create multi-item order -> replacement update -> partial payment -> full settlement -> audit verification
- Scenario D (Idempotent Payment Network Retry): Simulate flaky network with repeated submissions of identical idempotency UUID
========================================================================================
```

### Proposed Test File Organization
To adhere to the project layout conventions (`apps/api/tests/` and `apps/web/`):
- `apps/api/tests/e2e/tier1-feature-coverage.integration.test.ts`
- `apps/api/tests/e2e/tier2-boundary-corner-cases.integration.test.ts`
- `apps/api/tests/e2e/tier3-pairwise-combinations.integration.test.ts`
- `apps/api/tests/e2e/tier4-real-world-workloads.integration.test.ts`
- Update `apps/api/package.json` `test:integration` script to include the new E2E test files.
