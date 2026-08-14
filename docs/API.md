# REST API Specification

## 1. Scope and versioning

Express mounts the API under `/v1`. The reviewer-facing web origin exposes it through `/api/v1`.

Examples in this document show the public path:

```text
/api/v1/orders
```

## 2. General conventions

- JSON request and response bodies.
- UTF-8.
- Integer cents for money.
- `YYYY-MM-DD` for date-only fields.
- ISO 8601 UTC strings for timestamps.
- MongoDB ObjectIds serialized as 24-character lowercase hexadecimal resource identifiers.
- UUID request IDs and payment idempotency keys.
- Session authentication through an HttpOnly cookie.
- Unknown request properties are rejected on mutations.
- Authenticated responses use `Cache-Control: private, no-store`.
- Unsafe methods require an `Origin` header that exactly matches `APP_ORIGIN`.
- JSON writes require `Content-Type: application/json`; request bodies are limited to 32 KiB.
- Every response carries an `X-Request-Id`; a valid inbound request ID is preserved, otherwise the API generates a UUID.

## 3. Response envelopes

### Single resource

```json
{
  "data": {}
}
```

### Collection

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

### Error

```json
{
  "error": {
    "code": "PAYMENT_EXCEEDS_BALANCE",
    "message": "Payment exceeds the remaining order balance.",
    "details": {
      "remainingAmountCents": 60000
    },
    "requestId": "request-uuid"
  }
}
```

`details` may contain field errors or safe recovery data and must never contain stack traces, MongoDB queries, hashes, or secret values.

## 4. Authentication endpoints

### `POST /api/v1/auth/signup`

Request:

```json
{
  "email": "reviewer@example.com",
  "password": "a sufficiently strong password"
}
```

Behavior:

- Trim and lowercase email.
- Validate bounded email/password shape.
- Hash password with Argon2id.
- Create user and session.
- Set the session cookie.

Response: `201 Created` with the same public viewer envelope as `GET /auth/me`.

Errors:

- `409 EMAIL_ALREADY_REGISTERED`.
- `403 REGISTRATION_DISABLED` when registration is disabled by configuration.
- `422 VALIDATION_FAILED`.

### `POST /api/v1/auth/login`

Request:

```json
{
  "email": "reviewer@example.com",
  "password": "password"
}
```

Response: `200 OK` with current user and rotated session cookie.

Error: `401 INVALID_CREDENTIALS` with a generic message.

### `POST /api/v1/auth/logout`

- Deletes the current session when present.
- Clears the cookie.
- Is idempotent.

Response: `204 No Content`.

### `GET /api/v1/auth/me`

Response:

```json
{
  "data": {
    "id": "66bd00000000000000000001",
    "email": "reviewer@example.com",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

Errors:

- `401 AUTHENTICATION_REQUIRED` for a missing, unknown, expired, or revoked session.

The API never returns a password hash, raw session token, or stored session-token hash. The raw opaque token appears only in the HttpOnly cookie.

### Authentication limits

- General API requests: 300 requests per 15 minutes per IP.
- Login: 20 attempts per 15 minutes per IP plus normalized email.
- Signup: 20 attempts per hour per IP.

These counters are process-local in Phase 3. A multi-instance production deployment must replace or supplement them with a shared edge/distributed control.

## 5. Order representation

```json
{
  "id": "66bd00000000000000000002",
  "displayId": "ORD-A1B2C3D4",
  "customerName": "Acme Corporation",
  "dueDate": "2026-08-21",
  "status": "partially_paid",
  "totalAmountCents": 100000,
  "paidAmountCents": 40000,
  "balanceDueCents": 60000,
  "isEditable": false,
  "isDeletable": false,
  "createdAt": "2026-08-14T10:00:00.000Z",
  "updatedAt": "2026-08-14T10:05:00.000Z"
}
```

`displayId` may be derived from the ObjectId for presentation and is not a second database identity.

Phase 4 derives `displayId` as `ORD-` plus the last eight hexadecimal ObjectId characters in uppercase. `status`, `paidAmountCents`, `isEditable`, and `isDeletable` are server-authored derived values; none can be supplied by a client.

## 6. `GET /api/v1/orders/summary`

Response:

```json
{
  "data": {
    "totalOrders": 12,
    "outstandingAmountCents": 240000,
    "collectedAmountCents": 510000,
    "overdueAmountCents": 80000
  },
  "meta": {
    "asOfDate": "2026-08-14"
  }
}
```

All values are scoped to the authenticated user.

## 7. `GET /api/v1/orders`

Query parameters:

| Parameter   |     Default | Allowed                                               |
| ----------- | ----------: | ----------------------------------------------------- |
| `status`    |       `all` | `all`, `pending`, `partially_paid`, `paid`, `overdue` |
| `search`    |       empty | Bounded customer search string                        |
| `sort`      | `createdAt` | `createdAt`, `dueDate`, `totalAmount`                 |
| `direction` |      `desc` | `asc`, `desc`                                         |
| `page`      |         `1` | Positive integer                                      |
| `pageSize`  |        `10` | `10`, `25`, `50`                                      |

`search` is a normalized, escaped, anchored customer-name prefix. `totalAmount` maps internally to `totalAmountCents`; it is not a database field exposed to callers. Every sort includes `_id` as a deterministic same-direction tie-breaker. Status-filter semantics come from `DOMAIN_RULES.md` and use one UTC business date captured per request.

Response: collection of Order representations and pagination metadata.

## 8. `POST /api/v1/orders`

Request:

```json
{
  "customerName": "Acme Corporation",
  "dueDate": "2026-08-21",
  "items": [
    {
      "description": "Implementation service",
      "quantity": 2,
      "unitPriceCents": 50000
    }
  ]
}
```

The request contains no total. The server calculates it.

Response: `201 Created` with complete Order detail.

Errors:

- `422 VALIDATION_FAILED`.
- `401 AUTHENTICATION_REQUIRED`.

The API rejects client-authored totals, balances, status, ownership, payment state, timestamps, and line-item IDs or positions.

## 9. `GET /api/v1/orders/:orderId`

Response includes:

- Order representation.
- Ordered line items with derived line totals.
- Complete payment history, newest first.

Example item:

```json
{
  "id": "66bd00000000000000000003",
  "description": "Implementation service",
  "quantity": 2,
  "unitPriceCents": 50000,
  "lineTotalCents": 100000,
  "position": 0
}
```

Example payment:

```json
{
  "id": "66bd00000000000000000004",
  "amountCents": 40000,
  "paymentDate": "2026-08-14",
  "note": "Bank transfer",
  "createdAt": "2026-08-14T10:05:00.000Z"
}
```

Missing and unowned IDs both return `404 ORDER_NOT_FOUND`.

A malformed identifier returns `400 INVALID_RESOURCE_ID` before MongoDB is queried.

## 10. `PATCH /api/v1/orders/:orderId`

Only allowed before the first payment.

Request replaces the editable order document:

```json
{
  "customerName": "Acme Corporation",
  "dueDate": "2026-08-28",
  "items": [
    {
      "description": "Implementation service",
      "quantity": 3,
      "unitPriceCents": 50000
    }
  ]
}
```

Response: `200 OK` with recalculated Order detail.

Errors:

- `404 ORDER_NOT_FOUND`.
- `409 ORDER_LOCKED_AFTER_PAYMENT`.
- `422 VALIDATION_FAILED`.

This is a complete replacement of editable fields, not a sparse merge. Phase 4 does not implement an ETag/version precondition; a first committed payment causes the conditional update to return `409 ORDER_LOCKED_AFTER_PAYMENT`.

## 11. `DELETE /api/v1/orders/:orderId`

Only allowed before the first payment.

Response: `204 No Content`.

Errors:

- `404 ORDER_NOT_FOUND`.
- `409 ORDER_LOCKED_AFTER_PAYMENT`.

## 12. `POST /api/v1/orders/:orderId/payments`

Header:

```text
Idempotency-Key: client-generated-uuid
```

The header is required for every payment request. A missing or malformed key returns `422 VALIDATION_FAILED`.

Request:

```json
{
  "amountCents": 40000,
  "paymentDate": "2026-08-14",
  "note": "Bank transfer"
}
```

New payment response: `201 Created`.

```json
{
  "data": {
    "payment": {
      "id": "66bd00000000000000000004",
      "amountCents": 40000,
      "paymentDate": "2026-08-14",
      "note": "Bank transfer",
      "createdAt": "2026-08-14T10:05:00.000Z"
    },
    "order": {
      "id": "66bd00000000000000000002",
      "status": "partially_paid",
      "totalAmountCents": 100000,
      "paidAmountCents": 40000,
      "balanceDueCents": 60000
    }
  }
}
```

Idempotent replay:

- `200 OK`.
- Same response representation.
- `Idempotency-Replayed: true`.

Errors:

- `404 ORDER_NOT_FOUND`.
- `409 IDEMPOTENCY_KEY_REUSED`.
- `422 PAYMENT_EXCEEDS_BALANCE` with `remainingAmountCents`.
- `422 ORDER_ALREADY_PAID` with a zero remaining balance.
- `422 VALIDATION_FAILED`.
- `503 PAYMENT_TEMPORARILY_UNAVAILABLE` for a retryable MongoDB availability/write failure.

## 13. `GET /health`

Unauthenticated operational endpoint.

Response:

```json
{
  "status": "ok"
}
```

It must not return secrets, connection strings, build environment values, or detailed database metadata.

## 14. Validation error details

Example:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Please correct the highlighted fields.",
    "details": {
      "fields": {
        "items.0.quantity": ["Quantity must be at least 1."],
        "dueDate": ["Due date must be a valid YYYY-MM-DD date."]
      }
    },
    "requestId": "request-uuid"
  }
}
```

## 15. HTTP status summary

| Status | Use                                                     |
| -----: | ------------------------------------------------------- |
|    200 | Successful read/update/login/idempotent replay          |
|    201 | Created user/order/payment                              |
|    204 | Successful logout/delete with no body                   |
|    400 | Malformed JSON, malformed ID, unsupported query syntax  |
|    401 | Missing, invalid, or expired session                    |
|    403 | Origin rejected or registration disabled                |
|    404 | Missing or unowned resource                             |
|    409 | State or idempotency conflict                           |
|    413 | JSON request body exceeds the 32 KiB limit              |
|    422 | Valid JSON with invalid fields or domain rule violation |
|    415 | JSON write sent with an unsupported media type          |
|    429 | Rate limited                                            |
|    500 | Unexpected safe server error                            |
|    503 | Temporary payment/database write unavailability         |

## 16. Compatibility rules

- Additive response fields are allowed within v1.
- Do not rename/remove fields or change units without a versioned contract change.
- Stable machine-readable error codes are part of the API contract.
- UI copy may be more explanatory than API messages but must preserve the server's recovery data.
