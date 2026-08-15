# Handoff Report — Specification Mining for Phases 8–12

## 1. Observation

### 1.1 Specification & Codebase Documents Inspected
- `ORIGINAL_REQUEST.md`: Lines 1–43 detailing requirements R1 (Phase 8 Order Lifecycle Workflows), R2 (Phase 9 Settlement UX Polish), and R3 (Phases 10–12 QA, Concurrency, and Production Verification).
- `orders-and-settlements.pdf`: 3 pages detailing core assignment requirements, line item formulas, 4-status conditions (`pending`, `partially_paid`, `paid`, `overdue`), payment rules, dashboard specifications, API contracts, the 4-step verification scenario ($1,000 → $400 → $600 → reject $1), and submission deliverables.
- `AGENTS.md`: Repository constraints, tech stack boundaries (Next.js, Express, TypeScript, MongoDB driver 7.5.0 without ORM/ODM, React Hook Form, Zod, React Query, Align UI), and domain invariants.
- `ROADMAP.md`: Lines 1–354 detailing Phases 0 through 7 completion status and detailed plans for Phases 8 through 12.
- `ARCHITECTURE.md`: Monorepo structure, backend module structure, frontend boundaries, single-document atomic update architecture, and deployment topology.
- `docs/DOMAIN_RULES.md`: Authoritative specification for integer money handling, line/order calculations, materialized balance invariant, UTC date-only semantics, status derivation table, conditional unpaid edit/delete, atomic payment `findOneAndUpdate` with idempotency fingerprinting, and concurrency rules.
- `docs/API.md`: Public `/api/v1` and internal `/v1` endpoints, envelopes, status codes, query parameters, request schemas, and error shapes (`ApiErrorResponse`).
- `docs/DATABASE.md`: MongoDB schema definitions, embedded line items and payments, collection validators (`$jsonSchema`), named indexes, query catalogue, and migration/seed commands.
- `docs/FRONTEND.md`: React Query query key factory (`orderKeys`), mutation invalidation rules, URL-backed search/filter/sort/pagination state, form handling, and error states.
- `docs/UI_UX.md`: Information architecture, dashboard summary cards, orders table, order detail hierarchy, record payment dialog, status badges, and accessibility guidelines.
- `docs/TESTING.md`: Testing strategy across unit, component, API integration, two-client concurrency integration, and Playwright end-to-end journeys.
- `docs/SECURITY.md`: Trust boundaries, Argon2id hashing, opaque database-backed sessions, tenant isolation, CSRF origin checks, rate limiting, and redaction rules.
- `docs/DECISIONS.md`: ADR-001 through ADR-030 documenting architectural choices.
- `docs/DEPLOYMENT.md`: Vercel Next.js web + Express API rewrite topology, MongoDB Atlas pooling, release migrations, and deployment smoke checklist.
- `docs/SUBMISSION_CHECKLIST.md`: Release verification gates across scope, domain correctness, concurrency, API, auth, frontend, accessibility, tests, deployment, and reviewer handoff.
- `docs/REQUIREMENTS_TRACEABILITY.md`: Traceability matrix mapping AUTH-01 through NFR-06 to implementation and verification.

### 1.2 Codebase Hook Points & Existing State Inspected
- `packages/contracts/src/orders.ts`: Existing Zod schemas (`createOrderRequestSchema`, `replaceOrderRequestSchema`, `recordPaymentRequestSchema`, `orderListQuerySchema`), TypeScript interfaces (`OrderDetail`, `OrderListItem`, `RecordPaymentResult`, `OrderSummary`), and constants (`orderStatusValues`, `orderSortValues`).
- `apps/api/src/modules/orders/`:
  - `routes.ts`: Existing endpoints for `GET /orders/summary`, `GET /orders`, `POST /orders`, `POST /orders/:orderId/payments`, `GET /orders/:orderId`, `PATCH /orders/:orderId`, `DELETE /orders/:orderId`.
  - `service.ts`: Complete backend implementation of order creation, list query, summary aggregation, order detail, replacement edit (conditional on `paymentCount: 0`), deletion (conditional on `paymentCount: 0`), and atomic payment recording (`findOneAndUpdate` with balance and idempotency key match).
  - `domain.ts`: Pure helpers for line total calculations, order draft preparation, payment draft preparation, date validation, and `deriveOrderStatus`.
- `apps/web/`:
  - `app/orders/page.tsx` & `components/orders/orders-dashboard.tsx`: Fully functional operational dashboard with URL-backed search, status filtering, sorting, pagination, summary cards, desktop table, and mobile cards.
  - `app/orders/[orderId]/page.tsx` & `components/orders/order-detail-workspace.tsx`: Order detail page rendering line items, financial summary, payment history, and payment dialog.
  - `components/orders/payment-dialog.tsx`: Radix modal with balance feedback, "use remaining" button, idempotency key generation, and conflict error handling.
  - `features/orders/`: Query hooks (`useOrders`, `useOrderSummary`, `useOrderDetail`, `useRecordPayment`), API client methods, and query key factory (`orderKeys`).

---

## 2. Logic Chain

1. **Phase 1–7 Completeness**: The backend API (`apps/api`), database foundations (`apps/api/src/db`), shared contracts (`packages/contracts`), and initial web experiences (`apps/web` auth, dashboard, detail, payment dialog) are fully operational and verified against MongoDB Atlas.
2. **Phase 8 Scope**:
   - The backend already exposes `POST /api/v1/orders`, `PATCH /api/v1/orders/:orderId`, and `DELETE /api/v1/orders/:orderId` with strict conditional `paymentCount: 0` checks.
   - The frontend needs:
     - `/orders/new` page + creation form using React Hook Form, dynamic line item array, real-time subtotal previews, and decimal-to-cents submission conversion.
     - `/orders/[orderId]/edit` page + replacement edit form guarded to unpaid orders (`paymentCount === 0`).
     - Unpaid order deletion confirmation dialog and cache invalidation.
     - Edit/Delete locking feedback on `/orders/[orderId]` for paid orders.
     - "Create order" button added to dashboard header.
3. **Phase 9 Scope**:
   - The payment dialog already exists in `payment-dialog.tsx`.
   - Polish required: ensure remaining balance shortcuts, dynamic submit button labels ("Record $X.XX payment"), strict date limits (`max={todayUtc}`), robust idempotency key retention on retries, and comprehensive cache invalidation (`orderKeys.detail(orderId)`, `orderKeys.lists()`, `orderKeys.summaries()`).
4. **Phase 10 Scope**:
   - Full automated Playwright E2E suite covering journeys E2E-01 through E2E-05, specifically proving the assignment scenario ($1,000 → $400 → $600 → reject $1).
   - Real MongoDB Atlas two-client concurrency integration test suite covering Scenarios A, B, C, and D.
   - Relative-date demo seed dataset (`pnpm db:seed`) providing non-stale demo data for all 4 statuses.
5. **Phase 11 Scope**:
   - Production Vercel deployment with Next.js web application rewriting `/api/*` to Express API.
   - MongoDB Atlas connection pooling, timeouts, and idempotent release migration execution (`pnpm db:migrate`).
   - Production smoke checklist verification.
6. **Phase 12 Scope**:
   - Final reviewer documentation in `README.md` (overview, live URL, credentials, architecture notes on single-document atomic writes).
   - Code cleanliness gates (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm build`) passing with 0 warnings/errors.
   - Requirements traceability matrix audit (100% verified status).

---

## 3. Caveats

- No code changes or feature implementations were made during this phase (strict read-only specification survey).
- Backend APIs for order CRUD and payment already enforce all domain rules, but frontend UI for order creation and editing has not been built yet (awaiting explicit Phase 8 approval).
- Concurrency guarantees rely on MongoDB's single-document atomic update model; multi-document transactions are intentionally not used because all consistent fields are embedded in the Order document.

---

## 4. Conclusion

The specification mining for CrossVal Orders & Settlements Phases 8 through 12 is complete. All functional requirements, domain formulas, edge cases, error codes, HTTP contracts, acceptance criteria, and verification procedures have been surveyed, cross-referenced against authoritative sources and existing codebase hook points, and documented in detail in `survey_report.md`.

---

## 5. Verification Method

To independently verify the findings in this report:

1. Inspect `survey_report.md`:
   ```bash
   view_file /Users/aryandahiya/Desktop/Programming/crossval/.agents/spec_miner_survey_1/survey_report.md
   ```
2. Verify contracts and schemas:
   ```bash
   view_file /Users/aryandahiya/Desktop/Programming/crossval/packages/contracts/src/orders.ts
   ```
3. Verify backend routes and service methods:
   ```bash
   view_file /Users/aryandahiya/Desktop/Programming/crossval/apps/api/src/modules/orders/routes.ts
   view_file /Users/aryandahiya/Desktop/Programming/crossval/apps/api/src/modules/orders/service.ts
   ```
4. Verify repository test and typecheck integrity:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   ```
