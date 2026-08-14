# Domain Rules

## 1. Purpose

This is the authoritative specification for money, orders, statuses, dates, payments, locking, idempotency, and financial invariants.

## 2. Vocabulary

| Term           | Meaning                                                 |
| -------------- | ------------------------------------------------------- |
| Order total    | Sum of quantity × unit price for every line item        |
| Balance due    | Amount still owed on an order                           |
| Amount paid    | Order total minus balance due                           |
| Payment ledger | Append-only Payment subdocuments embedded in an order   |
| Due today      | `dueDate` equals the current UTC calendar date          |
| Past due       | `dueDate` is earlier than the current UTC calendar date |
| Locked order   | An order with at least one committed payment            |

## 3. Currency and money

- Currency is fixed to USD.
- UI currency fields are decimal strings, such as `"123.45"`.
- API money values are integer cents, such as `12345`.
- Database money values are integer cents.
- Authoritative calculations never use JavaScript floating point.
- Formatting happens only at presentation boundaries.
- One cent is the minimum unit.
- Negative values are not supported.
- Establish a documented maximum, initially recommended as `999999999` cents (`$9,999,999.99`).

### Decimal-string parsing

Accepted examples:

```text
1
1.2
1.20
0.01
123.45
```

Rejected examples:

```text
0
-1.00
1.234
1e3
$12.00
NaN
Infinity
```

The browser converts accepted strings to cents before sending. The server still validates that received cents are bounded integers.

## 4. Order mathematics

For each line:

```text
lineTotalCents = quantity × unitPriceCents
```

For the order:

```text
totalAmountCents = sum(lineTotalCents)
balanceDueCents = totalAmountCents at creation
```

Requirements:

- At least one item.
- Quantity is an integer `>= 1`.
- Unit price is an integer `>= 1` cent.
- Multiplication and addition must remain within safe, documented bounds.
- The server recalculates all totals.
- Line total and subtotal are derived and need not be stored.

## 5. Materialized balance invariant

The Order stores `totalAmountCents` and `balanceDueCents`.

Always true:

```text
0 <= balanceDueCents <= totalAmountCents
amountPaidCents = totalAmountCents - balanceDueCents
sum(Payment.amountCents) = amountPaidCents
sum(Payment.amountCents) <= totalAmountCents
```

The MongoDB collection validator checks basic balance bounds. The payment service's atomic single-document update and reconciliation tests maintain ledger equality.

## 6. Date semantics

- `dueDate` and `paymentDate` are date-only values.
- API representation is `YYYY-MM-DD`.
- MongoDB stores each date-only value as a canonical fixed-width string so indexing and comparison do not introduce timezone shifts.
- `createdAt` and `updatedAt` are UTC timestamps.
- Overdue comparison uses the current UTC date.
- Due today is not overdue.
- Overdue begins at `00:00 UTC` on the day after the due date.
- Payment dates may be today or in the past.
- Future payment dates are rejected.
- Past due dates are allowed at order creation to support historical/backfilled orders and demo data.
- Payment date does not determine current status; committed amount and current date do.

The frontend must not create a local midnight timestamp from a date-only value and then reserialize it. It should preserve the date string or use a date-only parser.

## 7. Status derivation

Status is never accepted as an editable request field and is not persisted.

Decision order:

```text
if balanceDueCents == 0
  paid
else if dueDate < todayUTC
  overdue
else if at least one payment exists
  partially_paid
else
  pending
```

Decision table:

| Payment/balance state          | Due-date state  | Status           |
| ------------------------------ | --------------- | ---------------- |
| No payment, full balance       | Today or future | `pending`        |
| Some payment, positive balance | Today or future | `partially_paid` |
| Zero balance                   | Any             | `paid`           |
| Positive balance               | Past            | `overdue`        |

Edge cases:

- No payment and past due → `overdue`.
- Partial payment and past due → `overdue`.
- Previously overdue then fully paid → `paid`.
- Exact remaining payment → `paid`.
- Due today with no payment → `pending`.
- Due today with partial payment → `partially_paid`.

## 8. Order creation

Required fields:

- Customer name.
- Due date.
- One or more line items.

Server behavior:

1. Validate bounded request shape.
2. Calculate every total in cents.
3. Insert one Order document containing its embedded line items, empty payment array, zero payment count, and full initial balance.
4. Return a server-authored representation with derived fields.

No zero-total orders are allowed.

## 9. Order editing

### Before the first payment

The user may edit:

- Customer name.
- Due date.
- Line-item descriptions.
- Quantities.
- Unit prices.
- Item order.

The edit operation:

1. Recalculates and validates the proposed document outside the database write.
2. Uses one conditional update scoped by order `_id`, authenticated `userId`, and `paymentCount: 0`.
3. Replaces editable fields, embedded line items, total, balance, normalized customer name, and timestamp together.
4. Returns the committed document or diagnoses not-found versus payment-lock failure.

MongoDB serializes writes to the same document and rechecks the match predicate. If a payment commits first, `paymentCount: 0` no longer matches. If the edit commits first, the payment operates against the new total.

### After the first payment

The entire order is immutable.

Reasoning:

- Changing price or quantity changes the settled document.
- Changing due date changes overdue semantics.
- The customer string is the document's only customer identity.
- Selective editability would add ambiguous accounting behavior without a corresponding amendment history.

The API returns `409 ORDER_LOCKED_AFTER_PAYMENT`.

## 10. Order deletion

- An unpaid order may be deleted after confirmation.
- An order with a Payment may not be deleted.
- Deletion uses one conditional `deleteOne` scoped by order `_id`, authenticated `userId`, and `paymentCount: 0`.
- A concurrent payment and deletion cannot both act on an unpaid state: whichever document write wins changes or removes the match for the other.
- Embedded line items and payments require no cascade or orphan cleanup.
- There is no user-facing archive requirement in scope.

## 11. Payment creation

Required fields:

- `amountCents >= 1`.
- Valid non-future `paymentDate`.
- A bounded UUID-format `Idempotency-Key` header.
- Optional bounded note.

Payments are:

- Positive.
- Immutable.
- Append-only.
- Owned indirectly through the order.

There are no update or delete operations. Corrections require refund/reversal semantics, which are out of scope.

### Atomic update procedure

1. Validate the transport shape outside the database write.
2. Normalize note/date and calculate the idempotency fingerprint.
3. Generate the embedded Payment ObjectId and timestamp.
4. Check for an existing payment with the idempotency key so a completed request can replay.
5. Call `findOneAndUpdate` with order `_id`, authenticated `userId`, `balanceDueCents >= amount`, and absence of the idempotency key in its match predicate.
6. In the same update, decrement balance, increment payment count, append the embedded Payment, and set `updatedAt`.
7. Return the post-update canonical document when matched.
8. If unmatched, perform a diagnostic owned-order read and return replay, idempotency conflict, already-paid, overpayment, or not-found behavior.

The balance projection and embedded ledger change in one atomic MongoDB document write. The diagnostic read never performs a write without repeating the full atomic predicate.

## 12. Concurrent payments

Scenario:

```text
balanceDueCents = 50000
request A = 40000
request B = 40000
```

Expected result:

- One request atomically matches and commits.
- The other request's balance predicate is rechecked after the first write and no longer matches.
- Final balance is `10000`.
- Exactly one new embedded Payment exists.
- The error advertises `remainingAmountCents: 10000`.

No implementation may use a read-validate-write sequence whose final update omits the current-balance and idempotency predicates.

## 13. Payment idempotency

- Every payment caller sends an `Idempotency-Key` header; omission is a validation error.
- Recommended key format is a UUID generated per logical submission.
- Scope is `(orderId, idempotencyKey)`.
- The normalized payload is fingerprinted from amount, payment date, and normalized note.
- A unique multikey index cannot guarantee uniqueness within one document's payment array, so the conditional update enforces the rule.

Behavior:

| Condition                          | Result                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| New key                            | Create Payment, return 201                             |
| Same key and same fingerprint      | Return original Payment, return 200 with replay header |
| Same key and different fingerprint | Return 409 `IDEMPOTENCY_KEY_REUSED`                    |

The UI retains the same key while retrying an ambiguous network/server failure. A materially edited form begins a new logical attempt and receives a new key.

## 14. Dashboard aggregates

For the authenticated user:

```text
totalOrders = count(Order)
outstandingAmountCents = sum(balanceDueCents)
collectedAmountCents = sum(totalAmountCents) - sum(balanceDueCents)
overdueAmountCents = sum(balanceDueCents where dueDate < today and balance > 0)
```

No fabricated growth percentages or unrequested analytics are included.

## 15. Ownership

- User owns Orders directly.
- User owns OrderItems and Payments through Order.
- Every read and mutation query scopes by authenticated `userId`.
- Another user's order behaves like a nonexistent order and returns 404.
- Payment creation never accepts a user ID from the client.

## 16. Domain error codes

At minimum:

```text
ORDER_NOT_FOUND
ORDER_LOCKED_AFTER_PAYMENT
PAYMENT_EXCEEDS_BALANCE
ORDER_ALREADY_PAID
IDEMPOTENCY_KEY_REUSED
PAYMENT_TEMPORARILY_UNAVAILABLE
VALIDATION_FAILED
AUTHENTICATION_REQUIRED
```

Error transport details are defined in `API.md`.
