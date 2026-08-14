# Deployment and Operations Plan

## Target topology

The planned submission topology is:

```text
Browser
  │ HTTPS
  ▼
Vercel web project (Next.js)
  │ same-origin /api rewrite
  ▼
Vercel API project (Express adapter)
  │ pooled TLS MongoDB connection
  ▼
MongoDB Atlas
```

This preserves a conventional Express service while giving the browser one origin for cookies and API calls. The exact platform adapter is confirmed during implementation against current hosting documentation.

## Environments

| Environment | Purpose                        | Database                                              | Data policy                       |
| ----------- | ------------------------------ | ----------------------------------------------------- | --------------------------------- |
| Local       | Development                    | Isolated MongoDB Atlas development database           | Disposable developer data         |
| Test        | Automated tests                | Dedicated ephemeral/test database                     | Reset automatically               |
| Preview     | Pull-request/demo verification | Isolated preview database or protected shared preview | Seeded non-sensitive data         |
| Production  | Final public submission        | Production MongoDB Atlas database                     | Controlled migrations and backups |

Preview deployments must never share the production database by default.

## Environment variables

### API

| Variable                              | Purpose                            | Secret |
| ------------------------------------- | ---------------------------------- | ------ |
| `NODE_ENV`                            | Runtime mode                       | No     |
| `API_PORT`                            | Local/listening port               | No     |
| `MONGODB_URI`                         | MongoDB/Atlas connection string    | Yes    |
| `MONGODB_DATABASE`                    | Explicit application database name | No     |
| `SESSION_COOKIE_NAME`                 | Stable cookie name                 | No     |
| `SESSION_TTL_SECONDS`                 | Absolute session lifetime          | No     |
| `APP_ORIGIN`                          | Exact allowed browser origin       | No     |
| `REGISTRATION_ENABLED`                | Enable public signup               | No     |
| `TRUST_PROXY_HOPS`                    | Trusted reverse-proxy hop count    | No     |
| `MONGODB_MAX_POOL_SIZE`               | Bounded MongoDB pool size          | No     |
| `MONGODB_WAIT_QUEUE_TIMEOUT_MS`       | Pool wait timeout                  | No     |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | Server selection timeout           | No     |

### Web

| Variable                    | Purpose                                            | Secret |
| --------------------------- | -------------------------------------------------- | ------ |
| `NEXT_PUBLIC_API_BASE_PATH` | Normally `/api/v1` through the same-origin rewrite | No     |
| `API_INTERNAL_URL`          | Server-only Express rewrite target                 | No     |

No database, password, or server session secret may use a `NEXT_PUBLIC_` prefix. Opaque sessions do not require a client-visible signing secret.

API variables are validated at startup and documented in `.env.example`. `API_INTERNAL_URL` remains server-only; only the stable relative base path is available in the client bundle.

For Atlas compatibility, `MONGODB_DATABASE` is validated at no more than 38 UTF-8 bytes. Development seed/reset commands additionally require the name to end in `_development` or `_test`.

## Build and release sequence

1. Install the exact lockfile dependencies.
2. Run format, lint, type, and test gates.
3. Build the API and web applications.
4. Apply versioned MongoDB collection-validator and index migrations once through a controlled job.
5. Deploy the API.
6. Deploy the web application and verify its API rewrite.
7. Run smoke tests against the public deployment.
8. Seed demo data only through an explicit, idempotent production-demo procedure if required.

Do not run migrations independently in every serverless function instance. Validator/index migration is a release action.

## Database connectivity

Create one reusable `MongoClient` per warm API process. Each client maintains its own connection pool, so pool limits must account for the platform's maximum concurrent instances rather than only one process.

The implemented client starts with `minPoolSize: 0`, configurable bounded `maxPoolSize`, a finite wait-queue timeout, a finite server-selection timeout, and Atlas Stable API v1 in strict mode. Tune only after observing deployed concurrency and connection counts. Payment correctness does not depend on session affinity because the critical operation is one atomic document update.

## Migrations

- Validator, index, and data migrations are committed and reviewed.
- Scripts create collections and named indexes idempotently and update validators deliberately through `collMod`.
- Each migration is tested against an empty database and, when relevant, representative existing documents.
- Additive changes precede application code that depends on them.
- Destructive changes require a backup/rollback plan and are outside the likely assignment scope.
- Seed logic is separate from schema migration logic.
- `schema_migrations` records successfully applied versions.

## Demo seeding

The demo dataset should visibly cover:

- a pending unpaid order;
- a partially paid order with multiple payments;
- a fully paid order;
- an overdue unpaid order;
- an overdue partially paid order;
- varied customer names, due dates, and totals.

Seed credentials must be safe for a public demo and documented in the submission notes. Never reuse a personal password. Seed execution must be idempotent or intentionally reset only the dedicated demo account.

## Observability

### Health endpoints

- A lightweight liveness endpoint proves the process can respond.
- A readiness endpoint may verify database connectivity if platform probing will not overload the database.
- Health responses expose no environment or schema detail.

### Logging

Emit structured logs with request ID, method, route template, status, latency, and safe entity identifiers. Platform logs must redact credentials and cookies as defined in `SECURITY.md`.

### Error visibility

For the assignment, platform logs plus correlated request IDs are sufficient. An error-tracking service is optional and must not delay core correctness. If added, sanitize payloads and document its data handling.

## Availability and recovery

- Confirm the selected Atlas tier's backup and point-in-time recovery capabilities.
- Keep migrations reproducible from the repository.
- Document how to revoke all active sessions if credentials are exposed.
- Treat a failed migration as a stopped deployment; do not continue with incompatible application code.
- Roll back application deployments through the hosting platform when schema compatibility permits.

## Cookie and proxy verification

Before submission, verify in the deployed environment:

- login sets one secure HttpOnly session cookie;
- the cookie is sent through the `/api` path as intended;
- logout expires it and revokes the server session;
- unsafe cross-origin requests fail;
- redirects never expose tokens in URLs;
- preview and production cookie names/domains do not collide unexpectedly.

## Performance checks

- Orders list queries use indexes and server-side pagination.
- Summary aggregation and status filters have explainable query plans at demo scale.
- Dashboard projections exclude embedded `payments` and full `lineItems` arrays.
- Serverless cold starts remain acceptable for the evaluation flow.
- MongoDB client/pool counts remain below Atlas limits under a small burst.
- Maximum order document size and payment count remain well within documented bounds.
- Static assets receive normal CDN caching; authenticated JSON does not receive public caching.

## Deployment smoke test

Run after every production release:

1. Open the public URL over HTTPS.
2. Log in with the demo account.
3. Load dashboard totals and each status filter.
4. Open an order detail.
5. Create a small disposable order.
6. Record a partial payment and verify balance/status.
7. Log out and confirm protected routes are inaccessible.
8. Confirm no browser-console or network errors.

Any disposable smoke-test data should be identifiable and cleaned through a safe documented path; do not add an unauthenticated reset endpoint.

## Rollback approach

Application rollback uses the platform's previous deployment when the database schema remains backward-compatible. For a migration-related failure:

- stop traffic to incompatible code;
- prefer a forward-fix migration for additive schema changes;
- restore from backup only for verified data corruption and with explicit authorization;
- record the incident and reconcile the payment invariant afterward.

## Submission artifacts

The final implementation phase should provide:

- public frontend URL;
- repository URL;
- demo credentials or self-registration instructions;
- concise local setup instructions;
- environment variable template;
- migration and seed commands;
- test commands and evidence;
- architecture notes explaining MongoDB document modeling and atomic-write safety;
- known limitations.

## Deployment decisions still to verify

- Current Vercel support and adapter shape for the chosen Express deployment.
- Atlas production server version and upgrade policy; the application driver is pinned to 7.5.0 and the local server to 8.0.16.
- Atlas tier, backup capability, regional placement, and connection limits.
- Whether one Vercel project with internal routing is simpler than two projects without compromising the required backend structure.
- Preview-database lifecycle and cost.
- Exact Node.js and pnpm versions supported by both platforms.

These are implementation-time verification items because hosting capabilities can change.
