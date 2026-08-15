# Phase 7 Implementation Plan — Dashboard and React Query Integration

## 1. Purpose

This is the execution plan for Phase 7. It freezes the URL-state model, React Query keys, API-client changes, dashboard behavior, pagination rules, test coverage, implementation order, and completion gates before code changes begin.

Status: complete (2026-08-15).

## 2. Objective

Turn the Phase 6 dashboard from a polished view over one fixed API request into the authoritative operational interface for the complete owned-order dataset.

An authenticated user must be able to:

- filter orders by server-derived status;
- search the server-backed customer-name index;
- select an allowlisted sort and direction;
- paginate with 10, 25, or 50 rows per page;
- copy, refresh, and revisit a URL without losing applied dashboard state;
- see stable previous results while a new query is loading;
- distinguish initial loading, background fetching, unfiltered empty, filtered empty, and failure states;
- open an order through real links;
- see account-wide summary values that remain consistent with the existing summary API.

Phase 7 consumes the existing Phase 4 list/summary APIs and the Phase 6 visual foundation. No backend behavior is expected to change.

## 3. Scope boundary

### Included

- Canonical parsing and serialization of dashboard URL parameters.
- Server-backed status, search, sort, direction, page, and page-size state.
- A typed parameterized order-list API call.
- Stable React Query key factories containing every server-affecting list parameter.
- AbortSignal propagation and cancellation of superseded list requests.
- Previous-data preservation during list transitions.
- Debounced customer search.
- Accessible sorting and pagination controls.
- Result range and total-count presentation.
- Initial, fetching, empty, filtered-empty, invalid-page, and error states.
- Focused pure tests for URL normalization and query-key behavior.
- Browser verification at desktop and narrow layouts.
- Documentation updates after implementation.

### Excluded

- Create Order, edit, delete, and dynamic line-item forms; these are Phase 8.
- Further payment-flow redesign; the current safe payment flow remains operational and Phase 9 owns final hardening.
- Changes to MongoDB schemas, validators, indexes, order status, or list endpoint semantics.
- Client-side filtering of a partially loaded page.
- Search by derived display ID. The implemented API search contract is a normalized customer-name prefix, so the UI must say “Search customers” rather than promise order-ID search.
- Charts, trend claims, bulk actions, export, saved views, and advanced date filters.
- SSR prefetching or React Query hydration unless implementation exposes a measured need.
- Full component and end-to-end automation infrastructure; broader frontend hardening remains Phase 10.

No placeholder Create Order button or nonfunctional row menu is added in this phase.

## 4. Authoritative inputs

Implementation must remain consistent with:

1. `packages/contracts/src/orders.ts` for list parameter values and response metadata.
2. `docs/API.md` for list and summary endpoint behavior.
3. `docs/FRONTEND.md` for query keys, invalidation, URL state, cancellation, and loading rules.
4. `docs/UI_UX.md` for dashboard hierarchy, desktop tables, mobile rows, and accessibility.
5. `docs/DOMAIN_RULES.md` for server-authored money and status values.
6. `docs/TESTING.md` for frontend and browser verification expectations.
7. `AGENTS.md` and `apps/web/AGENTS.md` for repository and Next.js constraints.

If implementation reveals a conflict, update the relevant source-of-truth document before silently changing behavior.

## 5. Existing foundation

Phase 7 starts with these implemented pieces:

- `QueryProvider` with bounded retry, 30-second stale time, and five-minute garbage collection.
- A typed same-origin API client with structured `ApiError` parsing and request cancellation.
- `OrderListQuery`, allowlisted sort/filter values, and `OrderListResponse.meta` contracts.
- `GET /api/v1/orders` supporting status, customer prefix, sort, direction, page, and page size.
- `GET /api/v1/orders/summary` returning account-wide totals.
- React Query list, summary, detail, and payment hooks.
- A responsive dashboard, status controls, search input, desktop table, and mobile order rows.
- Payment mutation invalidation of detail, list, and summary prefixes.

The current limitations to remove are:

- `getOrders` sends one hard-coded `pageSize=50` request;
- `orderKeys.list()` has no parameters;
- status and search are ephemeral component state;
- filtering is performed against only the loaded page;
- sort, pagination, result ranges, and shareable URL state are absent;
- the search placeholder claims order-ID support that the API does not implement.

## 6. Frozen Phase 7 behavior

### 6.1 Canonical dashboard state

The canonical state shape is the existing `OrderListQuery`:

```text
status:    all | pending | partially_paid | paid | overdue
search:    normalized string or absent
sort:      createdAt | dueDate | totalAmount
direction: asc | desc
page:      positive integer
pageSize:  10 | 25 | 50
```

Defaults:

```text
status=all
search absent
sort=createdAt
direction=desc
page=1
pageSize=10
```

Canonical URLs omit values equal to these defaults. Examples:

```text
/orders
/orders?status=overdue
/orders?search=acme
/orders?sort=dueDate&direction=asc&pageSize=25
/orders?status=partially_paid&page=2
```

Rules:

- Only known parameters participate in dashboard state.
- Repeated known parameters, invalid enum values, unsafe page numbers, and unsupported page sizes normalize to defaults.
- Search is trimmed, internal whitespace is collapsed, and an empty result is omitted.
- Search is bounded to the contract maximum before it reaches the API.
- Default values are removed during serialization to avoid multiple URLs representing the same state.
- The UI must never calculate status or money from the browser clock or formatted strings.

### 6.2 URL update policy

- The URL is the canonical applied state.
- Search input keeps a local draft so typing remains immediate.
- A 300 ms debounce applies the normalized search draft to the URL.
- Search updates use `router.replace` so typing does not flood browser history.
- Status, sort, direction, page, and page-size updates also use `router.replace` for one stable dashboard location.
- Any status, search, sort, direction, or page-size change resets `page` to 1.
- Pagination changes only `page`.
- Existing unrelated URL parameters are not preserved; `/orders` owns its documented query surface.
- Back/forward navigation updates the input draft from the URL without a competing delayed write.

URL writes must preserve keyboard focus and must not scroll the dashboard to the top unless the user changes page. Page changes may move focus to the orders heading after the new result commits.

### 6.3 List request serialization

`getOrders` accepts a normalized `OrderListQuery` plus an optional `AbortSignal`.

It builds its query string with `URLSearchParams` and sends every parameter explicitly to the API, including defaults. URL omission is a browser-canonicalization concern; request serialization remains explicit for easier debugging and deterministic tests.

No component constructs raw list URLs.

### 6.4 Query keys

The query-key factory becomes:

```text
orderKeys.all
  -> ["orders"]

orderKeys.lists()
  -> ["orders", "list"]

orderKeys.list(params)
  -> [
       "orders",
       "list",
       params.status,
       params.search ?? "",
       params.sort,
       params.direction,
       params.page,
       params.pageSize
     ]

orderKeys.summaries()
  -> ["orders", "summary"]

orderKeys.detail(orderId)
  -> ["orders", "detail", orderId]
```

Every server-affecting list value appears once as a stable primitive. No mutable object, `URLSearchParams`, function, date, viewer value, or secret enters a key.

Prefix invalidation remains valid:

- payment success invalidates `orderKeys.lists()`;
- summary invalidation remains `orderKeys.summaries()`;
- the affected detail remains `orderKeys.detail(orderId)`;
- logout clears the complete query cache.

### 6.5 Query transition behavior

The list query uses React Query’s `keepPreviousData` placeholder behavior.

- Initial request: show layout-matched table/card skeletons.
- Parameter transition with cached or previous data: preserve the existing rows and show a subtle “Updating orders…” indicator.
- `AbortSignal` cancels a superseded request where supported by `fetch`.
- Controls continue to reflect the new URL while previous rows are temporarily visible.
- While placeholder data is visible, Next Page is disabled because its metadata may describe the previous query.
- A failed transition keeps the existing rows visible when React Query supplies them and presents a recoverable inline error.
- A committed response replaces rows and pagination metadata atomically from the component’s perspective.

There is no optimistic financial manipulation.

### 6.6 Search behavior

- Search is customer-name prefix search because that is the implemented API contract.
- Placeholder: `Search customers`.
- Search term is represented in the URL only after debounce.
- Clearing the input removes `search` and resets page to 1.
- Escape clears a non-empty focused search field.
- A clear icon/button has an accessible name.
- Search does not scan the current response in memory.
- Searching for display IDs is not silently approximated.

### 6.7 Status filtering

- The existing All, Pending, Partially paid, Paid, and Overdue controls remain.
- Applied state comes from the URL, not component-local status state.
- Controls retain `aria-pressed` and visible focus.
- Changing status resets page to 1.
- Status values and labels use the existing shared contract and formatter.

### 6.8 Sorting

Expose one compact sort control with these user-facing choices:

| Label              | `sort`        | `direction` |
| ------------------ | ------------- | ----------- |
| Newest first       | `createdAt`   | `desc`      |
| Oldest first       | `createdAt`   | `asc`       |
| Due date: soonest  | `dueDate`     | `asc`       |
| Due date: latest   | `dueDate`     | `desc`      |
| Total: low to high | `totalAmount` | `asc`       |
| Total: high to low | `totalAmount` | `desc`      |

The select/control has an accessible label and displays the active choice. This avoids implying that unsupported columns such as customer or balance are sortable.

Changing sorting resets page to 1.

### 6.9 Pagination

The API response metadata is authoritative:

```text
page
pageSize
totalItems
totalPages
```

The dashboard shows:

- `0 orders` when no results exist;
- `1–10 of 38 orders` for a populated page;
- Previous and Next controls;
- current page and total pages when total pages are non-zero;
- page-size choices 10, 25, and 50.

Rules:

- Previous is disabled on page 1.
- Next is disabled on the last page, with zero results, or while placeholder metadata is displayed.
- Page-size changes reset page to 1.
- A URL page beyond the final page may receive the documented empty response. When `totalPages > 0` and requested `page > totalPages`, the client canonically replaces `page` with `totalPages` once, preventing an empty dead end.
- The mobile view uses the same controls and metadata without requiring horizontal scrolling.
- Pagination controls use buttons because they update the current dashboard state; order navigation remains real links.

### 6.10 Summary behavior

The Phase 4 summary endpoint is account-wide and does not accept list parameters. Therefore:

- filtering, search, sorting, and pagination do not change the summary query key;
- summary cards continue to represent the full authenticated account;
- card copy must not imply that values describe only the filtered result set;
- list fetch failures do not blank a successful summary;
- payment success continues to invalidate both list prefixes and the account summary.

### 6.11 Empty and error states

Unfiltered empty state:

- shown only when `totalItems === 0` and no search/status filter is active;
- explains that no orders exist yet;
- does not add a nonfunctional Create Order button before Phase 8.

Filtered empty state:

- shown when `totalItems === 0` and search or status is active;
- summarizes the applied search/status where practical;
- offers Clear filters, which restores canonical defaults and page 1.

Errors:

- initial list failure replaces the table body with Retry;
- background/transition failure keeps stable prior content where available and shows an inline alert;
- retry calls React Query `refetch` for the current canonical key;
- messages remain customer-safe and do not expose internal codes or stack traces.

## 7. Planned file map

```text
apps/web/
├── app/orders/page.tsx
├── components/orders/
│   ├── orders-dashboard.tsx       dashboard composition
│   ├── orders-toolbar.tsx         status, search, and sorting controls
│   ├── orders-pagination.tsx      result range and paging controls
│   └── orders-results.tsx         desktop table/mobile rows and states
├── components/ui/
│   └── select.tsx                 focused local Align UI-style select if required
├── features/orders/
│   ├── api.ts                     parameterized list serialization
│   ├── list-state.ts              pure parse/normalize/serialize helpers
│   ├── list-state.test.ts         pure URL-state tests
│   ├── queries.ts                 parameterized key and query hook
│   └── query-keys.test.ts         stable-key/invalidation-prefix tests
└── lib/
    └── use-debounced-value.ts     small reusable debounce hook if justified
```

The final split should follow cohesion rather than file-count targets. Components should be extracted when they own distinct state or rendering rules, not merely to shorten files.

No API, contract, database, or migration file should need a behavior change in Phase 7.

## 8. Implementation sequence

### Step 1 — Add pure dashboard-state helpers

1. Define the canonical default state using `OrderListQuery`.
2. Parse only known values from `ReadonlyURLSearchParams` or a framework-neutral adapter.
3. Detect repeated known parameters.
4. Normalize search and invalid values.
5. Serialize state while omitting defaults.
6. Add helpers for resetting page on non-page changes.
7. Add result-range calculation.

Gate: parse → serialize → parse is stable, invalid URLs produce safe defaults, and no Next.js runtime is required by the pure core.

### Step 2 — Parameterize API calls and query keys

1. Change `getOrders` to accept normalized parameters and `AbortSignal`.
2. Serialize all list parameters through `URLSearchParams`.
3. Change `orderKeys.list` to accept the complete canonical state.
4. Change `useOrders` to accept that state.
5. Add `keepPreviousData` placeholder behavior.
6. Preserve list-prefix invalidation used by payments.

Gate: two states that change any server parameter produce different keys; equivalent canonical states produce identical keys.

### Step 3 — Bind dashboard controls to the URL

1. Read applied state with Next.js `useSearchParams`.
2. Keep only the search draft as ephemeral local state.
3. Debounce and normalize search before replacing the URL.
4. Bind status controls to applied URL state.
5. Add the allowlisted sort control.
6. Reset page for every non-page list change.
7. Prevent stale debounce writes after browser navigation or control resets.

Gate: copying or refreshing any valid dashboard URL restores the same controls and request.

### Step 4 — Render authoritative results and pagination

1. Remove `useMemo` client-side status/search filtering.
2. Render `orders.data.data` directly as the authoritative current response.
3. Add result count/range from `meta`.
4. Add Previous, Next, page display, and page-size controls.
5. Correct out-of-range pages after an authoritative response.
6. Preserve desktop table and mobile card rendering.
7. Keep all order navigation as real links.

Gate: pagination never relies on loaded-array length to infer total results.

### Step 5 — Complete transition and state UX

1. Distinguish initial pending from background/placeholder fetching.
2. Keep rows stable during parameter transitions.
3. Add a subtle live updating indicator.
4. Split unfiltered and filtered empty states using canonical state plus response metadata.
5. Add Clear filters and search clear controls.
6. Keep successful summary cards independent from list state.
7. Ensure errors have current-key Retry behavior.

Gate: the dashboard never blanks stable data solely because the user changed a filter or page.

### Step 6 — Add focused tests

1. Configure the smallest web Vitest setup needed for pure TypeScript tests, without DOM emulation.
2. Test canonical defaults and omitted-default serialization.
3. Test every enum and page-size value.
4. Test repeated, invalid, empty, and overlong query values.
5. Test page reset behavior.
6. Test every list parameter’s effect on query keys.
7. Test list-prefix invalidation compatibility.
8. Test result-range calculations and out-of-range correction conditions.

Gate: pure tests pass under the root `pnpm test` command. Component and Playwright suites remain Phase 10 work.

### Step 7 — Browser verification and documentation

1. Use owned reviewer data covering all statuses and more than one page.
2. Verify refresh and copied-URL restoration.
3. Verify debounce and request cancellation behavior.
4. Verify sorting, page boundaries, page-size reset, and out-of-range correction.
5. Verify browser back/forward cannot be overwritten by a stale debounce.
6. Verify desktop table and narrow mobile rows.
7. Verify keyboard operation, focus visibility, status text, and live update announcements.
8. Verify payment completion invalidates the active filtered list and account summary.
9. Remove temporary QA records.
10. Update roadmap, frontend, testing, README, and repository guidance with the implementation result.

Gate: no browser console errors and no mismatch between URL, controls, query key, request parameters, and rendered response.

## 9. Required pure tests

### Parsing and canonicalization

- empty parameters produce exact defaults;
- each valid status, sort, direction, page, and page size is accepted;
- invalid and repeated known values normalize safely;
- empty/whitespace search is omitted;
- search whitespace collapses deterministically;
- overlong search is bounded or rejected according to the selected helper contract before an API request;
- default state serializes to `/orders` with no query string;
- serialization order is deterministic;
- parse/serialize round trips remain stable.

### State transitions

- status change resets page;
- applied search change resets page;
- sort/direction change resets page;
- page-size change resets page;
- page-only change preserves every other applied value;
- Clear filters restores exact defaults.

### Query keys and requests

- every server-affecting value changes the list key;
- equivalent normalized searches yield the same key;
- all list keys share the `orderKeys.lists()` prefix;
- summary and detail keys remain unaffected;
- request serialization includes all normalized parameters;
- values are URL encoded and no raw query concatenation is used.

### Pagination helpers

- zero results produce a zero range;
- first, middle, partial-final, and full-final pages calculate correctly;
- an out-of-range page correction happens only when `totalPages > 0`;
- placeholder metadata cannot enable forward navigation.

## 10. Required browser scenarios

### URL restoration

1. Open an overdue-filtered URL directly.
2. Confirm the Overdue control is selected.
3. Confirm the outgoing request contains `status=overdue`.
4. Refresh and confirm state remains unchanged.
5. Copy the URL into a fresh tab and confirm the same response state.

### Search and cancellation

1. Type a customer prefix quickly.
2. Confirm the draft updates immediately.
3. Confirm only the debounced applied value enters the URL.
4. Change the search before the previous request completes.
5. Confirm stale results do not replace the current query.
6. Clear search with both the clear control and Escape.

### Sorting and pagination

1. Exercise all six sort choices.
2. Confirm sort and direction are reflected in the URL and request.
3. Move forward and backward across at least two pages.
4. Change page size and confirm page resets to 1.
5. Open a deliberately excessive page and confirm canonical correction.
6. Confirm result ranges match API metadata.

### Cache invalidation

1. Open a filtered list containing a partially paid order.
2. Record a valid payment on its detail page.
3. Return to the dashboard URL.
4. Confirm the active list and account summary refetch.
5. Confirm a status transition removes the order from a now-inapplicable filtered result.

### Accessibility and responsive behavior

1. Operate search, status, sorting, pagination, order links, and navigation with the keyboard.
2. Confirm visible focus and useful accessible names.
3. Confirm updating state is announced without taking focus.
4. Confirm desktop uses the table and narrow view uses mobile order cards.
5. Confirm pagination and filters remain usable without horizontal page scrolling.

## 11. Verification commands

Run from the repository root:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm build
```

If Phase 7 adds a web test script, `pnpm test` must execute it through the workspace runner.

Backend integration tests do not need to be rerun for a frontend-only implementation unless API or shared validation behavior changes. The existing Atlas suite remains the regression authority for list semantics and payment concurrency.

## 12. Completion criteria

Phase 7 is complete only when:

- the URL is the canonical applied dashboard state;
- every server-affecting list parameter is represented in the query key;
- the browser sends typed, explicit, parameterized list requests;
- client-side filtering of the loaded page has been removed;
- superseded requests are cancellable and cannot replace current-key results;
- previous data remains visible during list transitions;
- search, status, sorting, page, and page size work against the full server dataset;
- result range and pagination controls match API metadata;
- account-wide summary semantics remain unchanged and clearly communicated;
- initial, background-fetch, unfiltered-empty, filtered-empty, invalid-page, and error states are distinct;
- payment invalidation refreshes the active list prefix and summary;
- pure URL/key/pagination tests pass;
- keyboard and responsive browser scenarios pass;
- no Phase 8 create/edit/delete implementation or placeholder action has been introduced;
- all verification commands pass;
- source-of-truth documentation records the final implemented behavior.

## 13. Handoff to Phase 8

Phase 7 should leave Phase 8 with:

- a stable dashboard URL contract;
- parameterized list queries and predictable invalidation prefixes;
- a reusable toolbar and pagination composition;
- trustworthy server-backed result metadata;
- real order-detail links that preserve a natural return path;
- no fake Create Order, edit, or delete action that Phase 8 must later unwind.

Phase 8 can then add create/edit/delete workflows without redesigning dashboard data flow.

## 14. Implementation result

Completed on 2026-08-15. The delivered implementation follows the frozen URL, query-key, request, transition, pagination, summary, and scope boundaries above. The final component split keeps desktop and mobile result rendering with the dashboard because it owns no independent state; the toolbar, pagination, select primitive, pure URL helpers, request serializer, and query-key factory are separated by responsibility.

Twelve focused Vitest cases and all repository static/build gates pass. Live desktop and 390 px browser verification covered pagination, debounce, filters, sorting, URL canonicalization, excessive-page recovery, mobile navigation/cards, and payment-driven cache invalidation. The exact disposable Atlas account, two sessions, and 12 orders created for verification were removed after the run.
