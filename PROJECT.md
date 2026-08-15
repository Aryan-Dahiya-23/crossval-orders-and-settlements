# Project: CrossVal Orders & Settlements

## Architecture
- **Web App**: Next.js App Router (`apps/web`) with Align UI primitives, React Hook Form, Zod, and TanStack React Query.
- **API**: Express.js with TypeScript (`apps/api`) with direct MongoDB driver handles, strict schema validators, and named compound indexes.
- **Shared Contracts**: `@crossval/contracts` with Zod boundary schemas, domain status enums, and API error codes.
- **State Management**: React Query for server state (dashboard lists, order details, portfolio summary metrics) and local state for dialogs/forms.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Order Creation Page (`/orders/new`) | Page with customer details, order dates, and dynamic line items table | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Dynamic Line-Item Management | Add, remove, and update line items dynamically with React Hook Form | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Real-Time Subtotal & Total Preview | Instant client-side integer-cent subtotal and total calculations as user types | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Order Creation API Integration | `useCreateOrder` React Query mutation posting to `POST /orders` with cache invalidation | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Order Detail Action Bar | Action bar on `/orders/[orderId]` with Edit and Delete buttons | M1 | ORIGINAL_REQUEST §R1 |
| 6 | Order Replacement Edit Page (`/orders/[orderId]/edit`) | Prefilled form for updating unpaid orders via `PATCH /orders/:id` | M1 | ORIGINAL_REQUEST §R1 |
| 7 | Unpaid Edit/Delete Guards | UI disabling and contextual explanation when `paymentCount > 0` / order is locked | M1 | ORIGINAL_REQUEST §R1 |
| 8 | Order Deletion Confirmation Dialog | Accessible modal dialog confirming deletion before calling `DELETE /orders/:id` | M1 | ORIGINAL_REQUEST §R1 |
| 9 | Order Deletion Mutation & Redirect | `useDeleteOrder` mutation invalidating list/summary queries and redirecting to dashboard | M1 | ORIGINAL_REQUEST §R1 |
| 10 | Payment Dialog UX | "Use remaining balance" shortcut button, dynamic balance feedback | M2 | ORIGINAL_REQUEST §R2 |
| 11 | Client-Side Idempotency Key Preservation | Preserve idempotency UUID across retries until success or modal close | M2 | ORIGINAL_REQUEST §R2 |
| 12 | Settlement Cache Reconciliation | Invalidate `orderKeys.detail(id)`, `orderKeys.lists()`, `orderKeys.summaries()` on payment | M2 | ORIGINAL_REQUEST §R2 |
| 13 | Core Assignment Flow Verification | $1,000 order → $400 payment → $600 settlement → reject $1 overpayment | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Opaque-Box E2E Test Suite | Comprehensive 4-Tier requirement-driven test suite | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Concurrency & Atomic Race Defenses | Automated verification of atomic balance decrements and duplicate idempotency replays | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Full Production Build & Quality Gate | Zero-warning `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` | M4 | ORIGINAL_REQUEST §R3 |
| 17 | Reviewer Submission Audit | Complete forensic integrity audit, documentation updates (`ROADMAP.md`, `docs/`) | M4 | ORIGINAL_REQUEST §R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Order Lifecycle UI/UX | Create, edit, delete pages/dialogs, mutations, and lock guards | none | DONE |
| 2 | M2: Settlement UX Polish | Payment dialog shortcuts, idempotency preservation, cache invalidation | M1 | DONE |
| 3 | M3: E2E Testing Track & Verification | Comprehensive E2E test suite (Tiers 1-4), core scenario verification | M1, M2 | IN_PROGRESS |
| 4 | M4: Production Readiness & Audit | Full workspace builds, lint/typecheck checks, forensic integrity audit | M3 | PLANNED |

## Interface Contracts

### Frontend Mutations ↔ Backend API
- **Create Order**: `POST /orders`
  - Input: `{ customerName, customerEmail, dueDate, lineItems: [{ description, unitPriceCents, quantity }] }`
  - Output: `201 Created` with full order document.
- **Replace Order**: `PATCH /orders/:id` (or `PUT /orders/:id`)
  - Input: `{ customerName, customerEmail, dueDate, lineItems: [{ description, unitPriceCents, quantity }] }`
  - Output: `200 OK` with updated order document (or `409 Conflict` `ORDER_LOCKED_AFTER_PAYMENT` if paid).
- **Delete Order**: `DELETE /orders/:id`
  - Output: `204 No Content` (or `409 Conflict` `ORDER_LOCKED_AFTER_PAYMENT` if paid).
- **Record Payment**: `POST /orders/:id/payments`
  - Input: `{ amountCents, paymentDate, idempotencyKey }`
  - Output: `201 Created` / `200 OK` (if replayed), or `422 Unprocessable Entity` `PAYMENT_EXCEEDS_BALANCE`.

## Code Layout
- `apps/web/src/app/(dashboard)/orders/new/page.tsx` — Order creation route
- `apps/web/src/app/(dashboard)/orders/[orderId]/edit/page.tsx` — Order edit route
- `apps/web/src/components/orders/order-form.tsx` — Reusable order form component (React Hook Form + Zod)
- `apps/web/src/components/orders/order-delete-dialog.tsx` — Delete confirmation modal
- `apps/web/src/components/orders/order-action-bar.tsx` — Order detail actions (edit, delete, pay)
- `apps/web/src/components/payments/payment-dialog.tsx` — Payment dialog
- `apps/web/src/lib/api/orders.ts` — API client functions for order mutations
- `apps/web/src/lib/hooks/use-orders.ts` — React Query hooks for order queries & mutations
- `packages/contracts/src/orders.ts` — Shared Zod schemas for order creation/replacement
