# Original User Request

## 2026-08-14T20:57:28Z

CrossVal Orders & Settlements is a production-grade full-stack B2B finance application built with Next.js, Express, TypeScript, and MongoDB. The objective is to complete the remaining phases (Phase 8: Order creation/edit/delete lifecycle, Phase 9: Payment & settlement UX polish, Phase 10: Integration & E2E test hardening, Phase 11: Production deployment readiness, Phase 12: Reviewer submission audit).

Working directory: /Users/aryandahiya/Desktop/Programming/crossval
Integrity mode: development

## Requirements

### R1. Order Lifecycle Workflows (Phase 8)
- Implement `/orders/new` order creation page with dynamic line-item management (React Hook Form + Zod), real-time subtotal previews, and integer-cent submission conversion.
- Implement `/orders/[orderId]/edit` order replacement edit page guarded strictly to unpaid orders (`paymentCount === 0`).
- Implement unpaid order deletion with confirmation dialog and query cache invalidation.
- Render explicit contextual explanations and disable edit/delete actions when an order has recorded settlements.

### R2. Settlement UX Polish (Phase 9)
- Refine the payment dialog with a "use remaining balance" shortcut, remaining balance feedback, and client-side idempotency key preservation across retry attempts.
- Ensure payment mutations trigger immediate cache reconciliation across order detail, dashboard list, and portfolio summary metrics.

### R3. Quality Assurance & Verification Hardening (Phases 10-12)
- Validate end-to-end user journeys including the core assignment flow ($1,000 order → $400 partial payment → $600 complete settlement → reject $1 overpayment).
- Ensure all MongoDB schema constraints, compound indexes, and atomic `findOneAndUpdate` race condition defenses pass automated verification.
- Verify that clean production builds, typechecks, and lints pass across all packages with zero warnings.

## Acceptance Criteria

### Order Lifecycle
- [ ] Users can create multi-item orders at `/orders/new` with instant subtotal updates and successful redirect to detail.
- [ ] Users can edit unpaid orders with updated totals recalculated authoritatively by the API.
- [ ] Users can delete unpaid orders with immediate removal from the dashboard list.
- [ ] Orders with payments cannot be edited or deleted via UI or direct API mutations (HTTP 409).

### Settlement & Concurrency
- [ ] The assignment verification scenario ($1,000 → $400 → $600 → reject $1) passes end-to-end.
- [ ] Concurrent overpayment submissions are prevented atomically.
- [ ] Repeated submissions with the same idempotency key return the committed payment without duplicate debiting.

### System Quality
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass cleanly with zero errors.
- [ ] Production builds (`pnpm build`) succeed without errors across `@crossval/contracts`, `@crossval/api`, and `@crossval/web`.
