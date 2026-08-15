# BRIEFING — 2026-08-14T21:15:00Z

## Mission
Design the exact architecture, UI specifications, and implementation plan for Phase 8 Milestone 1: Order Form (`order-form.tsx`), Create Order page (`/orders/new`), and Edit Order page (`/orders/[orderId]/edit`).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis, architecture blueprinting
- Working directory: /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_form_1
- Original parent: 02db0ae0-711e-4552-80b8-8e71140e6694
- Milestone: Phase 8 Milestone 1 - Order Form & Create/Edit Routes

## 🔒 Key Constraints
- Read-only investigation — do NOT implement application source code
- USD is the only currency; store/transport as integer cents; display as decimal dollars
- Derived status logic (status is not editable or persisted)
- Orders with payments (paymentCount > 0 or payments.length > 0) are read-only: forbid edit, show explanatory notice
- React Hook Form + Zod resolver using contracts schema
- Align UI component foundation
- Write plan to `plan.md` and handoff to `handoff.md`

## Current Parent
- Conversation ID: 02db0ae0-711e-4552-80b8-8e71140e6694
- Updated: 2026-08-14T21:15:00Z

## Investigation State
- **Explored paths**:
  - `packages/contracts/src/orders.ts` & `index.ts`
  - `apps/api/src/modules/orders/routes.ts`, `service.ts`, `domain.ts`
  - `apps/api/src/db/validators/collection-validators.ts`, `documents.ts`
  - `apps/web/app/orders/`, `apps/web/components/orders/`, `apps/web/components/ui/`, `apps/web/features/orders/`
  - `.agents/explorer_m1_hooks_1/plan.md`, `.agents/explorer_m1_actions_1/plan.md`
- **Key findings**:
  - Exact schemas, validation bounds, and money conversions (`decimalToCents`, `centsToDecimalString`).
  - Next.js App Router paths: `apps/web/app/orders/new/page.tsx` and `apps/web/app/orders/[orderId]/edit/page.tsx`.
  - Immutability guard logic for settled orders.
- **Unexplored areas**: None.

## Key Decisions Made
- `order-form.tsx` uses custom string-based Zod schema for currency formatting and converts to integer cents upon submission.
- Real-time subtotal and order grand total calculation powered by `useWatch` on line items.
- `/orders/[orderId]/edit` renders `OrderEditGuard` when `!order.isEditable || order.payments.length > 0`.
- All detailed blueprints and plans written to `plan.md` and `handoff.md`.

## Artifact Index
- `.agents/explorer_m1_form_1/DISPATCH.md` — Inbound dispatch instructions
- `.agents/explorer_m1_form_1/BRIEFING.md` — Persistent situational awareness
- `.agents/explorer_m1_form_1/progress.md` — Liveness heartbeat
- `.agents/explorer_m1_form_1/plan.md` — Detailed architecture & code blueprint
- `.agents/explorer_m1_form_1/handoff.md` — 5-component handoff report
