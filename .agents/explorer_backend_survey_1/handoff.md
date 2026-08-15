# Backend Survey Handoff Report

## 1. Observation
- **Routes & Handlers**:
  - `POST /v1/orders`: `apps/api/src/modules/orders/routes.ts:58-65` creates orders from `createOrderRequestSchema`.
  - `PATCH /v1/orders/:orderId`: `apps/api/src/modules/orders/routes.ts:96-107` performs full replacement edit for unpaid orders using `replaceOrderRequestSchema`.
  - `DELETE /v1/orders/:orderId`: `apps/api/src/modules/orders/routes.ts:109-116` deletes unpaid orders.
  - `POST /v1/orders/:orderId/payments`: `apps/api/src/modules/orders/routes.ts:67-83` records payments with `paymentRateLimit` and mandatory `Idempotency-Key` header.
  - `GET /v1/orders`, `GET /v1/orders/summary`, `GET /v1/orders/:orderId`: query routes implemented with pagination, prefix search, and ownership scoping.
- **Domain Logic & Invariants**:
  - `apps/api/src/modules/orders/domain.ts:146-192`: `prepareOrderDraft` calculates line items `lineTotalCents = quantity * unitPriceCents` and total `totalAmountCents`, enforcing integer bounds (`maximumOrderAmountCents = 999_999_999`) and leap-year canonical date validation (`isCanonicalDateOnly`).
  - `apps/api/src/modules/orders/domain.ts:194-212`: `deriveOrderStatus` derives `paid`, `overdue`, `partially_paid`, and `pending` dynamically (`paid` precedes `overdue`, due today is not overdue).
  - `apps/api/src/modules/orders/service.ts:180-213`: `OrderService.replace` executes `findOneAndUpdate` with `{ _id: orderId, userId, paymentCount: 0 }`.
  - `apps/api/src/modules/orders/service.ts:215-225`: `OrderService.delete` executes `deleteOne` with `{ _id: orderId, userId, paymentCount: 0 }`.
  - `apps/api/src/modules/orders/service.ts:400-424`: `throwConditionalMiss` differentiates missing/unowned (404 `ORDER_NOT_FOUND`) from paid/locked (409 `ORDER_LOCKED_AFTER_PAYMENT`).
  - `apps/api/src/modules/orders/service.ts:227-346`: `OrderService.recordPayment` handles idempotency replay, SHA-256 fingerprint checking, single-statement atomic updates (`$inc` and `$push`), and actionable 422 errors (`PAYMENT_EXCEEDS_BALANCE`, `ORDER_ALREADY_PAID` with `remainingAmountCents`).
- **Database Enforcement**:
  - `apps/api/src/db/validators/collection-validators.ts:82-236`: Strict JSON Schema validator enforces `$lte: ["$balanceDueCents", "$totalAmountCents"]`, `$eq: ["$paymentCount", { $size: "$payments" }]`, `$eq: [{ $subtract: ["$totalAmountCents", "$balanceDueCents"] }, { $sum: "$payments.amountCents" }]`.
- **Test Executions**:
  - `pnpm typecheck`: Passed cleanly across all packages.
  - `pnpm lint`: Passed cleanly across all packages.
  - `pnpm test`: Passed 28/28 unit tests across 8 files.
  - `pnpm test:integration`: Passed 31/31 integration tests against MongoDB Atlas across 4 test suites (migrations, auth, orders, payments).
  - `pnpm build`: Clean production build across contracts, api, and web.

## 2. Logic Chain
1. From inspecting `apps/api/src/modules/orders/service.ts` and `apps/api/src/modules/orders/routes.ts`, order creation, unpaid replacement edit, and deletion are already fully implemented on the backend.
2. From checking the query predicates `{ _id: orderId, userId, paymentCount: 0 }` and `throwConditionalMiss`, the `paymentCount === 0` guard is enforced atomically in MongoDB, eliminating race conditions with racing payments and returning 409 `ORDER_LOCKED_AFTER_PAYMENT` on violation.
3. From checking `apps/api/src/modules/orders/domain.ts`, line items are recalculated authoritatively by the backend using integer cents arithmetic and overflow checks, rejecting any client-supplied totals or statuses.
4. From checking `OrderService.recordPayment` and `apps/api/tests/orders/payments.integration.test.ts`, atomic single-document updates decrement balance and append payment ledgers while guaranteeing idempotency replay and actionable remaining balance reporting.
5. In `apps/web/features/orders/api.ts`, the frontend query client currently implements reads and payment recording, while `createOrder`, `replaceOrder`, and `deleteOrder` mutation wrappers remain to be added in Phase 8.

## 3. Caveats
- **HTTP Method for Replacement Edit**: The backend route in `apps/api/src/modules/orders/routes.ts` is mounted as `PATCH /:orderId` matching `docs/API.md` Section 10. The prompt mentions "replacement edit (PUT /orders/:id)". The backend can easily support `PUT` alongside `PATCH` if preferred by the frontend.
- **MongoDB Atlas Required for Integration Tests**: Integration tests require `MONGODB_URI` or `MONGODB_TEST_URI`. During this survey, real MongoDB Atlas connection was verified and all 31 integration tests passed.

## 4. Conclusion
The backend (`apps/api`) and shared contracts (`packages/contracts`) are completely implemented, robust, and verified for all order and payment workflows through Phases 1-7. The backend endpoints and domain services already handle `POST /v1/orders`, `PATCH /v1/orders/:orderId`, `DELETE /v1/orders/:orderId`, and `POST /v1/orders/:orderId/payments` with strict atomic safeguards and comprehensive error handling. Phase 8 (order creation, edit, and delete UI) can proceed seamlessly without requiring backend architectural changes.

## 5. Verification Method
1. Run static analysis: `pnpm typecheck` and `pnpm lint`.
2. Run unit test suites: `pnpm test`.
3. Run live integration tests against MongoDB: `pnpm test:integration`.
4. Run full production build: `pnpm build`.
5. Inspect detailed findings in `.agents/explorer_backend_survey_1/survey_report.md`.
