# Testing Strategy

## Quality objective

Tests should prove the business invariants that make the assignment interesting: exact totals, derived statuses, ownership, edit locks, overpayment prevention, idempotency, and true concurrent payment safety. UI tests then prove that those capabilities are understandable to a user.

## Test layers

| Layer                   | Scope                                         | Primary tools                   | Runs against                          |
| ----------------------- | --------------------------------------------- | ------------------------------- | ------------------------------------- |
| Unit                    | Pure domain and formatting behavior           | Vitest                          | In-process functions                  |
| Component               | Frontend states and interactions              | Testing Library + MSW           | Components and mocked HTTP            |
| API integration         | Routes, validators, indexes, queries, auth    | Vitest/Supertest or equivalent  | Real test MongoDB                     |
| Concurrency integration | Conditional-write and document invariants     | Node test runner + real MongoDB | Multiple independent clients/requests |
| End-to-end              | Critical user journeys                        | Playwright                      | Running web, API, and test database   |
| Static                  | Types, lint, formatting, migration validation | TypeScript and project tooling  | Repository                            |

In-memory repositories and mocked driver calls cannot validate MongoDB match-predicate rechecks, atomic `$inc`/`$push` behavior, collection validators, or indexes. Payment concurrency tests require a real MongoDB server.

Integration tests use the Atlas-specific `MONGODB_TEST_URI` when provided and otherwise use the configured `MONGODB_URI`. They fail fast when neither variable exists. Every run generates a database name ending in `_test`; teardown drops only that exact generated database.

Current database-foundation commands:

```bash
pnpm test
pnpm test:integration
```

The web unit suite contains 12 Phase 7 tests covering canonical URL parsing and serialization, invalid and repeated parameter recovery, search normalization, pagination resets and ranges, out-of-range correction, stable query-key composition and prefixes, and explicit encoded request serialization.

The current real-MongoDB Atlas integration suite contains 31 tests: five database-foundation tests, eleven authentication tests, seven order API tests, and eight atomic-payment tests. In addition to the existing migration, authentication, ownership, order CRUD, status, and projection coverage, it proves partial/exact settlement, overpayment rejection, semantic payment dates, ownership concealment, stable idempotent replay, changed-payload conflicts, duplicate concurrent requests, sufficient-balance predicate rechecks, exact concurrent settlement, and payment-versus-edit/delete serialization through two independent MongoDB clients.

The API package keeps integration files out of its ordinary unit command. `pnpm test:integration` runs the database suites serially so each suite can own and drop an isolated generated test database safely.

## Test environment

- Use a database dedicated to automated tests.
- Reset data deterministically between tests or test suites.
- Apply the same versioned collection-validator and index migrations used by production.
- Prefer a dedicated Atlas test cluster or test credential; do not substitute a different database engine.
- Use fixed factories/builders with overrides, not large anonymous fixtures.
- Freeze time where status and due dates depend on “today.”
- Run tests in UTC unless a test explicitly validates timezone presentation.
- Never connect test commands to development or production data.

## Unit test catalogue

### Money and totals

- quantity × unit price produces the expected integer-cent line total;
- multiple line totals sum exactly;
- zero, negative, non-integer, and out-of-range values are rejected at the appropriate boundary;
- formatting never affects stored/calculated values.

### Status derivation

Cover the status decision table around a fixed current date:

|             Balance |       Paid amount | Due date     | Expected status  |
| ------------------: | ----------------: | ------------ | ---------------- |
|                   0 | positive or total | any          | `paid`           |
|               total |                 0 | today/future | `pending`        |
| between 0 and total |          positive | today/future | `partially_paid` |
|            positive |  any valid amount | before today | `overdue`        |

Also prove that `paid` wins over an old due date and that due-today is not overdue.

### Validation

- order requires customer name, due date, and at least one line item;
- line item limits and allowed numeric representations;
- payment amount and idempotency-key rules;
- query filter normalization and sort allowlisting.

### Frontend utilities

- query key stability and normalization;
- API error decoding;
- date-only rendering without timezone drift;
- USD formatting;
- URL parameter parsing and defaults.

## API integration catalogue

### Authentication

- [x] register creates a user with a password hash and session;
- [x] duplicate normalized email is rejected, including a concurrent race;
- [x] login succeeds and fails safely with one generic credential error;
- [x] session endpoint returns only public viewer fields;
- [x] successful login rotates and revokes the caller's previous session;
- [x] logout revokes the session and is idempotent;
- [x] expired/revoked sessions cannot access protected routes;
- [x] unsafe cross-origin requests, malformed JSON, unsupported media types, and invalid fields fail with structured errors.
- [x] registration can be disabled and repeated credential attempts are rate limited safely.

Phase 3 also passed a live browser smoke on 2026-08-14: protected-route redirect, signup, authenticated refresh, generic invalid-login feedback, logout, post-logout route rejection, and returning-user login. A committed automated Playwright suite remains part of the later end-to-end phase.

Phase 7 passed a live browser verification on 2026-08-15 at desktop and 390 px mobile widths: default and second-page ranges, debounced server search, status filtering, all supported sorting state, malformed/default URL canonicalization, out-of-range page recovery, responsive mobile cards and navigation, and payment-driven list/summary invalidation. No horizontal overflow or material browser-console errors were observed. The temporary Atlas user, sessions, and 12 orders were removed afterward.

### Ownership

- [x] User B cannot list, summarize, fetch, edit, or delete User A's orders; foreign and missing IDs have the same 404 response.
- [x] Payment creation is ownership-scoped and foreign orders use the same 404 response as missing orders.

### Orders

- [x] create computes line totals, order total, and initial balance on the server;
- [x] client-supplied total/status/owner fields are rejected;
- [x] list filters, search, sort, pagination, and projections behave deterministically;
- [x] detail includes ordered line items and payment history;
- [x] unpaid order can be updated and deleted;
- [x] order with a payment cannot be updated or deleted;
- [x] missing and foreign orders use the intended not-found semantics.

### Payments

- [x] valid partial payment updates balance and status;
- [x] exact remaining payment produces zero balance and `paid`;
- [x] overpayment is rejected without any partial write;
- [x] zero/negative payment is rejected;
- [x] payment cannot be edited or deleted because no mutation routes exist;
- [x] identical idempotency replay returns the original committed result without a second embedded payment;
- [x] reuse of an idempotency key with a different payload returns a conflict;
- [x] failures leave both payment total and order balance unchanged.

## Concurrency tests

These tests must use at least two independent connections and coordinate their start so both requests genuinely overlap.

### Scenario A: two payments exceed the balance together

Given an order with a 10,000-cent balance, submit 7,000 and 6,000 cents concurrently.

Expected:

- only one request commits;
- the other receives the documented validation response after its sufficient-balance predicate no longer matches;
- final balance is either 3,000 or 4,000 cents;
- payment sum plus balance equals order total;
- balance is never negative.

### Scenario B: two payments exactly consume the balance

Submit 4,000 and 6,000 cents concurrently against 10,000 cents.

Expected:

- both can commit serially;
- final balance is zero;
- status is `paid`;
- exactly two embedded payments exist and `paymentCount` is two.

### Scenario C: duplicate retry

Submit the same idempotency key concurrently twice.

Expected:

- exactly one embedded payment and `paymentCount` of one;
- both callers receive a semantically successful canonical response or the documented replay behavior;
- balance changes once.

### Scenario D: payment versus edit/delete

Overlap a first payment with an update and separately with a delete.

Expected:

- MongoDB serializes the competing writes to the same document and rechecks their predicates;
- no committed state violates “orders with payments are locked”;
- the result matches documented atomic-write ordering, not timing luck.

The test must repeat critical races enough to detect flaky coordination, while using explicit barriers rather than arbitrary sleeps.

## Component test catalogue

- Orders dashboard skeleton, error, first-use empty, filtered empty, and populated states.
- Summary values and semantic status badges.
- Filters update URL state and reset pagination.
- Table navigation is keyboard accessible.
- Create-order form adds/removes line items and renders validation.
- Payment dialog shows balance, blocks obvious overpayment, and sends an idempotency key.
- A state-dependent payment rejection such as `422 PAYMENT_EXCEEDS_BALANCE` refreshes detail and explains the changed balance.
- Successful payment renders committed values and closes the dialog.
- Logout clears user-specific query data.
- Protected layouts handle session loading and session expiry without flashing private content.

## End-to-end journeys

### E2E-01: create and find an order

1. Sign in.
2. Create a 1,000.00 USD order with multiple line items.
3. Confirm detail totals and Pending status.
4. Return to dashboard and find it by search.

### E2E-02: partial then complete settlement

1. Record 400.00 against the 1,000.00 order.
2. Confirm Partially paid, 400.00 paid, and 600.00 due.
3. Record 600.00.
4. Confirm Paid and zero due with both history entries.

### E2E-03: overpayment recovery

1. Open a partially paid order.
2. Attempt more than the current balance through direct request or manipulated input.
3. Confirm safe error, unchanged balance, and no extra payment.

### E2E-04: overdue presentation

1. Use seeded data with a past due date and positive balance.
2. Confirm Overdue in dashboard, filters, and detail.

### E2E-05: edit/delete lock

1. Confirm an unpaid order is editable.
2. Add a payment.
3. Confirm edit and delete are no longer available and direct API attempts fail.

## Non-functional checks

- Basic accessibility scan plus keyboard walkthrough.
- Responsive smoke test at mobile, tablet, and desktop sizes.
- Production builds complete without type errors.
- No sensitive values appear in client bundles or logs.
- Key API routes return structured request IDs.
- MongoDB validators and named indexes apply idempotently to an empty database.
- Representative list/status queries use intended indexes under `explain("executionStats")`.
- Dashboard projections exclude embedded payment and line-item arrays.

## Coverage policy

Line coverage is a signal, not the target. Critical domain modules and atomic-write paths should have near-complete branch coverage. A test suite with lower aggregate coverage but explicit concurrency and authorization proof is more valuable than shallow snapshots.

Avoid broad snapshot tests for dynamic pages. Prefer assertions on accessible roles, visible business values, database state, and invariants.

## CI gates

The intended pull-request pipeline runs:

1. dependency install from lockfile;
2. formatting check;
3. lint;
4. TypeScript checks for every package;
5. unit and component tests;
6. API integration and concurrency tests with MongoDB;
7. production builds;
8. a focused Playwright smoke suite.

The full E2E and extended race suite may run on the main branch if CI time is constrained, but the central payment concurrency test is a required pre-submission gate.

## Exit criteria

Testing is submission-ready only when:

- all required journeys pass from a clean environment;
- concurrency tests prove the balance invariant;
- no flaky test is muted or blindly retried;
- authorization is covered across all protected resource operations;
- production builds and migrations succeed;
- failures provide enough diagnostics to reproduce without leaking secrets.
