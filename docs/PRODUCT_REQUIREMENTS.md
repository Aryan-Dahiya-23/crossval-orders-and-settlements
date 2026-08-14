# Product Requirements

## 1. Product summary

CrossVal Orders & Settlements is a focused B2B finance workspace where an authenticated user can create customer orders, collect one or more payments, and understand what has been paid, what remains, and what is overdue.

The primary audience for this version is the assignment reviewer. The product must still feel internally coherent and production-minded rather than like a collection of disconnected CRUD screens.

## 2. Product goals

- Make order creation and partial settlement immediately understandable.
- Give users a reliable view of totals, collected amounts, outstanding balances, due dates, and status.
- Prevent invalid financial state even under concurrent requests.
- Protect each user's data from every other user.
- Demonstrate strong full-stack judgment within a deliberately small scope.
- Make the assignment's sample scenario quick to reproduce.

## 3. Non-goals

- Accounting ledger or general ledger integration.
- Invoicing, tax, discounts, multiple currencies, or exchange rates.
- Customer account management beyond a customer-name string.
- Organizations, teams, roles, invitations, or permissions beyond ownership.
- Refunds, payment reversals, chargebacks, or payment-provider integration.
- Recurring orders or subscriptions.
- Notifications, queues, schedulers, or real-time collaboration.
- Persisted status workflows.
- Full audit/event-sourcing infrastructure.

## 4. Primary user

An authenticated operator who creates and settles their own customer orders.

The user expects:

- Their data to be private.
- Totals to be correct.
- Payment attempts to be safe to retry.
- The system to clearly explain why an action cannot be completed.
- Financial state to update without requiring a manual page reload.

## 5. Core user journeys

### 5.1 Join and authenticate

1. User signs up with email and password.
2. User is signed in through a secure session.
3. User can refresh the browser without losing the session.
4. User can log out and invalidate the session.

Acceptance criteria:

- Duplicate normalized email is rejected clearly.
- Invalid credentials do not reveal which field was wrong.
- Unauthenticated users cannot access dashboard data.
- User A never sees or mutates User B's resources.

### 5.2 Review the dashboard

1. User opens the dashboard.
2. User sees Total Orders, Outstanding Amount, Collected Amount, and Overdue Amount.
3. User sees an orders table with customer, total, paid, due, due date, status, and actions.
4. User filters by status and may search by customer.
5. User opens an order detail page.

Acceptance criteria:

- Status filter supports All, Pending, Partially Paid, Paid, and Overdue.
- Summary values are based only on the authenticated user's orders.
- Loading, initial-empty, filtered-empty, error, and background-refresh states are distinguishable.
- Filters, sort, search, and pagination survive navigation through URL parameters.

### 5.3 Create an order

1. User starts a dedicated creation page.
2. User enters customer and due date.
3. User adds one or more line items.
4. User enters description, quantity, and unit price for each item.
5. UI previews line totals and order total.
6. Server independently validates and calculates the final total.
7. User lands on the created order detail.

Acceptance criteria:

- At least one valid line item is required.
- Quantity is an integer greater than or equal to one.
- Unit price is at least one cent.
- Floating-point values are not authoritative.
- Client-authored total fields are not accepted.
- The created representation comes from the server.

### 5.4 Edit or delete an unpaid order

1. User opens an unpaid order.
2. User may edit customer, due date, and line items.
3. User may delete the order after confirmation.

Acceptance criteria:

- Updated totals are recalculated on the server.
- Update and deletion are rejected after the first payment.
- The same rule is enforced through the REST API, not merely hidden in the UI.
- An edit/delete racing with the first payment cannot corrupt the order.

### 5.5 Record a partial or full payment

1. User opens the Record Payment modal.
2. User sees total, already paid, remaining, and maximum allowed.
3. User enters amount, payment date, and optional note.
4. User submits once; the UI prevents accidental duplicate interaction.
5. Server locks and re-reads the current order before validating.
6. Payment and balance update commit together.
7. Detail, dashboard, and summary data refresh.

Acceptance criteria:

- Amount is at least one cent.
- Multiple payments are supported.
- Exact remaining amount settles the order.
- Overpayment returns the current maximum allowed amount.
- Two concurrent payments cannot make total payments exceed the order total.
- Retrying a successful request with the same idempotency key does not create a second payment.
- Complete payment history remains visible.

## 6. Status requirements

Supported values:

```text
pending
partially_paid
paid
overdue
```

Status is deterministic, derived, and not editable. Exact rules are authoritative in `DOMAIN_RULES.md`.

Required transitions/scenarios:

```text
pending → partially_paid
partially_paid → paid
pending → overdue
partially_paid → overdue
overdue → paid
```

## 7. Dashboard requirements

### Required metrics

- Total Orders: count of all owned orders.
- Outstanding Amount: sum of all owned order balances greater than zero.
- Collected Amount: sum of order total minus current balance.
- Overdue Amount: sum of balances for past-due, not-fully-paid orders.

### Required table columns

- Customer.
- Order Total.
- Amount Paid.
- Amount Due.
- Due Date.
- Status.
- Actions.

### Optional table behavior included in scope

- Customer search.
- Due-date/created-date/total sorting.
- Server pagination.
- Status counts only if they can be produced without slowing core delivery.

## 8. Order detail requirements

The detail page must immediately communicate:

- Customer.
- Stable order identifier.
- Derived status.
- Due date.
- Order total.
- Amount paid.
- Amount due.
- All line items.
- Complete payment history.
- Allowed actions.
- Why edit/delete actions are unavailable after payment.

## 9. API requirements

- REST endpoints for authentication and order CRUD.
- Dedicated nested endpoint to record a payment.
- Server-side validation on every mutation.
- Consistent structured errors with recovery hints.
- Correct HTTP status codes.
- Pagination/filter metadata where relevant.
- No ownership leakage.

See `API.md`.

## 10. Non-functional requirements

### Correctness

- All money math uses integer cents.
- Database and application invariants agree.
- Payment writes atomically update the balance projection and embedded ledger.
- Derived status is tested at date boundaries.

### Security

- Secure password hashing.
- Opaque revocable sessions.
- HttpOnly cookie.
- Ownership embedded in queries.
- Safe error responses.
- Strict validation and bounded input.

### Usability

- Primary workflows are keyboard accessible.
- Loading and errors preserve context.
- Mobile layouts remain functional even when tables scroll.
- Financial values are consistently formatted.
- Duplicate submission is visibly prevented.

### Maintainability

- Small cohesive modules.
- No speculative abstraction layers.
- Shared contracts only where boundaries genuinely overlap.
- Documentation stays synchronized with behavior.

### Reviewer experience

- Straightforward local setup.
- Useful seed data.
- Public live URL.
- Clear README and documented tradeoffs.
- Core workflow testable within minutes.

## 11. Assignment verification scenario

The implementation is not complete until this exact flow works:

1. Create an order for `2 × $500.00` with a `$1,000.00` total.
2. Record `$400.00` and observe `partially_paid`, `$600.00` due.
3. Record `$600.00` and observe `paid`, `$0.00` due.
4. Attempt `$1.00` and receive an actionable rejection.

## 12. Success criteria

The submission succeeds when:

- Every mandatory assignment requirement is traceable to a test or manual verification.
- The concurrent payment invariant is demonstrably protected.
- The UI feels like one intentional finance product.
- The deployed app has no sleeping-service delay that harms first review.
- A new reviewer can understand the important engineering decisions from the repository alone.
