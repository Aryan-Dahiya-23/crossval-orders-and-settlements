# Security Model

## Security objectives

The MVP must protect account credentials, isolate each user's orders, preserve payment integrity, and avoid leaking sensitive implementation details. It is not intended to satisfy a formal compliance framework, but its defaults should be production-minded.

## Trust boundaries

```text
Browser (untrusted input)
    │ HTTPS + session cookie
    ▼
Web/API edge
    │ validated application requests
    ▼
Express service
    │ validated filters, projections, and atomic updates
    ▼
MongoDB
```

Every browser value is untrusted, including ObjectId strings, cents, dates, filter values, idempotency keys, and headers. UI restrictions are not authorization.

## Authentication

- Passwords are hashed with Argon2id using `argon2` 0.45.1 and explicit parameters: 19,456 KiB memory, two iterations, one lane, and a 32-byte hash output. These parameters are an accepted Phase 3 baseline and should be benchmarked again if the production runtime changes materially.
- The plaintext password is never logged or stored.
- Login responses do not reveal whether an email exists beyond the deliberately chosen generic failure message.
- Opaque session tokens are generated with a cryptographically secure source.
- Only a hash of each session token is stored in the database.
- Authentication state is carried in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie in production.
- Session identifiers rotate on successful authentication.
- Logout invalidates the server-side session, not only the browser cookie.
- Sessions expire after a configurable absolute lifetime; the default is seven days. Expiration is checked during authentication rather than relying on asynchronous MongoDB TTL deletion.

Registration can remain open for the assessment demo. A real public deployment would add email verification, abuse controls, password reset, and an account recovery design.

## Authorization and tenant isolation

Every order and payment operation is scoped through the authenticated user. Phase 4 implements this rule for every order CRUD/list/summary query and conditional write; Phase 5 extends the same rule to payment creation:

```text
requested order ID + current user ID -> authorized order or not found
```

Use a not-found response for another user's resource so the API does not confirm its existence. This ownership condition must be present in reads, conditional updates, deletes, payment insertion, and summary aggregation.

No controller accepts a `userId` from the browser as authority.

## CSRF

Cookie-authenticated state-changing requests need CSRF protection. The implemented baseline is:

- same-origin browser/API deployment through a rewrite or proxy;
- `SameSite=Lax` session cookie;
- strict `Origin` validation for unsafe methods;
- a CSRF token header if deployment topology or browser support requires defense in depth.

Do not use wildcard CORS with credentials. If cross-origin deployment becomes necessary, document the exact allowed origin and use an explicit CSRF mechanism before launch.

## Input validation

Validate at the HTTP boundary:

- request body shape and unknown fields;
- MongoDB ObjectId format for resources and UUID format for request/idempotency identifiers;
- email and password bounds;
- customer text length and normalization;
- line-item count, description length, positive quantity, and positive integer-cent price;
- date-only `dueDate` format and semantic validity;
- positive integer-cent payment amount;
- idempotency-key format and maximum length;
- filter allowlists, page sizes, and sort keys.

Database constraints remain necessary even when the request schema validates the same property.

## Payment integrity

Payment recording is a high-integrity path:

- include target order `_id`, authenticated `userId`, sufficient balance, and absence of the idempotency key in one update predicate;
- reject non-positive amounts before the write and diagnose a failed balance predicate with the current canonical balance;
- append the immutable embedded payment, decrement balance, increment payment count, and update the timestamp in one atomic document write;
- use an idempotency key unique within the relevant account or order scope;
- return the canonical committed order state;
- never retry a non-idempotent payment automatically from the browser.

An application-level balance read followed by an unconditional update is insufficient because simultaneous requests can both observe stale state. The final MongoDB write predicate is the authorization and concurrency boundary.

## Database safety

- Use a dedicated least-privileged Atlas database user for the API and separate higher-privilege credentials for controlled migrations.
- Restrict Atlas network access to the deployed API topology where the hosting platform permits it.
- Require TLS and certificate verification for hosted database connections.
- Build filters and updates from validated allowlisted fields; never accept arbitrary MongoDB operators or client-authored query objects.
- Prevent NoSQL injection by parsing resource identifiers, rejecting unknown fields, and constructing queries server-side.
- Apply validators and indexes through a controlled versioned release step.
- Confirm Atlas backup and point-in-time recovery capabilities for the selected production tier.
- Production connection strings and database credentials never appear in the repository, client bundle, documentation examples, or logs.

## API and browser hardening

The Express service configures:

- request body size limits;
- secure response headers through a maintained middleware or equivalent explicit policy;
- Helmet's safe API response-header policy, including a Content Security Policy on API responses;
- no technology-identifying header where avoidable;
- explicit CORS policy;
- rate limiting for general API traffic, login, and registration;
- sensible timeouts at platform and application boundaries;
- JSON content-type enforcement for JSON writes.

The web app must not render untrusted text as raw HTML. Align UI and React text rendering should remain escaped by default. A web-document CSP tailored to the final Next.js and Align UI asset requirements is a deployment hardening item; it must be verified against the production build before enabling it.

## Rate limits and abuse controls

Minimum controls:

| Surface      | Implemented Phase 3 policy                                     |
| ------------ | -------------------------------------------------------------- |
| Login        | 20 attempts per 15 minutes per IP plus normalized email        |
| Registration | 20 attempts per hour per IP; optional environment disable flag |
| General API  | 300 requests per 15 minutes per IP                             |
| Payment      | Conservative limit is added with the Phase 5 payment endpoint  |

The current counters are in-process and return `429` with a safe retry hint. A horizontally scaled deployment needs a shared edge or distributed limiter so thresholds remain meaningful across instances.

## Error handling

External errors expose only:

- a stable public error code;
- a user-safe message;
- field errors where relevant;
- a request ID for support correlation.

They do not expose stack traces, MongoDB driver messages, queries, environment values, session data, password hashes, or internal file paths.

## Logging and redaction

Structured logs may include request ID, route template, method, status, latency, authenticated user ID, and affected order ID when appropriate.

Always redact:

- `Cookie` and `Set-Cookie` headers;
- authorization and CSRF tokens;
- passwords and password hashes;
- raw session tokens;
- full request bodies by default;
- connection strings and environment secrets.

Payment amount and order identifier can be logged only if there is a concrete diagnostic need and retention is understood. Prefer event metadata over payload dumps.

## Secrets and configuration

- `.env.example` contains names and safe placeholders only.
- Keep local `.env*` files ignored.
- Store deployed secrets in platform secret management.
- Separate development, test, preview, and production databases.
- Fail fast on missing required environment variables.
- Never expose server-only values with a public frontend prefix.

## Dependency and supply-chain policy

- Commit the lockfile.
- Prefer maintained packages with narrow purposes.
- Run dependency and source scanning in CI if available.
- Review automated upgrade PRs rather than merging blindly.
- Do not run untrusted lifecycle scripts outside the normal package workflow.
- Pin production runtime versions.

## Security verification checklist

- User A cannot list, fetch, mutate, delete, or pay User B's order.
- A forged owner identifier has no effect.
- A duplicate payment idempotency key does not create a second payment.
- Simultaneous payments cannot make the balance negative.
- Payments cannot be changed or deleted.
- An order with payments cannot be edited or deleted.
- Cross-site unsafe requests are rejected.
- Expired and revoked sessions are rejected.
- Logout clears private frontend cache.
- Logs and error responses contain no secrets.
- Production cookies have the expected attributes.

## Deferred security capabilities

- multi-factor authentication;
- email verification and password reset;
- organization roles and invitations;
- formal audit-log UI;
- SSO;
- field-level encryption;
- regulatory compliance certification.

These are omissions from MVP scope, not claims that they are unnecessary in a larger financial system.
