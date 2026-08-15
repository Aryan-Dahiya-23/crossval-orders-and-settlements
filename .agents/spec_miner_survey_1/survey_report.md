# CrossVal Orders & Settlements — Comprehensive Specification Survey Report
**Target Phases**: Phases 8 through 12  
**Date**: 2026-08-15  
**Author**: Spec Miner Subagent (`spec_miner_survey_1`)  
**Specification Sources**: `ORIGINAL_REQUEST.md`, `orders-and-settlements.pdf`, `AGENTS.md`, `ROADMAP.md`, `ARCHITECTURE.md`, `docs/*` (`DOMAIN_RULES.md`, `API.md`, `DATABASE.md`, `FRONTEND.md`, `UI_UX.md`, `TESTING.md`, `SECURITY.md`, `DECISIONS.md`, `PRODUCT_REQUIREMENTS.md`, `DEPLOYMENT.md`, `SUBMISSION_CHECKLIST.md`, `REQUIREMENTS_TRACEABILITY.md`), `packages/contracts`, `apps/api`, `apps/web`.

---

## 1. Executive Summary & Context

CrossVal Orders & Settlements is a production-grade full-stack B2B finance application built with Next.js (App Router, React 19), Express 5, TypeScript, and MongoDB Atlas (via the official MongoDB Node.js driver 7.5.0, without an ORM/ODM).

Phases 1 through 7 established:
- The pnpm workspace, TypeScript configurations, contracts, and shared tooling.
- MongoDB Atlas connection management, strict collection validators (`$jsonSchema`), named indexes, and versioned migrations.
- Argon2id password hashing, opaque database-backed sessions with SHA-256 token hashing, same-origin `/api/v1` proxy/rewrite, and viewer context.
- Authoritative order calculation, ownership-scoped CRUD, allowlisted search/sort/pagination, and derived status logic.
- Atomic single-document payment recording via conditional `findOneAndUpdate` against the Order document, idempotent request fingerprint replay, and concurrency safety.
- Align UI-style design primitives, responsive application shell, navigation drawer, and accessible components.
- Operational dashboard with server-side customer prefix search, status filtering, sorting, pagination, stable React Query keys, and previous-data transitions.

This survey mines and documents all requirements, contracts, invariants, edge cases, error codes, and verification criteria for **Phases 8 through 12**.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Order Lifecycle (Phase 8) | Create Order Page (`/orders/new`) | Dedicated full-page form to author a new customer order with dynamic line items | `customerName` (1-200 chars), `dueDate` (YYYY-MM-DD), `items` (1-100 items: `description` 1-500 chars, `quantity` 1-1,000,000, `unitPrice` decimal string USD) | Redirect to `/orders/[orderId]` on success; detail cache seeded; lists & summaries invalidated | 422 `VALIDATION_FAILED` on invalid fields or total > $9,999,999.99; field errors mapped to inputs | `ORIGINAL_REQUEST.md`, `ROADMAP.md` § Phase 8, `docs/FRONTEND.md` |
| 2 | Order Lifecycle (Phase 8) | Dynamic Line Item Management | Interactive field array supporting adding, removing, and updating order line items | User clicks "Add line item" or "Remove item", edits line inputs | Dynamic form state, recalculation of line total and order subtotal previews | Remove disabled if only 1 item left; at least 1 item enforced by schema | `ROADMAP.md` § Phase 8, `docs/UI_UX.md` |
| 3 | Order Lifecycle (Phase 8) | Real-time Subtotal & Total Preview | Client-side optimistic calculation of line totals and order total displayed during authoring | Quantity & decimal unit price strings | Formatted USD previews (`formatUsd`) labeled clearly as "Preview" | Safe integer check; invalid inputs display inline errors | `docs/DOMAIN_RULES.md`, `docs/FRONTEND.md` |
| 4 | Order Lifecycle (Phase 8) | Decimal-to-Cent Submission Conversion | Accurate conversion of decimal currency strings to integer cents before network transmission | Decimal strings (e.g. `"500.00"`, `"123.45"`) | Integer cents payload (e.g. `50000`, `12345`) matching API schema | Rejects floats, scientific notation, negative numbers, > 2 decimal places | `docs/DOMAIN_RULES.md` § 3, `packages/contracts/src/orders.ts` |
| 5 | Order Lifecycle (Phase 8) | Edit Unpaid Order Page (`/orders/[orderId]/edit`) | Replacement edit form for unpaid orders (`paymentCount === 0`) | Updated `customerName`, `dueDate`, and `items` | 200 OK with recalculated OrderDetail; detail updated; lists/summaries invalidated | 404 `ORDER_NOT_FOUND` if missing/foreign; 409 `ORDER_LOCKED_AFTER_PAYMENT` if paid | `docs/API.md` § 10, `docs/DOMAIN_RULES.md` § 9 |
| 6 | Order Lifecycle (Phase 8) | Edit/Delete Payment Guard & Explanation | Explicit contextual explanations and disabled edit/delete actions when an order has payments | Order state with `paymentCount > 0` | UI banners/tooltips explaining locked status; UI buttons disabled; direct API mutations rejected | 409 `ORDER_LOCKED_AFTER_PAYMENT` returned by API on concurrent or direct mutation | `ORIGINAL_REQUEST.md`, `docs/DOMAIN_RULES.md` § 9-10 |
| 7 | Order Lifecycle (Phase 8) | Delete Unpaid Order Flow | Modal confirmation dialog allowing permanent deletion of unpaid orders | Order ID confirmation | 204 No Content; detail cache removed; lists/summaries invalidated; redirect to `/orders` | 404 `ORDER_NOT_FOUND`; 409 `ORDER_LOCKED_AFTER_PAYMENT` if payment committed | `docs/API.md` § 11, `docs/DOMAIN_RULES.md` § 10 |
| 8 | Order Detail Actions (Phase 8) | Dashboard & Detail Action Integration | Top-level "Create order" button on dashboard header, Edit & Delete action buttons on Order Detail | Click triggers navigation / modal | Modal/page navigation | Accessible focus management; disabled states explained | `docs/UI_UX.md`, `ROADMAP.md` |
| 9 | Settlement UX (Phase 9) | "Use Remaining Balance" Shortcut | One-click button in payment modal to populate the exact remaining balance due | User click | Sets amount input to `(order.balanceDueCents / 100).toFixed(2)` | Validated against current `balanceDueCents` | `ORIGINAL_REQUEST.md` R2, `apps/web/components/orders/payment-dialog.tsx` |
| 10 | Settlement UX (Phase 9) | Dynamic Action Button Label | Payment modal submit button indicates exact formatted payment amount | Watched amount input | e.g. "Record $400.00 payment" or "Record payment" | Disabled when pending or invalid amount | `apps/web/components/orders/payment-dialog.tsx` |
| 11 | Settlement UX (Phase 9) | Idempotency Key Retention Across Retries | Maintains UUID idempotency key across retry attempts of identical logical submissions | Fingerprint of `[amountCents, paymentDate, normalizedNote]` | Retained `Idempotency-Key` header on network error / 503 retry | New key generated only when payload is materially altered | `docs/DOMAIN_RULES.md` § 13, `docs/API.md` § 12 |
| 12 | Settlement UX (Phase 9) | Stale-Balance Conflict Auto-Recovery | Handles `PAYMENT_EXCEEDS_BALANCE` error by displaying refreshed maximum balance | 422 error response with `details.remainingAmountCents` | Updates input validation error with latest remaining balance; prompts user | Prevents blind retry of invalid amount; refreshes order query cache | `docs/API.md` § 12, `docs/FRONTEND.md` |
| 13 | Settlement UX (Phase 9) | Settlement Cache Reconciliation | Comprehensive cache invalidation across all order surfaces upon payment commit | Committed payment response | Invalidates `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()` | Non-optimistic: UI reflects only server-committed truth | `docs/FRONTEND.md`, `ROADMAP.md` § Phase 9 |
| 14 | Settlement UX (Phase 9) | Instant Status Transition Feedback | Order detail view highlights instant transition to `partially_paid` or `paid` | Committed payment result | Green "Paid in full" badge or updated balance due callout with success toast | Full payment history row added immediately | `docs/UI_UX.md` |
| 15 | Quality Assurance (Phase 10) | E2E Automated Journey Suite | Playwright automated testing of all core user journeys (E2E-01 through E2E-05) | Automated browser test execution | Verified test assertions for CRUD, settlement, overpayment, lock, and filters | Fails on broken assertions, UI regressions, or network failures | `docs/TESTING.md` § End-to-end journeys |
| 16 | Quality Assurance (Phase 10) | Assignment Sample Scenario Verification | Automated test proving `$1,000 → $400 → $600 → reject $1` verification flow | Step-by-step test execution | Verified transitions: `pending` ($1,000) → `partially_paid` ($600 due) → `paid` ($0 due) → 422 rejected | Rejection advertises `remainingAmountCents: 0` | `ORIGINAL_REQUEST.md` R3, `orders-and-settlements.pdf` |
| 17 | Quality Assurance (Phase 10) | Two-Client Concurrency Test Suite | Real MongoDB Atlas integration tests exercising racing payments, edits, and deletes | Multiple independent Node.js clients | Race outcomes: Scenarios A, B, C, D pass without balance overdrafts or orphan states | Verified via real MongoDB query predicate rechecks | `docs/TESTING.md` § Concurrency tests |
| 18 | Quality Assurance (Phase 10) | Relative-Date Demo Seeding (`db:seed`) | Repeatable database seed script generating orders relative to current UTC date | `pnpm db:seed` | Populated database with Pending, Partially Paid, Paid, Overdue, and Sample orders | Bounded execution, strict validator compliance, non-stale dates | `docs/DATABASE.md` § 19, `ROADMAP.md` § Phase 10 |
| 19 | Quality Assurance (Phase 10) | Frontend Component Tests | Unit/component tests for forms, dialogs, pagination, formatters, and query keys | Vitest + Testing Library | Verified component rendering, error states, and accessibility hooks | Zero test failures | `docs/TESTING.md`, `ROADMAP.md` § Phase 10 |
| 20 | Deployment (Phase 11) | Production Monorepo Deployment | Vercel deployment with Next.js web application and Express API rewrite topology | Git push / Vercel CLI | Live HTTPS web application with same-origin `/api/v1` proxy | Build & deployment gates pass cleanly | `docs/DEPLOYMENT.md` |
| 21 | Deployment (Phase 11) | Production Atlas Database & Pooling | Production MongoDB Atlas cluster with TLS, bounded connection pool, and safe timeouts | `MONGODB_URI`, `MONGODB_MAX_POOL_SIZE` | High-availability pooled database connection per warm API process | Strict database naming safety (prevents accidental production reset) | `docs/DATABASE.md`, `docs/DEPLOYMENT.md` |
| 22 | Deployment (Phase 11) | One-Time Idempotent Production Migration | Versioned database schema setup and index creation as a controlled release action | `pnpm db:migrate` | `schema_migrations` collection tracks applied migrations | Idempotent execution; fails fast on error | `docs/DATABASE.md` § 18, `docs/DEPLOYMENT.md` |
| 23 | Deployment (Phase 11) | Production Smoke Checklist | Live verification of public URL, signup/login, order creation, settlement, and logout | Manual & automated HTTP probes | Confirmed HTTPS, HttpOnly cookies, request IDs, and error logging | Zero console errors, no leaked secrets | `docs/DEPLOYMENT.md` § 152 |
| 24 | Reviewer Audit (Phase 12) | Final Reviewer Documentation (`README.md`) | Clear, concise 2-minute overview with architecture, concurrency model, and demo walkthrough | Repository README | Comprehensive reviewer guide, live URL, test commands, tradeoffs | Free of stale claims or placeholders | `docs/SUBMISSION_CHECKLIST.md`, `ROADMAP.md` § Phase 12 |
| 25 | Reviewer Audit (Phase 12) | Requirements Traceability Audit | Verification of matrix mapping every requirement (AUTH-01 to NFR-06) to code & tests | Traceability matrix review | 100% verified status across all requirements | Zero untracked or orphaned requirements | `docs/REQUIREMENTS_TRACEABILITY.md` |
| 26 | Reviewer Audit (Phase 12) | Codebase Cleanliness Gate | Verification that all lint, typecheck, format, and build scripts pass cleanly with 0 warnings | `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` | Clean build artifacts across all workspaces | Zero errors or unhandled warnings | `ORIGINAL_REQUEST.md` AC, `docs/SUBMISSION_CHECKLIST.md` |

---

## 3. Edge Cases & Observed/Documented Behavior

| # | Feature | Input / Condition | Observed / Documented Behavior |
|---|---------|-------------------|--------------------------------|
| 1 | Order Creation | Zero or negative total amount (e.g. quantity 0 or price 0) | Server rejects with 422 `VALIDATION_FAILED` ("Order total must be at least 1 cent"); UI blocks submission. |
| 2 | Order Creation | Order total exceeds $9,999,999.99 (999,999,999 cents) | Server rejects with 422 `VALIDATION_FAILED` ("Order total exceeds the maximum allowed value"). |
| 3 | Order Creation | Past due date at order creation (e.g. 7 days ago) | Accepted by server to support backfilling historical orders and demo data; immediately derives `overdue` status upon creation. |
| 4 | Order Creation | Client attempts to author `totalAmountCents`, `status`, `balanceDueCents`, `userId`, `payments` | Server strips / rejects client-authored fields; calculates totals authoritatively from line items; assigns authenticated `userId`. |
| 5 | Order Editing | Attempt to edit an order after 1 payment is recorded | Conditional update with `paymentCount: 0` fails to match; server returns 409 `ORDER_LOCKED_AFTER_PAYMENT`; UI displays locked explanation. |
| 6 | Order Editing | Payment races with replacement edit against unpaid order | MongoDB serializes document write; if payment commits first, edit fails predicate and returns 409; if edit commits first, payment commits against new total. Invariants preserved. |
| 7 | Order Deletion | Attempt to delete an order after 1 payment is recorded | Conditional delete with `paymentCount: 0` fails to match; server returns 409 `ORDER_LOCKED_AFTER_PAYMENT`; UI disables delete button. |
| 8 | Order Deletion | Deletion races with first payment | Whichever write serializes first wins; if delete wins, payment gets 404; if payment wins, delete gets 409. Invariants preserved. |
| 9 | Status Derivation | Order has due date in the past, but `balanceDueCents === 0` | Derived status is `paid` (`paid` takes precedence over `overdue`). |
| 10 | Status Derivation | Order has `dueDate === todayUTC` and positive balance | Derived status is `pending` (if 0 payments) or `partially_paid` (if > 0 payments). Due today is NOT overdue. |
| 11 | Status Derivation | Order has `dueDate < todayUTC` and partial payments recorded | Derived status is `overdue` (positive balance and past due date). |
| 12 | Status Derivation | Overdue order receives exact remaining payment | Status immediately transitions from `overdue` to `paid`. |
| 13 | Payment Recording | Payment amount exceeds remaining balance (e.g. $1.00 when balance is $0.00, or $700.00 when balance is $600.00) | Atomic predicate `balanceDueCents >= amount` fails; diagnostic read detects insufficient balance and returns 422 `PAYMENT_EXCEEDS_BALANCE` or `ORDER_ALREADY_PAID` with `details.remainingAmountCents`. |
| 14 | Payment Recording | Concurrent payments exceed balance (e.g. two $400 payments against $500 balance) | MongoDB serializes writes; first request matches, decrements balance to $100; second request rechecks predicate `balanceDueCents >= 400` (fails) and returns 422 `PAYMENT_EXCEEDS_BALANCE` (`remainingAmountCents: 10000`). Balance never becomes negative. |
| 15 | Payment Recording | Concurrent payments exactly equal balance (e.g. $400 and $600 against $1,000 balance) | Both requests match and commit serially; final balance becomes $0.00; status transitions to `paid`; exactly 2 payment records exist. |
| 16 | Payment Idempotency | Replay request with same `Idempotency-Key` and identical payload | Server detects existing payment with matching key and SHA-256 fingerprint; returns original committed payment response with HTTP 200 and `Idempotency-Replayed: true` header. No second payment added. |
| 17 | Payment Idempotency | Reuse of same `Idempotency-Key` with different payload (e.g. different amount, date, or note) | Server detects fingerprint mismatch; returns 409 `IDEMPOTENCY_KEY_REUSED` without mutating document. |
| 18 | Payment Recording | Payment date set to tomorrow/future UTC date | Application validation rejects future date with 422 `VALIDATION_FAILED` ("Payment date cannot be in the future"); UI restricts date picker `max={todayUtc}`. |
| 19 | Payment Recording | Bounded ledger capacity reached (1,000 payments on one order) | Atomic predicate `paymentCount < 1000` fails; returns 422 `PAYMENT_LIMIT_REACHED`. Financial state unaltered. |
| 20 | Ownership & Tenant Isolation | User A attempts to view, edit, delete, or record payment on User B's order ID | Query predicate `{ _id: orderId, userId: authenticatedUserId }` fails to match; returns 404 `ORDER_NOT_FOUND`. Foreign and nonexistent orders are indistinguishable. |
| 21 | Dashboard Pagination | URL requests page number greater than `totalPages` (e.g. `?page=999`) | Dashboard detects out-of-range page from response metadata and canonically replaces URL state to `page=totalPages` without dead-end empty view. |
| 22 | Dashboard Filters | Search input contains special regex characters (e.g. `Acme [Corp] (US)*`) | Server escapes regular expression characters before anchored-prefix query, avoiding RegExp injection or query crashes. |
| 23 | Authentication | Request sent without valid session cookie to protected route | Auth middleware rejects with 401 `AUTHENTICATION_REQUIRED`; frontend auth boundary redirects to `/login` without flashing private content. |
| 24 | CSRF & Origin Safety | Unsafe HTTP method (`POST`, `PATCH`, `DELETE`) sent with mismatched or missing `Origin` | Security middleware rejects with 403 `ORIGIN_NOT_ALLOWED`. |

---

## 4. Phase-by-Phase Detailed Specifications (Phases 8–12)

### 4.1 Phase 8: Order Creation, Edit, and Detail Workflows

#### 4.1.1 Order Creation Page (`/orders/new`)
- **Route**: `apps/web/app/orders/new/page.tsx`
- **Component**: `OrderCreateWorkspace` / `OrderForm`
- **Form State Management**: React Hook Form with Zod resolver (`@hookform/resolvers/zod`).
- **Form Fields**:
  - `customerName`: Text input, required, trimmed, 1–200 characters.
  - `dueDate`: Date picker / text input, format `YYYY-MM-DD`, required.
  - `items`: Field array (`useFieldArray`):
    - `description`: Text input, required, 1–500 characters.
    - `quantity`: Number input, integer >= 1, max 1,000,000.
    - `unitPrice`: Text/decimal input with `$ ` prefix, e.g. `"500.00"`, converted to cents for submission.
    - "Add line item" button (adds blank row).
    - "Remove" line item button (disabled/hidden if only 1 row exists; max 100 rows).
- **Subtotal & Total Computation**:
  - Derived line totals: `quantity * (decimalToCents(unitPrice) ?? 0)`.
  - Derived order total: sum of derived line totals in cents.
  - Formatted live preview using `formatUsd(derivedTotalCents)`.
- **Submission Flow**:
  - Converts all unit prices to integer cents.
  - Calls `POST /api/v1/orders`.
  - Disables submit button during mutation ("Creating...").
  - On success: invalidates `orderKeys.lists()` and `orderKeys.summaries()`, seeds `orderKeys.detail(newOrderId)`, navigates to `/orders/${newOrderId}` with a success message/toast.
  - On validation error: maps server field errors (e.g. `items.0.quantity`) to the relevant form inputs and displays a form-level alert if needed.

#### 4.1.2 Order Replacement Edit Page (`/orders/[orderId]/edit`)
- **Route**: `apps/web/app/orders/[orderId]/edit/page.tsx`
- **Guard**: Only accessible when `order.isEditable === true` (`order.paymentCount === 0`). If visited for a locked order, redirect to `/orders/[orderId]` or display a locked notice.
- **Form Prepopulation**: Initializes form with existing customer name, due date, and line items (converting integer cents back to 2-decimal strings e.g. `(unitPriceCents / 100).toFixed(2)`).
- **Submission Flow**:
  - Calls `PATCH /api/v1/orders/[orderId]` with full replacement payload.
  - On success: invalidates `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()`, navigates back to `/orders/${orderId}`.
  - On 409 `ORDER_LOCKED_AFTER_PAYMENT`: displays an alert explaining that a payment was recorded while editing, preventing save.

#### 4.1.3 Delete Unpaid Order Action & Confirmation Dialog
- **Component**: Delete confirmation modal in `order-detail-workspace.tsx`.
- **Guard**: Rendered / enabled only when `order.isDeletable === true` (`order.paymentCount === 0`).
- **Dialog Contents**:
  - Prominently displays `order.displayId` and `order.customerName`.
  - Explicit warning: "This action cannot be undone. Orders can only be deleted while unpaid."
  - "Cancel" button and destructive "Delete order" button.
- **Submission Flow**:
  - Calls `DELETE /api/v1/orders/[orderId]`.
  - On 204 success: removes detail from cache, invalidates `orderKeys.lists()` and `orderKeys.summaries()`, navigates to `/orders` with toast confirmation.
  - On 409 `ORDER_LOCKED_AFTER_PAYMENT`: explains state conflict and refreshes order.

#### 4.1.4 Order Detail & Dashboard Navigation Polish
- **Dashboard Header**: Add prominent "Create order" button (`<Button asChild><Link href="/orders/new">Create order</Link></Button>`).
- **Detail Header Actions**:
  - Unpaid order: shows "Edit order" (links to `/orders/[orderId]/edit`), "Delete order" (opens modal), and "Record payment".
  - Locked order (with payments): Edit & Delete buttons are replaced by an explanatory locked badge / banner ("Orders with recorded payments are locked to preserve accounting integrity").

---

### 4.2 Phase 9: Payment & Settlement UX Polish

#### 4.2.1 Record Payment Modal Polish (`PaymentDialog`)
- **Current Foundation**: Fully functional Radix modal in `components/orders/payment-dialog.tsx`.
- **Required Polish**:
  - "Use remaining balance" button immediately populates `(order.balanceDueCents / 100).toFixed(2)`.
  - Submit button text dynamically displays the formatted amount (e.g. `Record $400.00 payment`).
  - Strict date limits: `max={todayUtc}` prevents future dates in UI.
  - Optional note textarea with 500-character limit.
  - Visual display of current balance due, amount paid, and total order value before entry.

#### 4.2.2 Idempotency Key Handling & Replay Stability
- **Attempt Fingerprint**: `JSON.stringify([amountCents, paymentDate, normalizedNote])`.
- **Key Retention**: If user retries following a network failure or 503 error, the existing UUID key is reused.
- **Key Rotation**: If the user edits amount, date, or note, a new UUID is generated.

#### 4.2.3 Dynamic Concurrency & Stale Balance Recovery
- If server returns 422 `PAYMENT_EXCEEDS_BALANCE`:
  - Extract `details.remainingAmountCents`.
  - Form sets error on amount field: `"The balance changed. The current maximum is " + formatUsd(remainingAmountCents)`.
  - Alert banner informs user that the latest balance was fetched.
- If server returns 422 `ORDER_ALREADY_PAID`:
  - Inform user that the order has already been settled in full.
  - Dialog closes and view updates to Paid state.

#### 4.2.4 Cache Synchronization & Settlement Presentation
- React Query invalidation on payment commit:
  - `orderKeys.detail(orderId)`
  - `orderKeys.lists()`
  - `orderKeys.summaries()`
- Immediate visual feedback:
  - Status badge updates instantly (`partially_paid` or `paid`).
  - Financial summary cards update (Order total, Amount paid, Balance due).
  - New payment record appears at the top of the Payment History list.
  - Success alert / toast confirms payment amount recorded.

---

### 4.3 Phase 10: Test Hardening and Reviewer Data

#### 4.3.1 Playwright End-to-End Automated Journey Tests
1. **E2E-01: Create and Search Order**
   - Sign up new test user → navigate to `/orders/new` → fill customer name, due date, 2 line items ($500 x 2 = $1,000) → submit → verify detail shows Pending, $1,000 total, $1,000 balance → return to `/orders` → verify order appears in table and matches search.
2. **E2E-02: Core Assignment Settlement Flow ($1,000 → $400 → $600 → reject $1)**
   - Open $1,000 order → click "Record payment" → enter $400.00 → submit → verify status is `Partially paid`, $400 paid, $600 due, 1 payment in history → click "Record payment" → click "Use remaining" ($600.00) → submit → verify status is `Paid`, $1,000 paid, $0 due, 2 payments in history.
3. **E2E-03: Overpayment Rejection**
   - On fully paid order ($0 balance), attempt $1.00 payment → verify rejection with `ORDER_ALREADY_PAID` / `PAYMENT_EXCEEDS_BALANCE` error, balance remains $0.
   - On partially paid order ($600 balance), attempt $700.00 payment → verify rejection, balance remains $600.
4. **E2E-04: Overdue Status Presentation**
   - Seed or create order with past due date and positive balance → verify status renders as `Overdue` in table, detail view, and overdue filter.
5. **E2E-05: Edit/Delete Locking Rule**
   - Verify unpaid order has Edit and Delete actions enabled → record $100 payment → verify Edit and Delete are locked/disabled and direct API mutations return 409.

#### 4.3.2 Two-Client Concurrency Integration Tests (MongoDB Atlas)
- **Tool**: Vitest integration runner connecting two independent MongoDB clients.
- **Scenario A (Overpayment Race)**: Submit two $400 payments concurrently against a $500 balance. Assert: exactly one succeeds, one fails with 422 `PAYMENT_EXCEEDS_BALANCE`, balance is $100 (never negative).
- **Scenario B (Exact Settlement Race)**: Submit $400 and $600 payments concurrently against $1,000 balance. Assert: both succeed serially, final balance is $0, status is `paid`.
- **Scenario C (Idempotency Replay Race)**: Submit same idempotency key concurrently twice. Assert: exactly one payment inserted, both receive successful responses, balance decremented once.
- **Scenario D (Payment vs Edit/Delete Race)**: Race first payment with `PATCH` and `DELETE`. Assert: atomic predicates prevent race condition corruption.

#### 4.3.3 Relative-Date Demo Dataset (`pnpm db:seed`)
- Development / demo seed data must compute dates dynamically relative to `todayUTC`:
  1. Pending order: due in `today + 7 days`, 0 payments.
  2. Partially paid order: due in `today + 7 days`, 1 payment of $300 against $1,000.
  3. Paid in full order: due in `today - 2 days`, 2 payments totaling $1,500 ($0 due).
  4. Overdue unpaid order: due in `today - 7 days`, 0 payments ($800 due).
  5. Overdue partially paid order: due in `today - 5 days`, 1 payment of $200 against $1,000 ($800 due).
  6. Assignment sample order: due in `today + 7 days`, 2 x $500 = $1,000 total, 1 payment of $400 recorded ($600 balance due).

---

### 4.4 Phase 11: Production Deployment Readiness

#### 4.4.1 Deployment Architecture
- **Web App**: Next.js deployed on Vercel.
- **API**: Express service deployed on Vercel / serverless adapter with same-origin `/api/v1` rewrite configured via `next.config.ts` (`API_INTERNAL_URL`).
- **Database**: MongoDB Atlas dedicated cluster with TLS connection string (`MONGODB_URI`).

#### 4.4.2 Environment Configuration & Security Verification
- **Required Variables**:
  - API: `NODE_ENV=production`, `MONGODB_URI`, `MONGODB_DATABASE`, `SESSION_COOKIE_NAME`, `SESSION_TTL_SECONDS=604800`, `APP_ORIGIN`, `REGISTRATION_ENABLED=true`, `TRUST_PROXY_HOPS=1`.
  - Web: `NEXT_PUBLIC_API_BASE_PATH=/api/v1`, `API_INTERNAL_URL`.
- **Security Headers & Cookie Attributes**:
  - Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
  - Response Headers: Helmet API defaults, `X-Request-Id` attached to every response, `Cache-Control: private, no-store` on authenticated endpoints.
  - Body Limits: 32 KiB JSON maximum.
  - Unsafe Origin Enforcement: Strict matching of `Origin` header to `APP_ORIGIN`.

#### 4.4.3 Idempotent Release Migrations
- Migration execution (`pnpm db:migrate`) runs as a controlled release step.
- Applied migrations stored in `schema_migrations`.
- Database reset script (`pnpm db:reset`) strictly guarded to abort if database name does not end in `_development` or `_test`.

---

### 4.5 Phase 12: Reviewer Submission Audit

#### 4.5.1 Reviewer Documentation (`README.md`)
- 2-minute executive overview of product and architecture.
- Public live application URL and test credentials (or self-registration instructions).
- Explicit explanation of the single-document atomic update and concurrency model:
  - Why line items and payments are embedded.
  - How `findOneAndUpdate` with balance and idempotency predicates prevents race conditions without multi-document transactions.
- Step-by-step clean checkout setup, migration, seeding, and testing instructions.
- Documented edge cases, domain rules, assumptions, and future scaling considerations.

#### 4.5.2 Automated Gate Verification
- `pnpm lint` — 0 errors, 0 warnings across all workspaces.
- `pnpm typecheck` — strict TypeScript passing cleanly across `@crossval/contracts`, `@crossval/api`, and `@crossval/web`.
- `pnpm format:check` — Prettier formatting compliance.
- `pnpm test` — all unit, component, and integration tests pass.
- `pnpm test:integration` — all real MongoDB Atlas integration tests pass.
- `pnpm build` — successful production builds for web, api, and contracts.

#### 4.5.3 Verification Walkthrough Scenario
- Verify live execution of the 4-step assignment test:
  1. Create $1,000 order (2 x $500) due in 7 days.
  2. Pay $400 → verify status `partially_paid`, $600 due.
  3. Pay $600 → verify status `paid`, $0 due.
  4. Attempt $1 payment → verify rejection with actionable error.

---

## 5. Domain Invariants & Formulas

1. **Integer Money Representation**:
   - Stored and transported as integer cents: $1.00 = 100 cents.
   - Max order total: `999_999_999` cents ($9,999,999.99).
2. **Line Total Formula**:
   $$\text{lineTotalCents} = \text{quantity} \times \text{unitPriceCents}$$
3. **Order Total & Balance Invariants**:
   $$\text{totalAmountCents} = \sum \text{lineTotalCents}$$
   $$\text{balanceDueCents} = \text{totalAmountCents} - \sum \text{payment.amountCents}$$
   $$\text{amountPaidCents} = \text{totalAmountCents} - \text{balanceDueCents}$$
   $$0 \le \text{balanceDueCents} \le \text{totalAmountCents}$$
   $$\sum \text{payment.amountCents} \le \text{totalAmountCents}$$
   $$\text{paymentCount} = \text{payments.length}$$
4. **Deterministic Status Derivation Hierarchy**:
   $$\text{Status} = \begin{cases} 
   \text{"paid"} & \text{if } \text{balanceDueCents} = 0 \\
   \text{"overdue"} & \text{else if } \text{dueDate} < \text{todayUTC} \\
   \text{"partially\_paid"} & \text{else if } \text{paymentCount} > 0 \\
   \text{"pending"} & \text{otherwise}
   \end{cases}$$
5. **Locking Invariant**:
   $$\text{isEditable} = (\text{paymentCount} = 0)$$
   $$\text{isDeletable} = (\text{paymentCount} = 0)$$

---

## 6. HTTP API Contracts & Error Catalog

### 6.1 Endpoints Summary

| Method | Endpoint | Auth | Request Payload | Response (Success) | Error Codes |
|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/signup` | Public | `{ email, password }` | 201 `{ data: Viewer }` | `VALIDATION_FAILED` (422), `EMAIL_ALREADY_REGISTERED` (409), `REGISTRATION_DISABLED` (403) |
| `POST` | `/api/v1/auth/login` | Public | `{ email, password }` | 200 `{ data: Viewer }` | `INVALID_CREDENTIALS` (401), `VALIDATION_FAILED` (422), `RATE_LIMITED` (429) |
| `POST` | `/api/v1/auth/logout` | Optional | None | 204 No Content | None (idempotent) |
| `GET` | `/api/v1/auth/me` | Required | None | 200 `{ data: Viewer }` | `AUTHENTICATION_REQUIRED` (401) |
| `GET` | `/api/v1/orders/summary` | Required | None | 200 `{ data: OrderSummary, meta: { asOfDate } }` | `AUTHENTICATION_REQUIRED` (401) |
| `GET` | `/api/v1/orders` | Required | Query params (`status`, `search`, `sort`, `direction`, `page`, `pageSize`) | 200 `{ data: OrderListItem[], meta: PaginationMeta }` | `AUTHENTICATION_REQUIRED` (401), `VALIDATION_FAILED` (422) |
| `POST` | `/api/v1/orders` | Required | `{ customerName, dueDate, items: [...] }` | 201 `{ data: OrderDetail }` | `VALIDATION_FAILED` (422), `AUTHENTICATION_REQUIRED` (401) |
| `GET` | `/api/v1/orders/:orderId` | Required | None | 200 `{ data: OrderDetail }` | `ORDER_NOT_FOUND` (404), `INVALID_RESOURCE_ID` (400), `AUTHENTICATION_REQUIRED` (401) |
| `PATCH` | `/api/v1/orders/:orderId` | Required | `{ customerName, dueDate, items: [...] }` | 200 `{ data: OrderDetail }` | `ORDER_NOT_FOUND` (404), `ORDER_LOCKED_AFTER_PAYMENT` (409), `VALIDATION_FAILED` (422), `AUTHENTICATION_REQUIRED` (401) |
| `DELETE` | `/api/v1/orders/:orderId` | Required | None | 204 No Content | `ORDER_NOT_FOUND` (404), `ORDER_LOCKED_AFTER_PAYMENT` (409), `AUTHENTICATION_REQUIRED` (401) |
| `POST` | `/api/v1/orders/:orderId/payments` | Required | Header: `Idempotency-Key: <UUID>`<br>Body: `{ amountCents, paymentDate, note? }` | 201 `{ data: RecordPaymentResult }`<br>(or 200 with `Idempotency-Replayed: true`) | `PAYMENT_EXCEEDS_BALANCE` (422), `ORDER_ALREADY_PAID` (422), `PAYMENT_LIMIT_REACHED` (422), `IDEMPOTENCY_KEY_REUSED` (409), `ORDER_NOT_FOUND` (404), `PAYMENT_TEMPORARILY_UNAVAILABLE` (503), `VALIDATION_FAILED` (422) |
| `GET` | `/health` | Public | None | 200 `{ status: "ok" }` | None |

### 6.2 Standard Error Response Envelope
```json
{
  "error": {
    "code": "PAYMENT_EXCEEDS_BALANCE",
    "message": "Payment amount exceeds the order's remaining balance.",
    "details": {
      "remainingAmountCents": 60000
    },
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## 7. Acceptance Criteria Checklist (Phases 8–12)

- [ ] **Phase 8: Order Creation & Editing**
  - [ ] Users can access `/orders/new` and dynamically add/remove line items.
  - [ ] Live preview updates subtotal and total accurately.
  - [ ] Submission converts decimal strings to integer cents; API calculates authoritative total.
  - [ ] Successful creation redirects to `/orders/[orderId]` with full detail.
  - [ ] Unpaid orders can be edited at `/orders/[orderId]/edit` and replaced atomically.
  - [ ] Unpaid orders can be deleted with confirmation dialog; removed from dashboard cache.
  - [ ] Orders with payments cannot be edited or deleted (UI disabled + HTTP 409 API defense).
- [ ] **Phase 9: Settlement UX Polish**
  - [ ] Record payment dialog includes "Use remaining balance" button.
  - [ ] Payment button dynamically displays formatted amount.
  - [ ] Idempotency key retained across retry attempts.
  - [ ] Cache invalidation reconciles detail, list, and summary caches immediately.
  - [ ] Status transitions to `partially_paid` or `paid` immediately with success toast.
- [ ] **Phase 10: Testing Hardening & QA**
  - [ ] Playwright E2E suite passes all 5 core journeys.
  - [ ] Assignment sample scenario ($1,000 → $400 → $600 → reject $1) passes end-to-end.
  - [ ] Concurrency integration tests prove zero balance overdrafts and zero race condition corruptions.
  - [ ] Relative-date database seed creates valid, non-stale demo data covering all 4 statuses.
- [ ] **Phase 11: Production Deployment Readiness**
  - [ ] Production Vercel Next.js web application and Express API rewrite operational.
  - [ ] MongoDB Atlas connection pooling, timeouts, and TLS active.
  - [ ] Release migrations execute idempotently.
  - [ ] HttpOnly session cookies, Origin security, and rate limits verified.
- [ ] **Phase 12: Reviewer Submission Audit**
  - [ ] Root `README.md` provides 2-minute overview, live URL, credentials, and concurrency explanation.
  - [ ] All checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm build`) pass with zero warnings/errors.
  - [ ] Requirements traceability matrix has 100% verified status.
