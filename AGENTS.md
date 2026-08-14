# AGENTS.md

These instructions apply to the entire repository. Codex reads repository-level `AGENTS.md` guidance before working, and more deeply nested instructions may override it for their directory.

## Current project state

Phases 1 through 4 are complete. Phase 5 has not started.

- The Next.js web app, Express API, contracts package, React Query provider, and shared tooling are implemented.
- MongoDB configuration, the reusable driver lifecycle, typed collections, strict validators, named indexes, versioned migrations, seed/reset tooling, and real-database integration tests are implemented.
- Signup, login, logout, current-session lookup, Argon2id password hashing, opaque database-backed sessions, authentication middleware, same-origin browser routing, and protected frontend route behavior are implemented.
- Order CRUD, summary, derived status, ownership-scoped list/detail queries, and conditional unpaid edit/delete behavior are implemented and verified against MongoDB Atlas.
- Do not begin payment services or dashboard implementation until the user explicitly approves the relevant next phase.
- Preserve the Phase 2 database boundary rather than introducing an ODM or generic repository in later phases.
- Treat `orders-and-settlements.pdf` as the original assignment source.
- Treat the three previously inspected dashboard repositories as read-only design references. Never modify them, import them at runtime, or make this project depend on them.
- Within `apps/web`, also follow the Next.js-generated `apps/web/AGENTS.md` guidance and consult the installed Next.js documentation when framework behavior may have changed.

## Read before implementation

Before making code changes, read:

1. `README.md`
2. `ARCHITECTURE.md`
3. `ROADMAP.md`
4. The relevant focused documents in `docs/`
5. Any nearer `AGENTS.md` or `AGENTS.override.md`

Do not silently change an accepted decision. Record a meaningful change in `docs/DECISIONS.md` and update all affected source-of-truth documents.

## Product priorities

Optimize in this order:

```text
correctness > simplicity > reviewer experience > polish > unnecessary sophistication
```

The main engineering signal must come from:

- Atomic payment writes.
- Financial invariants.
- Authorization and ownership.
- Integer money handling.
- Derived status logic.
- Clear validation and errors.
- Focused integration and concurrency tests.
- Polished success, loading, empty, and failure states.

## Required stack and boundaries

- Use pnpm workspaces.
- Use Next.js and TypeScript for `apps/web`.
- Use Express.js and TypeScript for `apps/api`.
- Do not use Next.js API routes as the primary backend.
- Use MongoDB through the official MongoDB Node.js driver.
- Use MongoDB collection validators and named indexes; do not add Mongoose or another ODM without a documented need.
- Use TanStack Query (React Query) for frontend server state.
- Use React Hook Form for complex forms.
- Use Zod at external boundaries.
- Use Align UI primitives as the primary component system.
- Keep Align UI components in the web application unless sharing becomes demonstrably useful.
- Add `packages/contracts` only for shared API contracts, status/error constants, and boundary schemas.
- Do not add Redux, Jotai, Zustand, or another global state library without a concrete requirement React Query and local state cannot satisfy.
- Do not add microservices, queues, Redis, event buses, generic repositories, or dependency-injection frameworks.

## Domain invariants

- USD is the only supported currency.
- Store and transport money as integer cents.
- Never use floating-point arithmetic as the authoritative money calculation.
- The backend recalculates every order total from its line items.
- Order status is derived, not persisted or editable.
- Due dates and payment dates are date-only `YYYY-MM-DD` values.
- `paid` takes precedence over `overdue`.
- Due today is not overdue.
- Orders become fully read-only after the first payment.
- Payments are positive and append-only.
- Total committed payments must never exceed the order total.
- Embed line items and the bounded payment ledger within the order document.
- Payment, order edit, and order deletion flows must use conditional writes against the same order document.
- The payment update predicate must include authenticated ownership, sufficient current balance, and absence of the idempotency key.
- Balance decrement, payment-count increment, and payment append must occur in one atomic document update.
- The frontend must send an idempotency key for payment attempts.
- Every order/payment query must include authenticated ownership in the database query.

See `docs/DOMAIN_RULES.md` for exact semantics.

## Backend organization

- Keep Express route handlers thin.
- Put business operations in cohesive module services.
- Keep pure money and status helpers independent from HTTP and the MongoDB driver.
- Use typed MongoDB collection handles directly inside domain services; do not hide query patterns behind a generic repository abstraction.
- Use structured application errors and one terminal Express error handler.
- Validate and normalize input before the atomic write, then include every state-dependent rule in the MongoDB match predicate.
- Use multi-document transactions only when a documented operation truly spans aggregates; keep them short and free of network calls.
- Map MongoDB driver and validation errors to safe API errors. Never expose stack traces or database details.

## Frontend organization

- Use URL search parameters for dashboard filter, search, sort, and page state.
- Use React Query for all remote data, caching, background refetching, and invalidation.
- Use local component state for dialogs and ephemeral UI state.
- Use React Hook Form for signup, login, order, and payment forms.
- Do not copy API data into local state unless the user is actively editing a draft.
- Use real links for navigation to order details.
- Preserve prior table data during filter/page transitions.
- Invalidate the smallest correct set of React Query keys after mutations.
- Prefer skeletons that preserve layout over full-screen spinners.
- Use server errors as the final authority, especially for remaining payment balance.

See `docs/FRONTEND.md` and `docs/UI_UX.md`.

## Testing requirements

- Pure domain behavior receives unit tests.
- HTTP, ownership, validators, indexes, projections, and atomic MongoDB behavior receive integration tests against a real MongoDB server.
- Concurrency tests must use MongoDB and independent requests/clients, never an in-memory repository mock.
- Payment changes require tests for partial, exact, overpayment, idempotency, and concurrent submissions.
- Authorization changes require cross-user negative tests.
- Date/status changes require due-today and overdue boundary tests.
- Run the assignment's `$1,000 → $400 → $600 → reject $1` flow before handoff.

Do not chase an arbitrary coverage percentage. Prioritize business-critical paths.

## UI expectations

- Build a restrained B2B finance interface, not a generic template showcase.
- Reuse Align UI primitives instead of recreating accessible controls.
- Keep the dashboard information-dense but calm.
- Do not add vanity charts or fabricated trend percentages.
- Status must be communicated with text as well as color.
- Important desktop workflows must remain usable on narrow screens.
- Use a deliberate stacked order-row treatment on mobile; allow horizontal scrolling only for data grids such as line items where stacking would obscure comparisons.
- Include loading, initial-empty, filtered-empty, error, disabled, and success states.

## Documentation expectations

When behavior changes, update the authoritative document in the same change:

- Domain semantics → `docs/DOMAIN_RULES.md`
- Endpoint contract → `docs/API.md`
- Document model/validator/index/query pattern → `docs/DATABASE.md`
- Query/cache behavior → `docs/FRONTEND.md`
- Security behavior → `docs/SECURITY.md`
- Test strategy → `docs/TESTING.md`
- Architecture decision → `docs/DECISIONS.md`
- Delivery scope/status → `ROADMAP.md`

Keep the README concise and reviewer-facing. Do not duplicate entire specifications into it.

## Change discipline

- Preserve unrelated user changes.
- Keep changes small and cohesive.
- Do not add speculative abstractions or dependencies.
- Do not leave commented-out implementations, dead code, `any`-heavy boundaries, or placeholder metrics.
- Do not commit secrets or real credentials.
- Do not claim verification that was not run.
- Before handoff, inspect the diff and report the exact checks performed.
