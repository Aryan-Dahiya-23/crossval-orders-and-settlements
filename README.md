# CrossVal Orders & Settlements

CrossVal Orders & Settlements is a full-stack take-home application for creating customer orders, recording partial or full payments, and monitoring outstanding balances through a polished B2B finance dashboard.

The monorepo, MongoDB, authentication, and order CRUD foundations are implemented. The workspace contains a Next.js web app, Express API, shared contracts package, React Query session state, typed MongoDB collections, strict database validators, named indexes, migrations, opaque database-backed sessions, owned order CRUD, and Atlas integration tests. Payment writes and product dashboard workflows begin in Phase 5 onward.

## Product objective

The finished submission should make the assignment's core workflow effortless to review while demonstrating production-minded engineering in the areas that matter most:

- Correct integer-based money calculations.
- Partial and full payments.
- Deterministic derived order statuses.
- Atomic overpayment prevention under concurrency.
- Payment idempotency.
- Secure authentication and per-user ownership.
- A polished, responsive Align UI dashboard.
- High-value MongoDB integration and concurrency tests.

The guiding priority is:

```text
correctness > simplicity > reviewer experience > polish > unnecessary sophistication
```

## Chosen stack

| Area                  | Choice                                          |
| --------------------- | ----------------------------------------------- |
| Runtime               | Node.js 24.16.0                                 |
| Frontend              | Next.js 16 and TypeScript 6                     |
| Frontend server state | TanStack Query (React Query)                    |
| Forms                 | React Hook Form and Zod                         |
| UI system             | Align UI primitives                             |
| Backend               | Express 5 and TypeScript 6                      |
| Database              | MongoDB 8.0-compatible document model           |
| Database access       | Official MongoDB Node.js driver 7.5.0           |
| Package manager       | pnpm 11.5.2                                     |
| Repository            | pnpm monorepo                                   |
| Primary deployment    | Vercel web + Vercel Express API + MongoDB Atlas |

## Documentation map

The documents intentionally have distinct responsibilities:

| Document                                                           | Source of truth for                                                       |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                             | Repository-wide instructions for future coding agents                     |
| [ARCHITECTURE.md](ARCHITECTURE.md)                                 | System boundaries, modules, data flow, and concurrency design             |
| [ROADMAP.md](ROADMAP.md)                                           | Delivery phases, dependencies, and verification gates                     |
| [Phase 1 implementation plan](docs/PHASE_1_IMPLEMENTATION_PLAN.md) | Execution-ready monorepo foundation scope, sequencing, and exit criteria  |
| [Phase 4 implementation plan](docs/PHASE_4_IMPLEMENTATION_PLAN.md) | Execution-ready order domain, owned CRUD, Atlas tests, and exit criteria  |
| [Product requirements](docs/PRODUCT_REQUIREMENTS.md)               | Functional requirements, user outcomes, and acceptance criteria           |
| [Domain rules](docs/DOMAIN_RULES.md)                               | Money, statuses, order locking, payments, dates, and invariants           |
| [API specification](docs/API.md)                                   | REST endpoints, payload conventions, statuses, and errors                 |
| [Database design](docs/DATABASE.md)                                | Documents, validators, indexes, query patterns, and atomic writes         |
| [Frontend architecture](docs/FRONTEND.md)                          | Routes, React Query, forms, client state, and rendering strategy          |
| [UI/UX specification](docs/UI_UX.md)                               | Dashboard language, components, states, responsiveness, and accessibility |
| [Security](docs/SECURITY.md)                                       | Authentication, authorization, CSRF, validation, and threat controls      |
| [Testing](docs/TESTING.md)                                         | Unit, integration, concurrency, component, and end-to-end testing         |
| [Deployment](docs/DEPLOYMENT.md)                                   | Local environments, production topology, migrations, and smoke checks     |
| [Decision register](docs/DECISIONS.md)                             | Accepted choices and explicitly open implementation decisions             |
| [Reference analysis](docs/REFERENCE_ANALYSIS.md)                   | Patterns learned from the three read-only dashboard references            |
| [Requirements traceability](docs/REQUIREMENTS_TRACEABILITY.md)     | Assignment requirement to implementation and test mapping                 |
| [Submission checklist](docs/SUBMISSION_CHECKLIST.md)               | Final reviewer-readiness and delivery audit                               |

When documents overlap, the more focused document above is authoritative. Update dependent summaries whenever an authoritative decision changes.

## Non-negotiable domain decisions

- USD is the only currency in scope.
- Money crosses the API boundary and is stored as integer cents.
- The server calculates all authoritative order totals.
- Status is derived and never directly editable.
- An order is fully editable only before its first payment.
- Payments are append-only.
- The order document embeds line items, settlement projections, and the bounded payment ledger.
- MongoDB conditional single-document updates protect concurrent payment creation.
- The web client always supplies an idempotency key for payment attempts.
- Every order query is scoped by the authenticated user.

## Repository shape

```text
crossval/
├── apps/
│   ├── api/
│   │   ├── src/config/
│   │   ├── src/db/
│   │   ├── src/modules/auth/
│   │   └── tests/{auth,db}/
│   └── web/
│       ├── app/
│       ├── components/
│       └── features/auth/
├── packages/
│   └── contracts/
├── docs/
├── .env.example
├── eslint.config.mjs
├── AGENTS.md
├── ARCHITECTURE.md
├── ROADMAP.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Local workflow

Prerequisites:

- Node.js `24.16.0` as recorded in `.node-version`.
- Corepack or pnpm `11.5.2`.
- An accessible MongoDB Atlas connection with permission for the configured database.

Install dependencies and create `.env` from the safe template if one does not already exist:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

Apply the database foundation and optionally load the six relative-date development fixtures:

```bash
pnpm db:migrate
pnpm db:seed
```

Then run both applications:

```bash
pnpm dev
```

The web app runs at `http://localhost:3000`; the API liveness endpoint runs at `http://localhost:3001/health`. Browser API calls use the same-origin `/api` rewrite and are forwarded to the Express service configured by `API_INTERNAL_URL`.

Database commands:

```bash
pnpm db:migrate  # idempotent validators and indexes
pnpm db:seed     # replace only the dedicated seed user's orders
pnpm db:reset    # guarded: only *_development or *_test databases
```

`db:reset` drops and recreates the configured database. The command refuses database names that do not end in `_development` or `_test`.

Run the complete checks while MongoDB is reachable:

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm build
```

## Current status

- Assignment reviewed.
- Reference dashboards reviewed read-only.
- Product and domain decisions documented.
- Architecture and delivery roadmap documented.
- Phase 1 monorepo foundation implemented and verified.
- Phase 2 MongoDB foundation implemented and verified against a real MongoDB server.
- Phase 3 authentication and ownership boundary implemented and verified against a real MongoDB server and in a browser.
- React Query owns session state; React Hook Form and Zod drive the login and registration forms.
- API liveness and structured not-found behavior covered by tests.
- The configured development database has versioned validators/indexes and six non-sensitive seed orders.
- Phase 4 owned order CRUD is implemented: server-authored totals, derived statuses, list/search/filter/sort/pagination, summary aggregation, order detail, and conditional unpaid edit/delete.
- Payment behavior and the product dashboard have not started.

The next planned step is Phase 5 in [ROADMAP.md](ROADMAP.md), after explicit approval to begin atomic payment recording and overpayment protection.
