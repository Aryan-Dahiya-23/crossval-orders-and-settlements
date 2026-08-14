# Implementation Roadmap

## 1. Purpose

This roadmap defines the order of implementation after explicit approval to begin coding. It is a delivery plan, not permission to start implementation.

## 2. Delivery principles

- Build the riskiest correctness paths before visual polish.
- Keep every phase independently verifiable.
- Do not advance while required checks for the current phase are failing.
- Update documentation when implementation changes an accepted decision.
- Stretch goals begin only after the core assignment is deployed and verified.

## 3. Current status

| Phase                                   | Status                                  |
| --------------------------------------- | --------------------------------------- |
| Phase 0 — Requirements and architecture | Complete                                |
| Phase 1 — Monorepo foundation           | Complete                                |
| Phase 2 — MongoDB foundation            | Complete                                |
| Phase 3 — Authentication and ownership  | Complete                                |
| Phase 4 — Order domain and REST CRUD    | Complete                                |
| Phase 5 — Atomic payment system         | Complete                                |
| Phase 6 — Align UI foundation and shell | Complete                                |
| Phase 7 onward                          | Not started; awaiting explicit approval |

## Phase 0 — Requirements and architecture

Goal: remove ambiguity before application code exists.

Deliverables:

- Repository guidance.
- Architecture and domain rules.
- REST API design.
- Database and concurrency design.
- React Query frontend plan.
- UI reference analysis.
- Testing, security, deployment, and submission plans.

Exit criteria:

- All assignment requirements appear in `docs/REQUIREMENTS_TRACEABILITY.md`.
- No known contradiction exists between focused documents.
- No application code has been created.

## Phase 1 — Monorepo foundation

Goal: create the smallest viable pnpm workspace.

Detailed execution plan: [`docs/PHASE_1_IMPLEMENTATION_PLAN.md`](docs/PHASE_1_IMPLEMENTATION_PLAN.md).

Likely files:

```text
package.json
pnpm-workspace.yaml
tsconfig.base.json
.gitignore
.env.example
apps/web/*
apps/api/*
packages/contracts/*
```

Work:

- Initialize Git.
- Pin pnpm and Node versions.
- Scaffold Next.js, Express, and contracts packages.
- Add root development, build, lint, test, and typecheck scripts.
- Add formatting and lint rules.
- Keep generated starter UI minimal.

Dependencies: Phase 0 approval.

Verification:

- Clean install succeeds.
- Web and API start together.
- Lint, build, and typecheck succeed.
- No domain behavior is implemented prematurely.

Implementation result (2026-08-14): Complete. All verification gates passed, including an isolated frozen-lockfile installation and production builds for all workspaces.

## Phase 2 — MongoDB foundation

Goal: establish a production-shaped MongoDB document model and local database workflow.

Work:

- Add MongoDB Atlas configuration and isolated development/test database conventions.
- Add the official MongoDB Node.js driver and one reusable `MongoClient` lifecycle.
- Define User and Session collections plus an Order aggregate with embedded line items and payments.
- Add strict collection validators, named indexes, and versioned idempotent migration/setup scripts.
- Implement typed collection handles and ObjectId/API mapping.
- Add a test database strategy.

Dependencies: Phase 1.

Verification:

- Setup/migrations apply idempotently to an empty database.
- Collection validators reject invalid money, date, item, and balance shapes.
- Unique and TTL indexes are present with the expected options.
- Representative list/status queries use the intended index prefixes.
- A clean reset can be performed without undocumented steps.

Implementation result (2026-08-14): Complete. MongoDB driver 7.5.0 and MongoDB 8.0-compatible infrastructure are implemented; migrations were applied twice to prove idempotency, real-database integration tests passed, and the guarded development reset/seed workflow was verified.

## Phase 3 — Authentication and ownership

Goal: establish identity before exposing owned resources.

Work:

- Implement signup, login, logout, and current-user endpoints.
- Add Argon2id hashing and opaque session cookies.
- Add session authentication middleware.
- Add safe error handling, request IDs, origin checks, and security headers.
- Add authenticated and unauthenticated web route behavior.

Dependencies: Phase 2.

Verification:

- Auth integration tests pass.
- Password/session material is never returned or logged.
- Expired and deleted sessions return 401.
- The browser completes signup, refresh, and logout successfully.

Implementation result (2026-08-14): Complete. The API now provides signup, login, logout, and current-viewer endpoints backed by Argon2id credentials and 256-bit opaque sessions whose SHA-256 hashes are stored in MongoDB. Request IDs, safe terminal errors, strict unsafe-method origin checks, Helmet headers, a 32 KiB JSON limit, content-type enforcement, and bounded auth/general rate limits are active. React Query, React Hook Form, and Zod implement the browser authentication boundary. Sixteen real-MongoDB integration tests and a live browser flow covering signup, refresh, invalid login, logout, protected-route rejection, and returning-user login passed.

## Phase 4 — Order domain and REST CRUD

Goal: implement authoritative order calculations and ownership-safe CRUD.

Detailed execution plan: [`docs/PHASE_4_IMPLEMENTATION_PLAN.md`](docs/PHASE_4_IMPLEMENTATION_PLAN.md).

Work:

- Implement integer-cent calculations.
- Implement order creation and detail representations.
- Implement list filters, search, sort, pagination, and summary metrics.
- Implement unpaid-order editing and deletion.
- Implement status derivation without persisting status.

Dependencies: Phases 2–3.

Verification:

- Server ignores/rejects client-authored totals.
- Unit tests cover money and status decisions.
- Cross-user read/update/delete tests pass.
- Due-today and overdue filters agree with status serialization.

Implementation result (2026-08-14): Complete. The API now provides authenticated create, list, summary, detail, replacement edit, and conditional delete endpoints. Totals are overflow-safe integer-cent calculations; statuses are derived from a captured UTC business date; list queries use ownership-led, allowlisted filters and deterministic ObjectId tie-breaks; and details return ordered line items plus existing payment history. Edit/delete match `_id`, authenticated `userId`, and `paymentCount: 0`. Migration `003_add_order_sort_tiebreaker` rebuilt the owned newest-orders index to avoid a blocking winning-plan sort. Fourteen unit tests and twenty-three Atlas integration tests passed.

## Phase 5 — Atomic payment system

Goal: complete the highest-risk backend requirement before dashboard polish.

Work:

- Implement the conditional `findOneAndUpdate` payment flow against the order aggregate.
- Atomically decrement balance, increment payment count, and append the embedded payment.
- Return the canonical post-update order state from the successful write.
- Enforce order locking after the first payment.
- Implement actionable overpayment responses.
- Implement payment idempotency and request fingerprinting.
- Add reconciliation assertions.

Dependencies: Phase 4.

Verification:

- Partial, multiple, exact, and rejected payment tests pass.
- Same-key replay and changed-payload conflict tests pass.
- Concurrent `$400 + $400` against `$500` admits only one request.
- Payment racing with order edit/delete preserves all invariants.

Implementation result (2026-08-15): Complete. Payment creation uses one owned conditional `findOneAndUpdate` that requires sufficient balance, an unused normalized UUID idempotency key, and remaining ledger capacity. The write decrements balance, increments payment count, appends the immutable payment, and updates the timestamp atomically. Replays return the original committed payment representation, changed payloads conflict, and current balances are returned for actionable rejection states. The essential React Query experience now includes account summary, recent-order navigation, order detail, payment history, and a payment dialog with retained logical-attempt keys. Sixteen unit tests and thirty-one Atlas integration tests pass, including independent-client concurrency and payment-versus-edit/delete races.

## Phase 6 — Align UI foundation and application shell

Goal: create the product's visual language and authenticated navigation.

Work:

- Add only the required Align UI primitives.
- Establish color, typography, spacing, focus, and motion tokens.
- Build desktop sidebar and mobile header.
- Build reusable page header, status badge, money, skeleton, alert, and toast patterns.
- Build login and signup pages.

Dependencies: Phase 3; may begin after backend auth stabilizes.

Verification:

- Auth screens and shell work with keyboard-only navigation.
- Focus is visible.
- Desktop and narrow layouts remain usable.
- No placeholder navigation or nonfunctional actions remain.

Implementation result (2026-08-15): Complete. The web app now uses a focused set of local Align UI-style primitives backed by Radix Dialog, Remix icons, Tailwind CSS, and shared button, input, modal, badge, alert, and skeleton components. The authenticated experience has a fixed desktop sidebar, dismissible mobile navigation, consistent page hierarchy, responsive list/detail compositions, accessible status labels, visible focus, and a skip link. Login, signup, dashboard, order detail, payment history, and settlement states now share one restrained B2B finance design language derived from the approved references without importing or depending on them. TypeScript, ESLint, the production build, and live registration/list/detail/payment browser flows passed with no browser console errors.

## Phase 7 — Dashboard and React Query integration

Goal: deliver the main assignment interface.

Work:

- Configure the QueryClient and query-key factory.
- Implement typed API client and structured error parsing.
- Build summary cards and orders table.
- Store filter/search/sort/page state in the URL.
- Add status filters, search, sorting, pagination, and actions.
- Add skeleton, empty, filtered-empty, background-fetch, and error states.

Dependencies: Phases 4 and 6.

Verification:

- Query keys include every server-affecting filter.
- Previous data remains visible during page/filter transitions.
- Mutation invalidation refreshes the correct queries.
- Table and summary values match API responses.

## Phase 8 — Order creation, edit, and detail workflows

Goal: complete the core non-payment product flows.

Work:

- Build the reusable Order form and dynamic line-item editor.
- Add decimal-string-to-cents conversion at submission.
- Build the detail financial hierarchy and item table.
- Add edit and delete actions for unpaid orders.
- Explain locked state after payment.

Dependencies: Phases 4, 6, and 7.

Verification:

- Dynamic item add/remove behavior is accessible.
- Optimistic display totals match server totals for valid inputs.
- Server errors map to fields or form alerts.
- Locked orders cannot be edited through UI or direct API calls.

## Phase 9 — Payment and history UX

Goal: make partial settlement the most obvious, polished workflow.

Work:

- Build Record Payment modal.
- Show total, paid, remaining, and maximum before entry.
- Generate and retain payment idempotency keys.
- Add “use remaining balance.”
- Display full payment history.
- Handle stale-balance, server, duplicate, and success states.
- Invalidate detail, list, and summary caches after settlement.

Dependencies: Phases 5, 7, and 8.

Verification:

- Assignment sample scenario succeeds end to end.
- Overpayment response updates the displayed maximum.
- Exact payment changes the order to Paid without a full reload.
- Duplicate submission creates one embedded Payment and increments the balance only once.

## Phase 10 — Test hardening and reviewer data

Goal: make correctness demonstrable and evaluation fast.

Work:

- Complete MongoDB validator, index, integration, and concurrency suites.
- Add focused frontend component tests.
- Add Playwright assignment-scenario smoke test.
- Add relative-date demo seed covering every status.
- Add demo credentials or a clear signup-first reviewer path.

Dependencies: Phases 3–9.

Verification:

- Test suite passes from documented commands.
- Seed is repeatable and does not use stale fixed dates.
- A clean user can understand the product within two minutes.

## Phase 11 — Deployment and production smoke test

Goal: make the app publicly accessible without degrading authentication or atomicity guarantees.

Work:

- Create separate Vercel web and API projects.
- Configure same-origin `/api` rewrite.
- Provision MongoDB Atlas.
- Apply production migrations and seed.
- Configure cookie, origin, proxy, and database settings.
- Verify deployment logs and health response.

Dependencies: Phase 10.

Verification:

- Public signup/login/logout works.
- Cookies survive refresh and are not readable by JavaScript.
- Concurrent payment behavior is verified directly against MongoDB Atlas.
- No API response or asset is incorrectly cached.
- Live URL passes the submission smoke checklist.

## Phase 12 — Submission audit

Goal: produce a reviewer-ready repository and handoff.

Work:

- Finalize README with setup, URLs, decisions, and limitations.
- Capture representative screenshots.
- Run every documented command from a clean checkout.
- Review environment-variable and migration instructions.
- Remove dead code, comments, placeholder copy, and unused dependencies.
- Optionally record a short walkthrough.

Dependencies: Phase 11.

Verification:

- `docs/SUBMISSION_CHECKLIST.md` is complete.
- Requirement traceability has no uncovered mandatory item.
- Live scenario works with reviewer-visible feedback.

## Stretch gate

Stretch work is permitted only after Phase 12 core checks pass.

Priority:

1. CSV export, if time remains.
2. Short Loom walkthrough.
3. Action-oriented audit log only after its semantics are explicitly redesigned.

Refunds, event sourcing, charts, and background infrastructure remain out of scope.
