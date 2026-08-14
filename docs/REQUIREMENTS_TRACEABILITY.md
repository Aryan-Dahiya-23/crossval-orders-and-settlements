# Requirements Traceability

## Purpose

This matrix maps each product requirement to its design location and verification. It is the quickest way to detect a requirement that is described but neither owned nor tested.

Phase 4 status: AUTH-01 and AUTH-02 remain verified by real-MongoDB integration tests plus a live browser smoke. AUTH-03 and ORD-01 through ORD-10 are implemented and verified for the order surface. STA-01 through STA-05 are implemented in shared domain/mapping/query helpers and verified by unit plus Atlas integration tests. Payment ownership and payment workflow requirements remain Phase 5 work; frontend order/dashboard requirements remain later phases.

| ID      | Requirement                                             | Design source                                | API/data surface                           | Verification                          |
| ------- | ------------------------------------------------------- | -------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| AUTH-01 | User can register when registration is enabled          | `PRODUCT_REQUIREMENTS.md`, `SECURITY.md`     | Auth endpoints, User, Session              | API integration + E2E smoke           |
| AUTH-02 | User can log in and log out securely                    | `SECURITY.md`, `FRONTEND.md`                 | Session cookie and auth endpoints          | API integration + E2E                 |
| AUTH-03 | One user cannot access another user's data              | `SECURITY.md`, `DOMAIN_RULES.md`             | Every order/payment query scoped by user   | Cross-user API matrix                 |
| ORD-01  | User can create an order with one or more items         | `PRODUCT_REQUIREMENTS.md`, `DOMAIN_RULES.md` | `POST /orders`, Order, LineItem            | Unit + API + E2E-01                   |
| ORD-02  | Server calculates line and order totals                 | `DOMAIN_RULES.md`, `DATABASE.md`             | Integer-cent computations and stored total | Unit + API integration                |
| ORD-03  | User can list their orders                              | `API.md`, `FRONTEND.md`                      | `GET /orders`                              | API + component + E2E                 |
| ORD-04  | User can filter by status                               | `PRODUCT_REQUIREMENTS.md`, `FRONTEND.md`     | `status` query parameter                   | API + component                       |
| ORD-05  | User can search, sort, and paginate                     | `API.md`, `FRONTEND.md`                      | List query parameters and indexes          | API + component                       |
| ORD-06  | User can view order items and payment history           | `UI_UX.md`, `API.md`                         | `GET /orders/:id`                          | API + component + E2E                 |
| ORD-07  | Unpaid order can be edited                              | `DOMAIN_RULES.md`, `API.md`                  | Conditional update with `paymentCount: 0`  | API integration                       |
| ORD-08  | Order with any payment cannot be edited                 | `DOMAIN_RULES.md`, `DECISIONS.md`            | Same-document predicate recheck            | Race + API + E2E-05                   |
| ORD-09  | Unpaid order can be deleted                             | `DOMAIN_RULES.md`, `API.md`                  | Conditional delete with `paymentCount: 0`  | API + E2E                             |
| ORD-10  | Order with any payment cannot be deleted                | `DOMAIN_RULES.md`, `DECISIONS.md`            | Same-document predicate recheck            | Race + API + E2E-05                   |
| PAY-01  | User can record a partial payment                       | `PRODUCT_REQUIREMENTS.md`, `API.md`          | `POST /orders/:id/payments`                | API + E2E-02                          |
| PAY-02  | User can complete settlement                            | `DOMAIN_RULES.md`                            | Same payment endpoint                      | API + E2E-02                          |
| PAY-03  | Overpayment is rejected                                 | `DOMAIN_RULES.md`, `SECURITY.md`             | Locked balance validation                  | API + race + E2E-03                   |
| PAY-04  | Simultaneous payments cannot create a negative balance  | `ARCHITECTURE.md`, `DATABASE.md`             | Conditional atomic order update            | Concurrency scenarios A/B             |
| PAY-05  | Retried payment does not duplicate                      | `API.md`, `DECISIONS.md`                     | Idempotency key constraint                 | API + concurrency scenario C          |
| PAY-06  | Payments are immutable                                  | `DOMAIN_RULES.md`, `DECISIONS.md`            | No update/delete endpoints                 | Route absence + API policy test       |
| STA-01  | Pending is derived correctly                            | `DOMAIN_RULES.md`                            | Status expression                          | Unit status table + API               |
| STA-02  | Partially paid is derived correctly                     | `DOMAIN_RULES.md`                            | Status expression                          | Unit status table + API               |
| STA-03  | Paid is derived correctly                               | `DOMAIN_RULES.md`                            | Status expression                          | Unit status table + API               |
| STA-04  | Overdue is derived from server business date            | `DOMAIN_RULES.md`, `DECISIONS.md`            | Status expression/date policy              | Frozen-time unit + E2E-04             |
| STA-05  | Status is consistent in list, summary, and detail       | `ARCHITECTURE.md`, `DATABASE.md`             | Shared domain/query policy                 | Cross-endpoint integration            |
| DASH-01 | Dashboard shows total, paid, due, due date, status      | `PRODUCT_REQUIREMENTS.md`, `UI_UX.md`        | List and summary endpoints                 | Component + E2E                       |
| DASH-02 | Dashboard shows financial summary cards                 | `UI_UX.md`, `API.md`                         | Summary endpoint                           | API + component                       |
| DASH-03 | Detail presents full payment history                    | `UI_UX.md`                                   | Order detail response                      | API + E2E-02                          |
| UX-01   | All async states are intentionally designed             | `FRONTEND.md`, `UI_UX.md`                    | React Query request states                 | Component tests                       |
| UX-02   | Core journeys work on mobile and desktop                | `UI_UX.md`                                   | Responsive frontend                        | Playwright viewport smoke             |
| UX-03   | Core interactions are keyboard accessible               | `UI_UX.md`                                   | Semantic components                        | Component + accessibility pass        |
| FE-01   | React Query manages server state                        | `FRONTEND.md`, `DECISIONS.md`                | Query client, keys, hooks                  | Architecture review + component tests |
| FE-02   | Payment cache is updated only from committed state      | `FRONTEND.md`                                | Payment mutation policy                    | Component conflict/success tests      |
| FE-03   | Logout clears user-scoped cache                         | `FRONTEND.md`, `SECURITY.md`                 | Auth mutation/query client                 | Component + E2E                       |
| NFR-01  | Money uses integer cents                                | `DOMAIN_RULES.md`, `DECISIONS.md`            | API contracts and integer DB fields        | Unit + schema review                  |
| NFR-02  | Coupled financial fields update atomically              | `ARCHITECTURE.md`, `DATABASE.md`             | MongoDB single-document atomicity          | Integration + race tests              |
| NFR-03  | API errors are consistent and safe                      | `API.md`, `SECURITY.md`                      | Standard error envelope                    | Contract tests                        |
| NFR-04  | Passwords and sessions are stored securely              | `SECURITY.md`, `DATABASE.md`                 | Argon2id, hashed session tokens            | Integration + manual review           |
| NFR-05  | Deployment uses HTTPS and safe cookie settings          | `DEPLOYMENT.md`, `SECURITY.md`               | Platform and cookie config                 | Deployment smoke test                 |
| NFR-06  | Setup, migration, seed, and test steps are reproducible | `README.md`, `DEPLOYMENT.md`                 | Scripts added during implementation        | Clean-environment rehearsal           |

## Traceability rules

- New requirements receive an ID and a row before implementation is considered complete.
- Any change to a financial invariant updates `DOMAIN_RULES.md`, `DATABASE.md`, `API.md`, tests, and this matrix.
- A requirement is not complete merely because a UI element exists; its authoritative API/data behavior and test must also exist.
- If a requirement is consciously removed, mark it out of scope in product requirements and record the decision rather than deleting evidence silently.

## Assignment acceptance walkthrough

The final review should demonstrate this single coherent story:

1. Log in and see summary totals plus varied statuses.
2. Create a multi-item 1,000.00 USD order and verify server-calculated totals.
3. Record 400.00 and observe Partially paid with 600.00 due.
4. Attempt an overpayment and show it is rejected without changing history.
5. Record 600.00 and observe Paid with zero due.
6. Show that edit/delete are unavailable after payment.
7. Explain and run the concurrency test proving simultaneous payments cannot overpay.

This walkthrough connects the visible dashboard to the system's strongest engineering decisions.
