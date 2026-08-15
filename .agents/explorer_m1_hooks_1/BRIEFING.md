# BRIEFING — 2026-08-14T21:05:00Z

## Mission
Design the Frontend API Client and React Query Mutations for Milestone 1 (Order Lifecycle UI/UX - Phase 8).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis, architectural planning
- Working directory: /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1
- Original parent: 02db0ae0-711e-4552-80b8-8e71140e6694
- Milestone: Milestone 1 - Order Lifecycle UI/UX (Frontend API Client & React Query Hooks)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement in source code
- Adhere to AGENTS.md, PROJECT.md, and DOMAIN_RULES.md
- USD integer cents, derived status, conditional writes, React Query key conventions

## Current Parent
- Conversation ID: 02db0ae0-711e-4552-80b8-8e71140e6694
- Updated: 2026-08-14T21:05:00Z

## Investigation State
- **Explored paths**:
  - `packages/contracts/src/index.ts`, `packages/contracts/src/orders.ts`
  - `apps/api/src/modules/orders/routes.ts`, `service.ts`, `validation.ts`, `domain.ts`, `mapper.ts`
  - `apps/web/lib/api-client.ts`, `apps/web/features/orders/api.ts`, `apps/web/features/orders/queries.ts`, `apps/web/features/orders/query-keys.ts`
  - `apps/web/components/orders/payment-dialog.tsx`, `order-detail-workspace.tsx`, `apps/web/components/auth/signup-form.tsx`
- **Key findings**:
  - Codebase layout: frontend code is located directly under `apps/web/features/orders/` and `apps/web/lib/`, rather than `apps/web/src/`.
  - Backend contracts and routes support `POST /orders`, `PATCH /orders/:orderId`, and `DELETE /orders/:orderId`.
  - `createOrder` takes `CreateOrderRequest` and returns `OrderDetail` (via `OrderDetailResponse` envelope).
  - `replaceOrder` takes `orderId` and `ReplaceOrderRequest` and returns `OrderDetail`.
  - `deleteOrder` takes `orderId` and returns `void` (204 No Content handled by `apiRequest`).
  - Cache invalidation: `useCreateOrder` invalidates `lists()` and `summaries()`; `useReplaceOrder` updates/invalidates `detail(orderId)`, `lists()`, and `summaries()`; `useDeleteOrder` removes `detail(orderId)` query and invalidates `lists()` and `summaries()`.
  - Error envelope: structured `ApiError` provides `status`, `code`, `details.fields`, and `requestId`, enabling precise mapping for 409 `ORDER_LOCKED_AFTER_PAYMENT` and 422 `VALIDATION_FAILED`.
- **Unexplored areas**: None for M1 frontend API & hooks.

## Key Decisions Made
- Architect API client methods in both the canonical codebase location `apps/web/features/orders/api.ts` and document backward-compatible re-exports at `apps/web/lib/api/orders.ts`.
- Design `useCreateOrder`, `useReplaceOrder`, and `useDeleteOrder` in `apps/web/features/orders/queries.ts` (with optional re-exports in `apps/web/lib/hooks/use-orders.ts`).
- Include a comprehensive error parsing and field-mapping helper utility.

## Artifact Index
- DISPATCH.md — Initial dispatch instructions
- progress.md — Liveness and progress tracking
- plan.md — Detailed architectural blueprint and implementation plan
- handoff.md — 5-component handoff report
