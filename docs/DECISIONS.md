# Architecture Decision Record

## How to use this document

This is the compact log of decisions that should not be silently revisited during implementation. A change is allowed, but it must update the affected specifications and add a new decision entry explaining the reason and consequences.

Status values are `Accepted`, `Proposed`, `Superseded`, or `Deferred`.

## ADR-001: TypeScript across the application

- Status: Accepted
- Decision: Use TypeScript for the Next.js frontend, Express backend, shared contract package, scripts, and tests.
- Rationale: One language reduces handoff friction while strict types improve API and money-shape consistency.
- Consequences: Strict compiler settings are expected. Runtime validation remains mandatory because TypeScript does not validate network input.

## ADR-002: pnpm workspace monorepo

- Status: Accepted
- Decision: Organize `apps/web`, `apps/api`, and narrow shared packages in a pnpm workspace.
- Rationale: The product is one submission with two deployable applications and a small set of shared contracts/configuration.
- Consequences: Each application retains clear boundaries. Shared packages cannot become a place to import API persistence internals into the browser.

## ADR-003: Next.js frontend and Express backend

- Status: Accepted
- Decision: Use Next.js for the web app and an independently structured Express service for `/api/v1`.
- Rationale: This meets the requested stack while demonstrating explicit backend architecture rather than hiding domain logic in frontend route handlers.
- Consequences: Authentication, CORS/CSRF, builds, and deployment must work across two application boundaries.

## ADR-004: PostgreSQL with Prisma

- Status: Superseded by ADR-022
- Decision: Use PostgreSQL as the source of truth and Prisma for schema, migrations, and ordinary queries.
- Rationale: The domain requires transactions, constraints, indexes, and row-level locking.
- Consequences: The payment path may use parameterized raw SQL for `SELECT ... FOR UPDATE` because the concurrency guarantee is more important than avoiding all raw SQL.

## ADR-005: Integer cents and fixed USD currency

- Status: Accepted
- Decision: Represent every stored and transported monetary amount as an integer number of cents. MVP currency is USD.
- Rationale: Integer arithmetic avoids binary floating-point errors and keeps validation clear.
- Consequences: Inputs need explicit decimal-to-cent parsing. Multi-currency behavior is out of scope and cannot be implied by merely adding a currency symbol.

## ADR-006: Materialize order total and balance

- Status: Accepted
- Decision: Store immutable `totalAmountCents` and atomically maintained `balanceDueCents` on the order.
- Rationale: This makes the order document the atomic consistency boundary for payments and makes summary/list reads efficient.
- Consequences: Application writes must preserve `total = payment sum + balance`. Reconciliation tests and optional operational queries are required.

## ADR-007: Derive order status

- Status: Accepted
- Decision: Do not persist an order status column. Derive it from total, balance, payment progress, due date, and a server-defined current date.
- Rationale: Persisted overdue status becomes stale as time passes and duplicates financial truth.
- Consequences: API list/detail/summary queries need one consistent status expression. Browser clocks do not define status.

## ADR-008: Lock the order row for all competing writes

- Status: Superseded by ADR-023
- Decision: Payment insertion, order update, and order deletion acquire the same order row lock inside short transactions before evaluating write rules.
- Rationale: It prevents payment-vs-payment and first-payment-vs-edit/delete races from violating invariants.
- Consequences: Transactions must remain short, use a real PostgreSQL connection, and be tested with independent concurrent connections.

## ADR-009: Payments are append-only

- Status: Accepted
- Decision: Once committed, a payment cannot be edited or deleted in the MVP.
- Rationale: Mutable payment history weakens auditability and complicates the balance invariant.
- Consequences: Corrections would require an explicit reversal/refund model in a future version; database records must not be manually rewritten through normal APIs.

## ADR-010: Lock an order after its first payment

- Status: Accepted
- Decision: Customer data, due date, and line items can be edited only while the order has no payments. Deletion follows the same rule.
- Rationale: Changing the economic basis after settlement begins creates ambiguous history and more complex adjustment semantics.
- Consequences: The UI explains the lock, but the API transaction enforces it. Future changes need versioning or credit/reversal concepts.

## ADR-011: Idempotent payment creation

- Status: Accepted
- Decision: Each payment request carries an idempotency key and stores enough request identity to safely replay the original result.
- Rationale: Users and networks retry. Duplicate financial writes must be prevented independently of button disabling.
- Consequences: Reuse with a different payload is a conflict. Key scope, retention, and database uniqueness are part of the schema/API contract.

## ADR-012: Opaque database-backed sessions

- Status: Accepted
- Decision: Authenticate with a random opaque session token in an HttpOnly cookie and store only its hash.
- Rationale: Server-side revocation and expiry are straightforward, and the MVP does not need stateless cross-service identity.
- Consequences: Every authenticated request performs or caches a session lookup. Logout and session expiry are authoritative at the server.

## ADR-013: React Query for frontend server state

- Status: Accepted
- Decision: Use TanStack Query (React Query) for session, order lists, summaries, details, and mutations.
- Rationale: It supplies caching, deduplication, request states, cancellation, mutation orchestration, and targeted invalidation.
- Consequences: API entities are not duplicated into another global state library. Query keys and invalidation rules are treated as architecture, not component details.

## ADR-014: No optimistic financial mutations

- Status: Accepted
- Decision: Order creation/update and especially payment recording wait for a committed server response before showing canonical financial state.
- Rationale: Concurrent writes can validly reject a request, and displaying an uncommitted balance is misleading.
- Consequences: Pending feedback must be excellent. Successful responses may seed caches before targeted invalidation.

## ADR-015: URL is the source of truth for dashboard filters

- Status: Accepted
- Decision: Search, status, sort, direction, and pagination live in URL search parameters.
- Rationale: Filtered views become refresh-safe, linkable, and testable.
- Consequences: Parameters require normalization and validation at both frontend and API boundaries.

## ADR-016: Align UI as the visual foundation

- Status: Accepted
- Decision: Use Align UI components and conventions for the dashboard rather than assembling an unrelated component system.
- Rationale: It provides a polished and consistent visual baseline while leaving room for product-specific composition.
- Consequences: Implementation must check accessibility and responsive behavior rather than assuming the library handles every product state.

## ADR-017: Same-origin browser API path

- Status: Accepted
- Decision: Present the deployed API to the browser under the web application's `/api` path through platform routing/rewrite.
- Rationale: It simplifies secure cookie behavior and reduces CORS complexity.
- Consequences: Hosting configuration must preserve headers, cookies, request bodies, and error responses. The Express service remains separately testable.

## ADR-018: Server-side pagination and aggregation

- Status: Accepted
- Decision: Lists are filtered, sorted, and paginated in the database; dashboard totals come from a dedicated summary query.
- Rationale: Loading all orders into the browser is not credible and makes summaries dependent on the current page. MongoDB aggregation and projections keep these operations server-side.
- Consequences: API parameters, indexes, and consistent snapshot expectations need explicit tests.

## ADR-019: Date-only due dates

- Status: Accepted
- Decision: Store and transport `dueDate` as a date-only value; timestamps remain UTC instants.
- Rationale: A contractual due day is not a moment in time and should not shift with browser timezone conversion.
- Consequences: The server defines the business date used for overdue status. The client formats date-only values without parsing them as UTC midnight instants.

## ADR-020: Preserve a modest MVP scope

- Status: Accepted
- Decision: Exclude refunds, payment deletion, multi-currency, organization roles, invoices, recurring billing, and advanced analytics.
- Rationale: The evaluation is better served by thoroughly proving the core invariants and user flow.
- Consequences: UI copy and data models must not pretend these capabilities exist. Extensions require their own decisions.

## ADR-021: Phase 1 runtime and toolchain baseline

- Status: Accepted
- Decision: Pin Node.js 24.16.0 and pnpm 11.5.2; use Next.js 16.3.1, React 19.2.8, Express 5.2.1, TypeScript 6.0.3, TanStack Query 5.101.4, Vitest 4.1.10, ESLint 9.39.5, Prettier 3.9.6, MongoDB Node.js driver 7.5.0, and Zod 4.4.3.
- Rationale: These versions were verified together on 2026-08-14. ESLint remains on the latest 9.x line because transitive lint plugins used by the current Next.js configuration do not yet accept ESLint 10. TypeScript remains on 6.0.3 because the current TypeScript-ESLint release supports TypeScript versions below 6.1.
- Consequences: The root lockfile is authoritative. Upgrades require the same peer, lint, type, unit/integration test, migration, and build gates; later phases resolve only dependencies they first introduce.

## ADR-022: MongoDB with the official Node.js driver

- Status: Accepted
- Decision: Use MongoDB as the source of truth through the official MongoDB Node.js driver, with MongoDB Atlas for deployment. Do not introduce Prisma, Mongoose, or another ORM/ODM initially.
- Rationale: MongoDB is directly aligned with the target role and the assignment permits any stack. The official driver keeps document boundaries, query predicates, projections, indexes, validators, and atomicity visible. Zod remains the application-boundary validator while MongoDB collection validators defend persisted shape.
- Consequences: Phase 2 implements typed collection handles, explicit ObjectId mapping, validators, named indexes, versioned database setup, and connection lifecycle management. The application—not foreign keys—owns cross-collection reference integrity.

## ADR-023: Embed settlement state and use conditional atomic updates

- Status: Accepted
- Decision: Embed line items and the bounded payment ledger in the order document. Record a payment with one conditional `findOneAndUpdate` that requires ownership, sufficient current balance, and absence of the idempotency key while decrementing balance, incrementing payment count, and appending the payment together.
- Rationale: MongoDB writes are atomic at the single-document level and recheck the match predicate under concurrent updates. All fields that must remain consistent therefore share one aggregate boundary without requiring a multi-document transaction.
- Consequences: Order list queries project out embedded arrays. Idempotency is enforced by the atomic predicate because unique multikey indexes do not guarantee uniqueness within a single document's array. Document size and payment count are bounded and monitored; an unbounded ledger would require a separate Payment collection and a redesigned transaction boundary.

## ADR-024: Store business dates as canonical strings in MongoDB

- Status: Accepted
- Decision: Store `dueDate` and `paymentDate` as validated `YYYY-MM-DD` strings while keeping timestamps as BSON UTC dates.
- Rationale: A date-only business value is not an instant. Canonical fixed-width strings compare and index in calendar order without timezone shifts.
- Consequences: API and database representations match. Semantic calendar validation remains in application code, and all stored values must use the exact canonical format.

## ADR-025: Phase 3 credential and session parameters

- Status: Accepted
- Decision: Hash passwords with `argon2` 0.45.1 using Argon2id at 19,456 KiB memory, two iterations, one lane, and a 32-byte hash output. Authenticate with 32 random bytes encoded as an opaque cookie token, persist only its SHA-256 digest, and use a configurable seven-day absolute session lifetime by default.
- Rationale: The parameters provide an explicit, reviewable baseline for the target Node runtime while database-backed opaque sessions make rotation and revocation immediate and keep bearer material out of MongoDB.
- Consequences: Production cookie transport is HttpOnly, Secure, SameSite=Lax, and path `/`. Authentication checks `expiresAt` directly because TTL cleanup is asynchronous. Runtime changes require renewed Argon2 benchmarking.

## ADR-026: Same-origin API rewrite and client-owned auth boundary

- Status: Accepted
- Decision: Expose browser API calls through the web origin at `/api/v1`, rewrite `/api/*` to Express through server-only `API_INTERNAL_URL`, and keep current-viewer state in React Query. Use React Hook Form 7.85.0 with Zod and `@hookform/resolvers` for auth forms.
- Rationale: One browser origin simplifies cookies and origin enforcement. A client session query avoids duplicated cookie forwarding logic while preserving a stable no-private-content loading boundary.
- Consequences: Login/signup seed the session cache, logout clears it, `/orders` redirects unauthenticated viewers, and public auth routes redirect authenticated viewers. Server prefetching can be reconsidered only if it materially improves UX without duplicating auth logic.

## ADR-027: Phase 3 API hardening baseline

- Status: Accepted
- Decision: Use Helmet 8.3.0, strict unsafe-method Origin matching, a 32 KiB JSON body limit, JSON media-type enforcement, UUID request IDs, terminal structured error mapping, and process-local `express-rate-limit` 8.6.2 counters. Limits are 300 API requests per 15 minutes per IP, 20 login attempts per 15 minutes per IP plus normalized email, and 20 signups per hour per IP.
- Rationale: These controls make the assessment service safe by default without introducing Redis or distributed infrastructure before deployment topology requires it.
- Consequences: A horizontally scaled deployment needs shared edge/distributed limiting. The final web-document CSP must be validated with the production Next.js/Align UI asset graph.

## ADR-028: Use MongoDB Atlas exclusively

- Status: Accepted
- Decision: Remove the Docker Compose MongoDB service and all hardcoded localhost connection fallbacks. Development, migrations, seeds, and integration tests connect to MongoDB Atlas through `MONGODB_URI` or `MONGODB_TEST_URI`.
- Rationale: The project targets an Atlas-backed deployment and the configured cloud connection is available, so maintaining a second local database path adds configuration drift without improving the intended evaluation signal.
- Consequences: Developers need Atlas network access and credentials before running database commands. Integration tests still create uniquely named `*_test` databases and drop only those databases during teardown; a dedicated test credential or cluster is recommended.

## ADR-029: Deterministic owned order reads and conditional unpaid writes

- Status: Accepted
- Decision: Phase 4 order reads use an authenticated-user-leading filter, allowlisted customer-prefix/status filters, and an `_id` tie-breaker for every public sort. `PATCH` replaces the full editable order payload and `DELETE` uses the same `_id`, `userId`, and `paymentCount: 0` conditional predicate. There is no edit-version or ETag protocol in the MVP.
- Rationale: Ownership-led queries prevent tenant leakage, deterministic sorting prevents pagination drift, and the conditional predicate remains correct when the Phase 5 payment write races an edit or deletion. A full replacement keeps server totals and generated line-item positions authoritative.
- Consequences: Migration `003_add_order_sort_tiebreaker` rebuilds the default newest-orders index as `{ userId, createdAt, _id }`. A future optimistic-concurrency protocol must be designed as an explicit contract rather than emitting an ambiguous `ORDER_CHANGED` response.

## ADR-030: Atomic embedded-ledger payments and replay reconstruction

- Status: Accepted
- Decision: Record payments with one owned conditional `findOneAndUpdate` that matches sufficient balance, ledger capacity, and absence of the normalized UUID key. Store a SHA-256 fingerprint of normalized amount/date/note, append the immutable payment, decrement balance, increment count, and set `updatedAt` in the same write. Reconstruct the original payment response from ledger position for same-key replay.
- Rationale: The order aggregate contains every value that must remain consistent, so MongoDB document atomicity and predicate rechecks protect concurrent settlement without a multi-document transaction. Fingerprints distinguish safe retries from accidental key reuse, while replay reconstruction keeps the original response stable even after later payments.
- Consequences: Payment volume is bounded at 1,000 entries, financial mutations are never optimistic in the UI, ambiguous failures must retain the same key, and future refund/reversal support requires a new append-only domain operation rather than editing payments.

## Open decisions for later implementation

These choices are deliberately not frozen until current library/platform behavior can be verified:

- versions of dependencies first introduced after Phase 3;
- exact Vercel Express adapter/topology;
- whether registration is public in the final hosted demo;
- final page-size options and allowed sort fields;
- whether dashboard summary respects status/date filters or always represents the entire account.

Resolving an open item requires updating the relevant canonical document, not only source code.
