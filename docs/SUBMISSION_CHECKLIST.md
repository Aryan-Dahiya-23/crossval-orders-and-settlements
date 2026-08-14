# Submission Checklist

## Usage

This is a release gate, not a progress estimate. Check an item only after verifying it in the clean submission environment. Implementation has not begun merely because the checklist exists.

## Scope and product

- [ ] Orders & Settlements is the only implemented assignment scope.
- [ ] Dashboard, order detail, order creation, payment recording, and authentication form one coherent product.
- [ ] No placeholder navigation, fake trends, or unfinished advertised features remain.
- [ ] Deferred capabilities are not implied by UI copy.
- [ ] Demo data includes Pending, Partially paid, Paid, and Overdue orders.

## Domain correctness

- [ ] All money is represented as integer cents outside display/input formatting.
- [ ] The server calculates line totals, order total, paid amount, and balance.
- [ ] `totalAmountCents = sum(line totals)` is preserved.
- [ ] `balanceDueCents = totalAmountCents - sum(payments)` is preserved.
- [ ] Balance can never be negative.
- [ ] Status is derived consistently and not stored as mutable truth.
- [ ] Due-today is not considered overdue.
- [ ] Paid status wins regardless of an old due date.
- [ ] Orders with payments cannot be edited or deleted.
- [ ] Payments cannot be edited or deleted.

## Concurrency and atomicity

- [ ] The order embeds its bounded payment ledger and settlement projections.
- [ ] Payment `findOneAndUpdate` matches `_id`, authenticated `userId`, sufficient balance, and absence of the idempotency key.
- [ ] Balance decrement, payment-count increment, and payment append occur in one atomic document update.
- [ ] Update and delete use `paymentCount: 0` predicates against the same order document.
- [ ] Payment idempotency is enforced by the atomic predicate and fingerprint replay logic, not incorrectly attributed to a unique multikey index.
- [ ] Duplicate-key replay behavior matches the API documentation.
- [ ] Concurrent 7,000 + 6,000 cent requests against a 10,000-cent balance cannot both commit.
- [ ] Concurrent 4,000 + 6,000 cent requests can safely settle the order.
- [ ] A payment-vs-edit/delete race cannot produce an invalid state.

## API

- [ ] All public endpoints live under `/api/v1`.
- [ ] Request and response shapes match `docs/API.md`.
- [ ] Validation rejects unknown/invalid financial fields.
- [x] User ownership is enforced on every implemented order operation and summary.
- [x] Pagination, filtering, search, and sort inputs are allowlisted.
- [x] Error responses use stable codes, safe messages, and request IDs for implemented routes.
- [ ] Correct HTTP status codes are used for validation, auth, missing resources, conflicts, rate limits, and unexpected errors.
- [x] Phase 3 API documentation examples match real responses.

## Authentication and security

- [x] Passwords use Argon2id and are never logged.
- [x] Session cookies are HttpOnly, Secure in production, and SameSite as designed.
- [x] Only session-token hashes are stored.
- [x] Logout revokes the server session.
- [x] Expired sessions fail safely.
- [x] User A cannot access User B's orders through any implemented order route.
- [x] Unsafe cross-origin requests are rejected.
- [x] Login and registration have appropriate rate limits.
- [x] The same-origin API does not enable wildcard credentialed CORS.
- [x] Security headers and body limits are configured.
- [ ] Logs redact cookies, credentials, tokens, passwords, and connection strings.
- [ ] No secret appears in committed files or client bundles.

## Frontend and React Query

- [x] React Query is the only general-purpose server-state store.
- [x] Implemented auth query keys come from a stable factory and include all response-changing parameters.
- [ ] List filters and pagination are URL-backed.
- [ ] Payment mutations are not optimistic.
- [ ] Successful order/payment mutations invalidate or seed the documented caches.
- [x] Logout and session loss clear private cached data.
- [x] Query functions use cancellation signals.
- [x] Unauthorized and validation failures are not blindly retried.
- [ ] Initial load, background refresh, empty, filtered-empty, error, and conflict states are distinct.
- [x] Implemented authentication forms render client and server validation accessibly.
- [ ] Money and dates render without floating-point or timezone errors.

## UI and accessibility

- [ ] The dashboard shows total, paid, due, due date, and status clearly.
- [ ] Record Payment is obvious on an eligible order.
- [ ] Invalid actions are unavailable with clear explanation.
- [ ] The table remains usable at supported desktop widths.
- [ ] Core journeys work at mobile width.
- [ ] All actions are keyboard accessible.
- [ ] Dialog focus management is correct.
- [ ] Status does not rely on color alone.
- [ ] Form errors are programmatically associated and announced.
- [ ] Focus visibility, contrast, and reduced-motion behavior are verified.
- [ ] No raw loading spinner replaces an entire structured page.

## Tests and quality

- [ ] Format check passes.
- [ ] Lint passes.
- [ ] Strict TypeScript checks pass in all packages.
- [ ] Unit tests pass.
- [ ] Component tests pass.
- [ ] API integration tests pass against a real MongoDB server.
- [ ] Concurrency tests pass repeatedly without arbitrary sleeps.
- [ ] Critical Playwright journeys pass.
- [ ] Production web and API builds pass.
- [ ] MongoDB validators and named indexes apply idempotently to an empty database.
- [ ] Representative list, search, status, and summary queries have reviewed execution plans.
- [ ] No disabled, `.only`, or unexplained skipped tests remain.
- [ ] No material browser-console errors or warnings remain.

## Deployment

- [ ] Public deployment uses HTTPS.
- [ ] Web-to-API rewrite preserves cookies and structured errors.
- [ ] Production and preview databases are isolated.
- [ ] The API reuses one `MongoClient` per warm process with bounded Atlas-aware pooling.
- [ ] Dashboard queries project out embedded payment and line-item arrays.
- [ ] Order document size/payment-count limits are documented and enforced.
- [ ] Production migration runs exactly once as a release step.
- [ ] Health endpoint responds without exposing internals.
- [ ] Request IDs appear in deployed logs and safe error responses.
- [ ] Demo credentials or self-registration instructions work.
- [ ] Deployment smoke test passes from a fresh browser session.
- [ ] Hosted data contains no personal or production-sensitive information.

## Repository and documentation

- [ ] Root `README.md` reflects the implemented repository, not only the plan.
- [ ] `ARCHITECTURE.md` matches actual boundaries and transaction behavior.
- [ ] `AGENTS.md` remains accurate for future work.
- [ ] `ROADMAP.md` marks completed work truthfully.
- [ ] API, database, frontend, security, testing, deployment, and UI docs match implementation.
- [ ] Decisions added or changed during implementation are recorded.
- [ ] Requirement traceability has no unowned requirement.
- [ ] `.env.example` contains names and safe placeholders only.
- [ ] Install, local run, migration, seed, test, and build commands have been rehearsed from a clean checkout.
- [ ] License/attribution requirements for dependencies and assets are satisfied.
- [ ] No generated artifacts, local secrets, editor state, or unnecessary binaries are committed.

## Reviewer handoff

- [ ] Repository link is accessible.
- [ ] Public application link is accessible.
- [ ] Reviewer can authenticate without private coordination.
- [ ] README gives a two-minute product and architecture overview.
- [ ] README highlights the MongoDB conditional atomic-update approach and how to run its test.
- [ ] Known limitations are concise and honest.
- [ ] The recommended demonstration path is documented.
- [ ] A final pass checks spelling, stale screenshots, broken links, and sample credentials.

## Final demonstration script

- [ ] Open the dashboard and explain summary/status information.
- [ ] Create a 1,000.00 USD multi-item order.
- [ ] Record a 400.00 payment and show 600.00 due.
- [ ] Demonstrate safe overpayment rejection.
- [ ] Record the final 600.00 and show Paid.
- [ ] Show immutable history and edit/delete lock.
- [ ] Run or explain the real concurrent-payment integration test.

## Stop-ship conditions

Do not submit while any of these are true:

- a payment can overdraw an order under concurrency;
- two users can access each other's data;
- totals use floating-point persistence;
- status differs between dashboard and detail;
- payment retry can create a duplicate;
- a payment or paid order can be mutated contrary to the domain rules;
- deployed authentication or cookies fail;
- setup instructions do not work from a clean clone;
- the main user journey requires hidden knowledge.
