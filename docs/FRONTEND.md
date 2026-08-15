# Frontend Architecture

## Purpose

This document defines the frontend architecture for the Orders & Settlements dashboard. Phases 3 through 7 implement authentication, the responsive application shell, order detail and payment views, and the server-backed operational dashboard; order authoring remains planned for Phase 8.

## Technology choices

| Concern                 | Choice                                                           | Why                                                                                  |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Application framework   | Next.js with TypeScript                                          | Routing, layouts, production build pipeline, and deployment fit                      |
| Rendering               | App Router with client components at interactive boundaries      | Server-render the shell where useful while keeping dashboard interactions responsive |
| Server-state management | TanStack Query (React Query)                                     | Caching, request deduplication, mutations, invalidation, and request-state handling  |
| Forms                   | React Hook Form                                                  | Predictable form state without coupling it to server state                           |
| Validation              | Zod schemas shared by intent, not by importing backend internals | Consistent messages and typed parsing while preserving service boundaries            |
| Components              | Align UI primitives and patterns                                 | Coherent B2B dashboard visual language                                               |
| Styling                 | The approach required by Align UI                                | Avoid a second competing design system                                               |
| Dates                   | A lightweight date utility                                       | Explicit parsing and display of date-only values                                     |
| Money                   | Integer cents in data; `Intl.NumberFormat` for display           | No floating-point arithmetic                                                         |
| Tests                   | Vitest, Testing Library, and Playwright                          | Unit/component confidence plus critical journey coverage                             |

## Frontend responsibilities

The frontend owns:

- navigation, layout, and responsive presentation;
- URL-backed filters, search, sorting, and pagination;
- form interaction and immediate client-side validation;
- authenticated API requests and accessible error presentation;
- React Query cache lifecycle;
- rendering values returned by the API without redefining domain truth;
- clear empty, loading, success, and failure states.

The frontend does not own:

- authoritative totals, balances, or status calculation;
- authorization decisions;
- overpayment prevention;
- idempotency guarantees;
- direct database access;
- persistent client-side copies of server entities.

## Route map

| Route                    | Access        | Purpose                                            |
| ------------------------ | ------------- | -------------------------------------------------- |
| `/login`                 | Public        | Sign in                                            |
| `/register`              | Public        | Create an account, if registration remains enabled |
| `/`                      | Authenticated | Redirect to `/orders`                              |
| `/orders`                | Authenticated | Summary dashboard and filterable orders table      |
| `/orders/new`            | Authenticated | Create an order                                    |
| `/orders/[orderId]`      | Authenticated | Order detail, line items, payment history, actions |
| `/orders/[orderId]/edit` | Authenticated | Edit an unpaid order                               |

Not-found and unexpected-error views are required. Unauthorized requests route to login only after the shared authentication policy is applied.

Current route status:

- `/` redirects to `/orders`.
- `/login` and `/register` use public-only boundaries and redirect an authenticated viewer to `/orders`.
- `/orders` uses a client authentication boundary and renders the Phase 7 server-backed operational dashboard inside the responsive application shell.
- `/orders/[orderId]` renders order financials, line items, payment history, and the safe settlement flow.
- Product order creation, edit, and delete interfaces are not implemented yet.

## Component boundaries

```text
RootLayout
└── ApplicationProviders
    ├── QueryProvider
    ├── ToastProvider
    └── AuthBoundary
        └── DashboardLayout
            ├── Sidebar
            ├── Header
            └── Route content
                ├── OrdersPage
                │   ├── SummaryCards
                │   ├── OrdersToolbar
                │   └── OrdersTable
                └── OrderDetailPage
                    ├── OrderHeader
                    ├── FinancialSummary
                    ├── LineItemsTable
                    ├── PaymentHistory
                    └── RecordPaymentDialog
```

Route components coordinate data dependencies. Feature components render a bounded product concern. Generic UI primitives must not fetch data.

## Server state with React Query

React Query is the only general-purpose server-state layer. Do not duplicate API entities into Context, Redux, Zustand, Jotai, or ad hoc module state.

### Query client defaults

The implemented `QueryClient` uses deliberate defaults:

- queries retry transient failures at most twice;
- authentication and validation failures do not retry;
- stale time is 30 seconds;
- garbage collection is 5 minutes;
- refetch on window focus is enabled for order data;
- mutations do not retry automatically unless the operation is demonstrably idempotent;
- global mutation errors are not shown when a form already renders a precise field or form error.

These values remain subject to interaction testing as order queries are added.

### Query key factory

Keys must be created by a single feature-owned factory. They must include every input that changes a response.

```text
authKeys.all                 -> ["auth"]
authKeys.session()           -> ["auth", "session"]

orderKeys.all                -> ["orders"]
orderKeys.lists()            -> ["orders", "list"]
orderKeys.list(params)       -> ["orders", "list", normalizedParams]
orderKeys.details()          -> ["orders", "detail"]
orderKeys.detail(orderId)    -> ["orders", "detail", orderId]
orderKeys.summary(params)    -> ["orders", "summary", normalizedSummaryParams]
```

Rules:

- normalize absent filters consistently;
- never put unstable objects, dates, or functions into keys;
- keep list and detail prefixes invalidatable;
- scope all cached business data to the signed-in session by clearing the cache on logout or session loss;
- do not include secrets or raw session tokens in a key.

### Query catalogue

| Query             | Endpoint                      | Consumer              | Notes                                   |
| ----------------- | ----------------------------- | --------------------- | --------------------------------------- |
| Session           | `GET /api/v1/auth/me`         | Auth boundary         | Establishes viewer state                |
| Orders list       | `GET /api/v1/orders`          | Orders dashboard      | Keyed by URL-derived filters and page   |
| Dashboard summary | `GET /api/v1/orders/summary`  | Summary cards         | Keyed by any applicable filter scope    |
| Order detail      | `GET /api/v1/orders/:orderId` | Detail and edit pages | Includes line items and payment history |

### Mutation catalogue and cache effects

| Mutation       | On success                                                                      | Optimism policy                                                      |
| -------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Login          | Set session data; invalidate protected queries                                  | No optimistic login                                                  |
| Logout         | Clear the entire query cache and route to login                                 | Immediate local transition is acceptable only with rollback handling |
| Create order   | Seed detail cache when response is complete; invalidate all lists and summaries | No optimistic create                                                 |
| Update order   | Replace detail response; invalidate lists and summaries                         | No optimistic financial changes                                      |
| Delete order   | Remove detail cache; invalidate lists and summaries; navigate after success     | No optimistic delete                                                 |
| Record payment | Replace or invalidate detail; invalidate all lists and summaries                | Never optimistic because concurrency can reject the payment          |

Payment mutation results must come from the committed server response. The UI must not locally subtract a payment from a balance before commit.

Phase 5 implementation provides the first concrete order query-key factory, account summary/recent-order reads, order detail, and payment mutation. The dialog retains a UUID for the same normalized logical attempt, creates a new key when the form materially changes, never retries automatically, and invalidates detail/list/summary keys only after a committed response.

Phase 6 adds the local presentation foundation: Tailwind CSS utilities, Radix behavior, Remix icons, and focused Align UI-style button, input, modal, badge, alert, and skeleton primitives. The shell, auth screens, dashboard, detail view, and settlement modal use those primitives consistently.

Phase 7 makes the API authoritative across the complete owned dataset. Applied customer search, status, sort, direction, page, and page size are parsed from a canonical default-free URL and included as stable primitives in every list query key. Requests serialize all values explicitly, propagate cancellation, and retain previous rows during transitions. The dashboard exposes debounced customer-prefix search, allowlisted sorting, 10/25/50 row sizes, authoritative ranges, malformed/out-of-range URL recovery, and distinct initial, updating, empty, filtered-empty, and error states. Account summary cards remain intentionally unfiltered because the existing summary endpoint is account-wide.

### Invalidation strategy

Prefer targeted invalidation by key prefix:

- any order write invalidates `orderKeys.lists()` and the relevant detail;
- any payment invalidates lists, summaries, and that order detail;
- authentication boundary changes clear all user-scoped data;
- do not invalidate the entire cache for routine order mutations;
- if the API returns a complete canonical entity, set it directly before invalidating broader aggregates.

### Cancellation and race handling

- API calls accept the `AbortSignal` provided by React Query.
- A superseded filter request should be cancellable.
- A page must render only data associated with its current query key.
- Mutation controls remain disabled while that same action is pending.
- Double-click protection is a UI courtesy; MongoDB atomic-write predicates and idempotency remain authoritative.

### SSR and hydration

The implementation may prefetch session or initial list data on the server if doing so does not weaken cookie handling or create duplicated request logic. If hydration is used:

- create a query client per server request;
- dehydrate only safe data;
- never serialize cookies, password data, or session tokens;
- use the identical query key and fetcher on server and client;
- prefer a simple client query over premature SSR complexity when it does not materially improve the assignment.

## API client

A single typed API client owns:

- the API base path;
- JSON serialization and parsing;
- `credentials: "include"`;
- CSRF header attachment when required;
- request IDs if the server accepts them;
- conversion of non-2xx responses into a typed `ApiError`;
- cancellation signals.

Feature hooks call the client. Components must not scatter raw `fetch` calls.

The client must preserve structured backend error data: `code`, `message`, optional `fieldErrors`, and request identifier. It must not turn every failure into a generic exception.

## Authentication state

Authentication is server state. The session query has three meaningful states:

1. pending: render a stable application-shell skeleton;
2. authenticated: render protected content;
3. unauthenticated: clear private cached data and route to login.

A `401` from a protected endpoint triggers one centralized session-loss path. Avoid a refresh storm or multiple competing redirects.

The implemented authentication client uses `/api/v1` as its same-origin base, sends credentials, parses structured API errors, and accepts React Query cancellation signals. Login and signup seed the session cache; logout clears the entire query cache before navigating to login. No raw session token is readable by JavaScript.

## URL state and local state

The orders page stores shareable state in search parameters:

- `status`;
- `search`;
- `sort` and `direction`;
- `page` and `pageSize`;
- optional due-date range if implemented.

Transient presentation state stays local:

- whether a dialog is open;
- current tab if it is not intended to be shareable;
- unsaved form values;
- a menu's open state.

Changing a filter resets pagination to page 1. Search input should be debounced, while the URL remains the canonical applied value.

## Forms

Order forms use a field array for line items. Every form supports:

- accessible labels and descriptions;
- inline field errors;
- a form-level server error;
- pending state and duplicate-submit prevention;
- unsaved-change protection for navigation;
- deterministic focus on the first invalid field.

Line item rules mirror, but do not replace, server validation. Quantity and unit price inputs are converted into the exact request representation at the API boundary. Totals shown before submission are previews only; the server response is authoritative.

The payment form shows the current server-provided balance, accepts an amount no greater than that balance, sends an idempotency key, and handles a conflict response by closing or preserving the dialog appropriately and refreshing the order.

## Rendering money, dates, and status

- Keep money as integer cents in query data and transformations.
- Format USD with `Intl.NumberFormat` in a centralized utility.
- Never parse formatted currency strings for calculations.
- Treat `dueDate` as a date-only value and avoid timezone-shifting it.
- Treat `paymentDate` as a date-only value; treat timestamps such as `createdAt` as instants and display them in the viewer's locale.
- Render status exactly from API values; do not calculate overdue status from the browser clock.

## Loading, empty, and error states

Every asynchronous surface defines all states:

- initial load uses layout-matched skeletons;
- background refresh preserves existing data and uses a subtle indicator;
- an empty dataset explains the product and offers Create Order;
- an empty filter result offers Clear Filters;
- a recoverable query failure offers Retry;
- `404` order detail renders a not-found state;
- state-dependent mutation failures such as `409` conflicts or `422 PAYMENT_EXCEEDS_BALANCE` explain that server state changed and trigger refresh;
- destructive-action failures do not navigate away.

## Accessibility

- All functions are keyboard accessible.
- Dialogs trap focus and return it to the trigger.
- Status is conveyed with text, not color alone.
- Tables have proper headers and row actions have accessible names.
- Validation errors are associated with inputs and announced.
- Focus indicators remain visible.
- Motion respects reduced-motion preferences.
- Color contrast targets WCAG 2.1 AA.

## Performance constraints

- Keep client-component boundaries narrow.
- Paginate server-side rather than loading all orders.
- Avoid redundant list and summary fetches through stable keys.
- Do not prefetch every order detail from a large table.
- Prefetch a detail route only on deliberate hover/focus if measurement justifies it.
- Memoization follows measured need, not habit.

## Frontend testing contract

At minimum, tests cover:

- query key normalization;
- API error parsing;
- currency and date formatting;
- dashboard loading, empty, error, and populated states;
- URL filter behavior;
- line-item form validation;
- payment mutation state-change and overpayment handling;
- logout cache clearing;
- full create-order and partial-payment journeys in Playwright.

Mock Service Worker is preferred for component-level API behavior so tests exercise the same fetch boundary as production.

## Explicitly deferred

- offline mutations;
- persistent browser cache;
- WebSockets or live subscriptions;
- optimistic financial writes;
- multiple currencies;
- a separate global state library;
- complex charts without decision-making value.
