# CrossVal Orders & Settlements

CrossVal Orders & Settlements is a production-grade full-stack web application for creating customer orders with line items, recording partial and full payments, and monitoring outstanding receivables through an operational B2B finance dashboard.

This application is built to satisfy the **Orders and Settlements** take-home assignment specifications (`orders-and-settlements.pdf`), emphasizing financial correctness, atomic concurrency control, per-user data isolation, derived status integrity, and an accessible Align UI design system.

---

## Table of Contents
1. [Core Features & Invariants](#core-features--invariants)
2. [Tech Stack](#tech-stack)
3. [Prerequisites & Step-by-Step Setup](#prerequisites--step-by-step-setup)
4. [API Overview](#api-overview)
5. [Status Derivation Rules & Edge-Case Decisions](#status-derivation-rules--edge-case-decisions)
6. [Architectural Assumptions & Tradeoffs](#architectural-assumptions--tradeoffs)
7. [What to Improve Before Production](#what-to-improve-before-production)
8. [Sample Scenario Verification Flow](#sample-scenario-verification-flow)
9. [Automated Test Suite](#automated-test-suite)

## Live Deployment & Reviewer Quick Start

* **Live Web App**: [https://crossval-orders-and-settlements-web.vercel.app/](https://crossval-orders-and-settlements-web.vercel.app/)

### 3-Minute Reviewer Evaluation Walkthrough
1. Open the live app: [https://crossval-orders-and-settlements-web.vercel.app/](https://crossval-orders-and-settlements-web.vercel.app/)
2. Click **"Create an account"** and sign up with any email and password ($\ge$ 6 characters) to receive a private, isolated workspace.
3. On the dashboard, click **"Load sample data"** on the top card to instantly populate 6 realistic demo orders covering every financial status (`pending`, `partially_paid`, `paid`, `overdue`, and `paid-after-overdue`).
4. Or run the official assignment flow manually:
   * **Create order**: Click **"New order"**, enter Customer Name (`Acme Corp`), Due Date (7 days out), and 2 line items of `$500.00` (Total: `$1,000.00`).
   * **Partial payment**: Click **"Record payment"** and submit `$400.00` $\to$ Status becomes `Partially paid`, Amount Due `$600.00`, and "Edit order" / "Delete" lock permanently.
   * **Full settlement**: Click **"Record payment"** and submit `$600.00` $\to$ Status becomes `Paid`, Balance Due `$0.00`, and badge displays `Paid in full`.
   * **Overpayment rejection**: Submit another `$1.00` $\to$ Rejected with actionable error: max allowed payment is `$0.00`.

---

## Core Features & Invariants

* **Integer-Based Money Math**: All financial amounts are transported, stored, and calculated strictly as integer cents (`$1,000.00` = `100000` cents). Zero floating-point arithmetic is used in authoritative calculations.
* **Server-Recalculated Totals**: The server validates and recomputes all line totals and order totals from line item `(quantity * unitPriceCents)`.
* **Atomic Payment Settlements**: Balance decrements, payment count increments, and payment ledger appends execute in a single atomic MongoDB `findOneAndUpdate` operation with conditional match predicates (`balanceDueCents >= paymentAmountCents`).
* **Payment Idempotency**: Payment requests require a client-generated UUID idempotency key. Safe retries replay the committed payment without double-decrementing balances; tampered requests with mismatched amounts or notes are rejected with `409 Conflict`.
* **Immutable Accounting Ledger**: Orders are editable and deletable **only before the first payment**. Once any payment is recorded, the order and all historical payments become permanently locked against mutation or deletion to maintain auditability.
* **Derived Statuses**: Status (`pending`, `partially_paid`, `paid`, `overdue`) is computed deterministically from payment totals and due date, never stored as mutable truth.
* **Data Isolation**: Every order and settlement query is strictly scoped to the authenticated `userId`. User A cannot view, mutate, or pay against User B's orders.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Align UI design tokens |
| **State & Forms** | TanStack Query (React Query v5), React Hook Form, Zod, Radix UI Primitives |
| **Backend** | Express 5, TypeScript, Official MongoDB Node.js Driver (v7.5) |
| **Database** | MongoDB Atlas (8.0-compatible document model with JSON Schema collection validators and named indexes) |
| **Authentication** | Argon2id password hashing, opaque server-side session tokens, SameSite/HttpOnly cookies |
| **Monorepo** | pnpm workspaces (`apps/web`, `apps/api`, `packages/contracts`) |

---

## Prerequisites & Step-by-Step Setup

### Prerequisites
* **Node.js**: `24.x` (or version recorded in `.node-version`)
* **pnpm**: `11.5.2` (via Corepack: `corepack enable && corepack prepare pnpm@11.5.2 --activate`)
* **MongoDB**: A running MongoDB instance or MongoDB Atlas cluster URI.

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd crossval
pnpm install --frozen-lockfile
```

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Ensure `.env` contains your MongoDB Atlas connection string:
```env
NODE_ENV=development
APP_ORIGIN=http://localhost:3000
API_PORT=3001
API_INTERNAL_URL=http://localhost:3001
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/
MONGODB_DATABASE=crossval_development
MONGODB_TEST_DATABASE=crossval_test
SESSION_COOKIE_NAME=crossval_session
SESSION_TTL_SECONDS=2592000
REGISTRATION_ENABLED=true
```

### 3. Initialize Database & Seed Fixtures
Apply idempotent collection validators and indexes, then optionally load relative-date demo orders:
```bash
pnpm db:migrate
pnpm db:seed
```

### 4. Start the Application
```bash
pnpm dev
```
* **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:3001](http://localhost:3001) (Health check: `http://localhost:3001/health`)

---

## API Overview

All API endpoints are versioned under `/api/v1` and require authenticated session cookies (except `/auth/*`):

### Authentication
* `POST /api/v1/auth/signup` — Register new user (`email`, `password` $\ge$ 6 characters).
* `POST /api/v1/auth/login` — Authenticate and establish session cookie.
* `POST /api/v1/auth/logout` — Revoke active session.
* `GET /api/v1/auth/me` — Return current authenticated viewer.

### Orders
* `POST /api/v1/orders` — Create new order with customer name, due date (`YYYY-MM-DD`), and line items.
* `GET /api/v1/orders` — List owned orders with pagination (`page`, `pageSize`), status filter (`all`, `pending`, `partially_paid`, `paid`, `overdue`), search (`search`), and sorting (`sort`, `direction`).
* `GET /api/v1/orders/summary` — Aggregate financial summary (total orders, outstanding cents, collected cents, overdue cents).
* `GET /api/v1/orders/:id` — Get full order details, embedded line items, derived status, and payment history ledger.
* `PATCH /api/v1/orders/:id` — Replace/update an unpaid order (locked if any payment recorded).
* `DELETE /api/v1/orders/:id` — Delete an unpaid order (locked if any payment recorded).

### Payments & Settlements
* `POST /api/v1/orders/:id/payments` — Record a partial or full settlement payment.
  * Headers: `Idempotency-Key: <uuid-v4>`
  * Body: `{ amountCents: number, paymentDate: "YYYY-MM-DD", note?: string }`
  * Response: Returns recorded payment and updated balance; exact replays return `200 OK` with `Idempotency-Replayed: true`. Overpayment attempts return `422 Unprocessable Entity` with `PAYMENT_EXCEEDS_BALANCE` and `maxAllowedCents`.

---

## Status Derivation Rules & Edge-Case Decisions

Order status is **never persisted as a mutable field** in the database. It is derived dynamically using pure domain logic (`deriveOrderStatus`):

| Status | Exact Condition |
|---|---|
| `pending` | Total payments = $0 and `today <= dueDate` |
| `partially_paid` | Total payments > $0 and total payments < order total and `today <= dueDate` |
| `paid` | Total payments = order total (balance due = $0) |
| `overdue` | `today > dueDate` and total payments < order total |

### Edge-Case Handling:
1. **Paid Takes Precedence Over Overdue**: If an order was past its due date (`overdue`) and subsequently paid in full, its status transitions immediately to `paid`. Paid in full is the terminal financial state.
2. **Due Today is NOT Overdue**: An order with `dueDate == today` remains `pending` or `partially_paid` until the date has elapsed.
3. **Date-Only Business Calendars**: Due dates and payment dates are stored and compared as `YYYY-MM-DD` strings, preventing UTC/timezone boundary shifts from miscalculating overdue status.

---

## Architectural Assumptions & Tradeoffs

1. **Embedded Payment Ledger vs Separate Collection**:
   * *Decision*: Line items and payments are embedded directly inside the parent Order document.
   * *Rationale*: Guarantees single-document atomic updates (`$inc` and `$push`) without the overhead and distributed locks of multi-document transactions. Order documents enforce a max limit of 1,000 payments, well below MongoDB's 16MB document boundary.
2. **Immutability After First Payment**:
   * *Decision*: Orders become permanently read-only once any payment is committed.
   * *Rationale*: Altering line items or due dates after a partial payment corrupts historical ledger audits and can cause negative balance drift.
3. **Same-Origin Cookie Forwarding**:
   * *Decision*: Next.js rewrites `/api/*` to the Express API.
   * *Rationale*: Eliminates third-party cookie restrictions, prevents CORS vulnerabilities, and ensures `HttpOnly; SameSite=Lax` cookies work seamlessly across all browsers.

---

## What to Improve Before Production

1. **Distributed Rate Limiting**: Replace in-memory Express rate limiting with a Redis-backed token bucket to support multi-instance horizontal scaling.
2. **Webhooks & Notification Engine**: Send automated webhook events (`order.created`, `payment.recorded`, `order.settled`) to external accounting systems (QuickBooks, NetSuite).
3. **Async CSV Export Worker**: Offload large dataset CSV exports to background jobs for high-volume enterprise accounts.
4. **Refunds & Credit Notes**: Introduce a dedicated Credit Note / Refund ledger aggregate to model return workflows while maintaining immutable historical entries.

---

## Sample Scenario Verification Flow

The assignment verification flow (`$1,000 → $400 → $600 → reject $1`) is automated and tested in `tests/orders/challenger-m2-settlement.integration.test.ts`:

```bash
# 1. Create order with 2 items x $500.00 = $1,000.00 total (due in 7 days)
#    -> Status: pending, Amount Due: $1,000.00

# 2. Record partial payment of $400.00
#    -> Status: partially_paid, Amount Due: $600.00, Paid: $400.00

# 3. Record payment of $600.00
#    -> Status: paid, Amount Due: $0.00, Paid: $1,000.00

# 4. Attempt to record another $1.00 payment
#    -> Rejected with HTTP 422: PAYMENT_EXCEEDS_BALANCE (max allowed: $0.00)
```

---

## Automated Test Suite

```bash
# 1. Run all frontend unit and component tests
pnpm --filter @crossval/web test

# 2. Run backend domain unit tests
pnpm --filter @crossval/api test

# 3. Run full integration & concurrency suite against MongoDB Atlas
pnpm --filter @crossval/api test:integration

# 4. Run typecheck & linter across all workspaces
pnpm typecheck
pnpm lint

# 5. Verify full production build
pnpm build
```
