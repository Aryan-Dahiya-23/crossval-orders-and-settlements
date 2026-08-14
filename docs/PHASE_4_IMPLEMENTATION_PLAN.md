# Phase 4 Implementation Plan — Order Domain and REST CRUD

## 1. Purpose

This is the execution plan for Phase 4. It defined implementation order, module boundaries, API contracts, MongoDB Atlas query behavior, tests, and completion gates before order code was written.

Status: executed and complete on 2026-08-14. The implementation result and exact verification record are in `ROADMAP.md` and `docs/TESTING.md`; Phase 5 payment behavior remains out of scope.

## 2. Objective

Implement the authoritative order domain and ownership-safe REST CRUD surface so that an authenticated user can:

- create an order whose totals are calculated by the server;
- list only their orders with deterministic search, status, sorting, and pagination;
- load account-wide summary values;
- view one owned order with line items and any existing payment history;
- replace an unpaid order's editable content;
- delete an unpaid order;
- receive consistent derived totals, editability flags, and status values from every endpoint.

Phase 4 establishes the domain and API foundation required by the atomic payment work in Phase 5 and the frontend order experiences in Phases 7 and 8.

## 3. Scope boundary

### Included

- Shared order request/response contracts and error codes.
- Pure integer-cent order calculations.
- Canonical date-only validation and UTC business-date handling.
- Derived order status.
- Customer/search normalization.
- Order creation, list, summary, detail, replacement edit, and conditional deletion.
- Authentication and ownership enforcement on every route and database query.
- Stable allowlisted filtering, sorting, and pagination.
- Atlas integration tests, cross-user negative tests, and representative query-plan checks.
- Documentation updates when implemented behavior is finalized.

### Excluded

- Payment creation, idempotency, overpayment handling, and payment concurrency; these are Phase 5.
- Align UI and application-shell work; this is Phase 6.
- React Query order hooks, dashboard cards, and orders table; these are Phase 7.
- Browser order creation, edit, detail, and deletion workflows; these are Phase 8.
- Refunds, reversals, archives, multi-currency, organizations, roles, and audit-log UI.
- A generic repository layer, ODM, transaction framework, or dependency-injection container.

The existing `/orders` page remains an authenticated placeholder throughout Phase 4.

## 4. Authoritative inputs

Implementation must remain consistent with:

1. `docs/DOMAIN_RULES.md` for money, dates, status, locking, and ownership.
2. `docs/API.md` for transport behavior and response envelopes.
3. `docs/DATABASE.md` for the Order aggregate, validators, indexes, and query predicates.
4. `docs/SECURITY.md` for authentication, validation, and tenant isolation.
5. `docs/TESTING.md` for unit, Atlas integration, and authorization coverage.
6. `docs/REQUIREMENTS_TRACEABILITY.md` for ORD-01 through ORD-10, STA-01 through STA-05, DASH-01/DASH-02, AUTH-03, NFR-01, and NFR-03.
7. `AGENTS.md` for repository-wide implementation constraints.

If implementation reveals a contradiction, update the focused source-of-truth document and decision register before silently choosing different behavior.

## 5. Frozen Phase 4 behavior

### 5.1 Money and bounds

- USD is the only currency.
- API and database money values are integer cents.
- Maximum line unit price and maximum order total are `999999999` cents.
- Quantity is an integer from 1 through 1,000,000.
- An order contains 1 through 100 line items.
- A line description contains 1 through 500 characters after trimming.
- A customer name contains 1 through 200 characters after normalization.
- Multiplication checks `unitPriceCents <= floor(maximumOrderCents / quantity)` before multiplying.
- Addition checks the remaining order-total capacity before adding each line.
- Zero-total, unsafe-integer, overflowed, floating-point, negative, and client-authored total values are rejected.

The server generates line-item ObjectIds and sequential zero-based positions. `lineTotalCents` is derived for responses and is not persisted.

### 5.2 Text normalization

- Customer display names are trimmed and internal whitespace is collapsed to one space.
- `customerNameNormalized` is the normalized display name lowercased for search.
- Search input is trimmed, internal whitespace is collapsed, and it is lowercased.
- Search uses an escaped anchored-prefix expression; browser input is never accepted as a MongoDB operator or raw regular expression.
- Line-item descriptions are trimmed. Their meaningful internal text is otherwise preserved.

### 5.3 Date and status policy

- `dueDate` must be a real canonical `YYYY-MM-DD` calendar date.
- Past due dates are valid.
- The business date is the current UTC calendar date, provided through a small injectable clock function for deterministic tests.
- Due today is not overdue.
- Status is never accepted from the client and is never stored.
- Status decision order is: zero balance → `paid`; past due with positive balance → `overdue`; positive payment count → `partially_paid`; otherwise → `pending`.
- List, summary, and detail operations use one business date captured at the beginning of the service operation.

### 5.4 Create semantics

- The request contains only `customerName`, `dueDate`, and `items`.
- Unknown properties—including `userId`, status, totals, balance, payment count, payments, timestamps, and item IDs/positions/totals—are rejected.
- The service calculates line totals and the order total.
- Creation stores an empty payment ledger, `paymentCount: 0`, and `balanceDueCents` equal to the calculated total.
- The authenticated user ID comes only from the server-side authentication context.

### 5.5 List semantics

- Every list filter begins with the authenticated `userId`.
- Allowed status values are `all`, `pending`, `partially_paid`, `paid`, and `overdue`.
- Search is a bounded normalized customer-name prefix.
- Allowed sort values are `createdAt`, `dueDate`, and public `totalAmount`, which maps internally to `totalAmountCents`.
- Allowed directions are `asc` and `desc`.
- Page is a positive integer; page size is one of 10, 25, or 50.
- Default ordering is `createdAt desc`.
- Every sort adds `_id` in the same direction as a deterministic tie-breaker.
- List projections exclude `lineItems` and `payments`.
- Pagination metadata is `page`, `pageSize`, `totalItems`, and `totalPages`.
- A page beyond the final page returns an empty `data` array with canonical metadata, not an error.

Status filters map directly to stored facts using the single captured UTC business date:

```text
paid:           balanceDueCents = 0
overdue:        balanceDueCents > 0 and dueDate < today
pending:        balanceDueCents > 0 and dueDate >= today and paymentCount = 0
partially_paid: balanceDueCents > 0 and dueDate >= today and paymentCount > 0
```

### 5.6 Summary semantics

- Summary is account-wide and does not inherit list search, status, sort, or pagination state.
- One aggregation scoped by authenticated `userId` returns:
  - `totalOrders`;
  - `outstandingAmountCents` as the sum of balances;
  - `collectedAmountCents` as the sum of total minus balance;
  - `overdueAmountCents` for positive balances with a due date before the captured business date.
- An account with no orders returns four zeros.
- The response includes `meta.asOfDate` using the business date applied by the aggregation.

### 5.7 Detail semantics

- The lookup predicate contains both parsed order `_id` and authenticated `userId`.
- A valid but missing or foreign ObjectId returns the same `404 ORDER_NOT_FOUND` response.
- A malformed ObjectId returns `400` without querying MongoDB.
- Detail returns line items in ascending position order and embedded payments newest first.
- Existing seeded payments may be read, but Phase 4 exposes no endpoint that creates, changes, or deletes a payment.
- `displayId` is derived as `ORD-` plus the final eight ObjectId hexadecimal characters in uppercase.

### 5.8 Edit semantics

- `PATCH /orders/:orderId` is a full replacement of editable order fields, not a sparse merge.
- The request shape matches creation: customer, due date, and the complete ordered line-item array.
- The service calculates the proposed persisted fields before the write.
- One conditional update matches `_id`, authenticated `userId`, and `paymentCount: 0`.
- The update replaces customer fields, due date, line items, total, balance, and `updatedAt` together.
- A failed conditional update is diagnosed with one owned-order read:
  - absent or foreign → `404 ORDER_NOT_FOUND`;
  - positive payment count → `409 ORDER_LOCKED_AFTER_PAYMENT`.
- Phase 4 does not introduce edit versions, ETags, or generic last-write-wins conflict errors. `ORDER_CHANGED` is not emitted unless a concrete precondition protocol is separately designed and documented.

### 5.9 Delete semantics

- One `deleteOne` matches `_id`, authenticated `userId`, and `paymentCount: 0`.
- A failed delete is diagnosed as missing/foreign or payment-locked using the same non-leaking rules as edit.
- Successful deletion returns `204` with no body.
- There is no soft-delete or archive field.

## 6. Contract changes

Add an order-focused contracts module and re-export it from `packages/contracts/src/index.ts`.

### Request schemas

- `orderLineItemInputSchema`
- `createOrderRequestSchema`
- `replaceOrderRequestSchema`
- `orderListQuerySchema`
- `orderIdParameterSchema` or an equivalent boundary parser

Schemas are strict and expose API names, not MongoDB field names. Query coercion is explicit and rejects repeated/ambiguous values rather than accepting arbitrary arrays.

### Response contracts

- `OrderStatus`
- `OrderListItem`
- `OrderLineItem`
- `OrderPayment`
- `OrderDetail`
- `OrderSummary`
- `OrderListResponse`
- `OrderDetailResponse`
- `OrderSummaryResponse`
- Pagination and summary metadata types

The list and detail mappers return the same order-level values for the same stored document and business date.

### Error codes

Extend the shared error-code union with:

```text
ORDER_NOT_FOUND
ORDER_LOCKED_AFTER_PAYMENT
```

`VALIDATION_FAILED` covers invalid bodies, queries, and field bounds. Malformed ObjectIds use a stable structured 400 error code chosen consistently with the final API specification. `ORDER_CHANGED` remains reserved rather than emitted in Phase 4.

## 7. Implemented file map

```text
packages/contracts/src/
├── index.ts                  re-export public contracts
└── orders.ts                 order schemas and transport types

apps/api/src/modules/orders/
├── constants.ts             documented limits and allowlists
├── domain.ts                pure totals, status, date, and normalization helpers
├── mapper.ts                database document to list/detail response
├── query.ts                 allowlisted owned filters, projections, sorts, pipelines
├── validation.ts            Express/Zod boundary parsing and field-error mapping
├── service.ts               owned CRUD and summary operations
└── routes.ts                thin authenticated Express handlers

apps/api/tests/orders/
├── domain.test.ts
├── query.test.ts
└── orders.integration.test.ts
```

Route handlers remain thin, pure calculations do not depend on Express or MongoDB, and services use typed collection handles directly rather than a generic repository.

## 8. Implementation sequence

### Step 1 — Reconcile and extend contracts

1. Confirm bounds and public names against database validators.
2. Add strict request/query schemas and response types.
3. Add Phase 4 error codes.
4. Update API documentation if the final malformed-ID code or reserved `ORDER_CHANGED` behavior differs from the current draft.
5. Build and typecheck the contracts package before API work.

Gate: invalid extra properties, invalid query values, and unsafe numeric values fail at the schema boundary.

### Step 2 — Implement pure domain helpers

1. Add the limits in one source file.
2. Implement customer, search, and description normalization.
3. Implement semantic date-only validation and UTC date formatting.
4. Implement overflow-safe line and order-total calculation.
5. Implement status derivation and edit/delete flags.
6. Implement stable display-ID derivation.

Gate: exhaustive unit tests pass without Express or MongoDB.

### Step 3 — Implement mappers and query builders

1. Create one list mapper and one detail mapper sharing order-level derivation.
2. Build ownership-first status/search filters from allowlisted values.
3. Build deterministic sort specifications with `_id` tie-breaking.
4. Build list projection and pagination pipeline/query.
5. Build the account summary aggregation.
6. Capture one business date per operation and pass it explicitly.

Gate: unit tests prove status filter predicates agree with mapper serialization at due-yesterday, due-today, and due-tomorrow boundaries.

### Step 4 — Implement owned services

1. Create an order document from authenticated user context and calculated fields.
2. List owned orders and produce pagination metadata.
3. Aggregate owned summary values.
4. Fetch owned detail.
5. Replace an unpaid order through one conditional update.
6. Delete an unpaid order through one conditional delete.
7. Diagnose failed conditional writes without leaking foreign-resource existence.

Gate: no service method accepts browser-supplied owner, totals, status, payment state, or timestamps.

### Step 5 — Mount authenticated routes

Mount `/v1/orders` after the auth router and apply `createRequireAuthentication` to the router boundary.

Register static routes before parameterized routes:

```text
GET    /v1/orders/summary
GET    /v1/orders
POST   /v1/orders
GET    /v1/orders/:orderId
PATCH  /v1/orders/:orderId
DELETE /v1/orders/:orderId
```

Reuse the existing request context, origin enforcement, media-type checks, cache policy, request IDs, and terminal error handler.

Gate: unauthenticated requests return 401 before any order query executes.

### Step 6 — Add Atlas integration coverage

Tests use `MONGODB_TEST_URI` when configured and otherwise `MONGODB_URI`. Each suite creates a unique `*_test` database, applies real migrations, and drops only that generated database during teardown.

Use the public signup endpoint to obtain User A and User B cookies. Avoid bypassing authentication except where direct fixture insertion is required to establish a paid/locked document that Phase 4 cannot create through HTTP.

Gate: all API and database behavior is proven against MongoDB Atlas; no Docker or localhost fallback is introduced.

### Step 7 — Explain query plans and update documentation

1. Run representative default-list, customer-prefix, overdue, pending/partial, and summary queries.
2. Inspect `explain("executionStats")` for intended ownership-led indexes and blocking sorts.
3. Add an index only for a demonstrated query need; version it through a new migration.
4. Remove or correct planned indexes that the implemented queries do not use.
5. Update API, database, testing, requirements traceability, README status, roadmap status, and decision records.

Gate: documentation describes implemented behavior and no longer labels Phase 4 behavior as merely planned.

## 9. Required unit tests

### Money

- one line and multiple lines calculate exactly;
- maximum valid line/order values are accepted;
- overflow is rejected before unsafe multiplication/addition;
- zero, negative, fractional, non-safe, and above-limit values are rejected;
- caller-provided totals cannot enter the calculation path.

### Dates and status

- invalid shapes and impossible calendar dates are rejected;
- leap-day validity is covered;
- paid wins over an old due date;
- overdue applies only before today with positive balance;
- due today is pending with no payment and partially paid with payment progress;
- future dates produce pending/partial status correctly.

### Normalization and queries

- customer/search whitespace and case normalize deterministically;
- regex metacharacters are escaped and cannot alter query meaning;
- each status creates the documented stored-field predicate;
- every filter contains `userId`;
- public `totalAmount` maps only to `totalAmountCents`;
- invalid sort, direction, status, page, and page size values are rejected;
- all sorts include an ObjectId tie-breaker.

### Mappers

- list and detail order-level fields agree;
- line totals and item order are correct;
- payment history is newest first without mutating the stored array;
- display IDs and edit/delete flags are deterministic;
- persisted status or paid amount is never expected.

## 10. Required Atlas integration tests

### Authentication and ownership

- all six order endpoints reject missing/expired sessions;
- User A cannot list User B's orders;
- User A's summary excludes User B's values;
- foreign detail, edit, and delete return the same 404 as a missing order;
- a forged `userId` body/query field is rejected and has no effect.

### Creation and detail

- create stores server-generated item IDs/positions and exact calculated totals;
- create rejects client-authored totals, status, balance, payment state, and unknown fields;
- create rejects out-of-range and semantically invalid inputs;
- detail returns exact derived totals/status and complete embedded history;
- malformed IDs return structured 400 errors; missing valid IDs return 404.

### Listing

- default sort and pagination are deterministic with tied public sort values;
- all status filters match the status serialized for returned documents;
- due-today and past-due behavior uses a fixed business date;
- normalized anchored customer search works and regex-like input is literal;
- allowed sort/direction combinations behave correctly;
- page metadata and out-of-range pages are correct;
- line-item and payment arrays are absent from list projections.

### Summary

- empty account returns zeros;
- total, outstanding, collected, and overdue amounts reconcile exactly;
- paid past-due orders do not contribute overdue balance;
- another user's values never contribute;
- `asOfDate` matches the date used by status filtering.

### Edit and delete

- unpaid replacement recalculates and commits all coupled fields together;
- partial/sparse replacement bodies fail validation;
- a directly prepared paid order cannot be edited or deleted;
- failed locked writes leave the document byte-for-byte financially consistent;
- successful deletion removes only the authenticated user's unpaid target;
- conditional predicates include `_id`, `userId`, and `paymentCount: 0`.

### Query plans

- default owner/created-date listing uses `orders_user_created_at`;
- normalized customer-prefix listing uses `orders_user_customer_created_at` when compatible with the requested sort;
- representative due/status queries use an ownership-led index;
- summary begins with an owned match and does not scan other users' documents;
- any accepted blocking sort or collection scan is documented with its demo-scale tradeoff.

## 11. Error mapping

| Condition                              | HTTP | Code                         |
| -------------------------------------- | ---: | ---------------------------- |
| Missing/expired session                |  401 | `AUTHENTICATION_REQUIRED`    |
| Invalid body/query fields              |  422 | `VALIDATION_FAILED`          |
| Malformed ObjectId                     |  400 | Stable malformed-ID code     |
| Missing or foreign valid order         |  404 | `ORDER_NOT_FOUND`            |
| Edit/delete after any payment          |  409 | `ORDER_LOCKED_AFTER_PAYMENT` |
| Oversized JSON                         |  413 | `PAYLOAD_TOO_LARGE`          |
| Unsafe origin                          |  403 | `ORIGIN_NOT_ALLOWED`         |
| Unexpected MongoDB/application failure |  500 | `INTERNAL_SERVER_ERROR`      |

Raw MongoDB errors, filters, connection details, stack traces, and foreign-resource existence are never returned.

## 12. Verification commands

With an Atlas URI configured in `.env`:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

`pnpm test:integration` must report the Atlas order suite and must leave no generated `*_test` database behind. `pnpm db:migrate` is run separately against the intended development database only when Phase 4 adds or changes a versioned index/validator migration.

## 13. Completion criteria

Phase 4 is complete only when:

- all six order endpoints are implemented and authenticated;
- every database operation is ownership-scoped;
- totals are calculated only by overflow-safe integer helpers;
- status is derived consistently and never persisted;
- list filters and summary use the same captured UTC business date;
- list responses exclude embedded arrays while detail returns them intentionally;
- unpaid edit/delete use conditional same-document predicates;
- cross-user negative tests cover every resource surface;
- due-today, overdue, paid precedence, pagination, search, and sorting tests pass;
- representative Atlas query plans have been reviewed;
- formatting, lint, typecheck, unit, Atlas integration, and production builds pass;
- no Docker/local MongoDB path is reintroduced;
- focused documentation, traceability, roadmap, and README status are updated;
- Phase 5 payment behavior and Phase 7/8 UI behavior have not been implemented prematurely.

## 14. Risks and controls

| Risk                                  | Control                                                                |
| ------------------------------------- | ---------------------------------------------------------------------- |
| Money overflow                        | Pre-multiplication and pre-addition bounds plus unit tests             |
| Browser-authored financial truth      | Strict schemas and server-only calculated persistence fields           |
| Tenant data leakage                   | `userId` in every query/pipeline and cross-user integration matrix     |
| Status drift at midnight              | One injected UTC business date per operation                           |
| Regex/NoSQL injection                 | Strict scalar parsing, regex escaping, and server-built filters        |
| Unstable pagination                   | Allowlisted sort plus deterministic ObjectId tie-breaker               |
| Edit/delete racing future payments    | `paymentCount: 0` in the final MongoDB write predicate                 |
| List payload/document growth          | Projection excludes embedded arrays                                    |
| Unnecessary indexes                   | Atlas `executionStats` evidence before adding migrations               |
| Atlas test damage                     | Unique `*_test` databases, guarded teardown, and dedicated credentials |
| Phase creep into payments or frontend | Explicit exclusions and completion review against this plan            |

## 15. Handoff after completion

The Phase 4 handoff must report:

- implemented endpoints and shared contracts;
- exact domain limits and normalization behavior;
- Atlas databases/migrations touched without exposing connection details;
- unit and integration test counts;
- representative query-plan findings;
- any documented deviations from this plan;
- confirmation that Phase 5 has not begun.
