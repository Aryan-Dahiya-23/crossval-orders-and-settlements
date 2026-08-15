# Dispatch: Worker 5 (Milestone 5 — Order Creation & Edit Workspaces)

You are Worker 5. Working directory:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m5/`

Read:
1. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md` (MANDATORY)
2. `/Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md`
3. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/PROJECT.md`
4. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_1/handoff.md` (Design Playbook)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files Owned:
- `apps/web/components/orders/create-order-workspace.tsx`
- `apps/web/components/orders/edit-order-workspace.tsx`
- `apps/web/components/orders/order-form.tsx`
- `apps/web/components/orders/order-edit-guard.tsx`

Scope & Polish Tasks:
1. **`create-order-workspace.tsx` & `edit-order-workspace.tsx`**:
   - Spacing: Back link in `<div className="mb-5">...</div>`, PageHeader, section gaps (`space-y-6`).
   - Container styling: card frames (`rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 p-6`).
2. **`order-form.tsx` (Form Inputs & Line Items Editor)**:
   - Customer & Terms card: 2-column grid (`sm:grid-cols-2 gap-4`), form inputs with `label-sm font-medium`, focus rings.
   - Line Items Editor (Desktop table >= 640px): `overflow-hidden rounded-xl border border-stroke-soft-200 bg-bg-white-0`, `TableHead` styling (`bg-bg-weak-50 text-paragraph-sm text-text-sub-600 px-3 py-2`), input cells with clean borders, line subtotal tabular numerals, delete button hover effect.
   - Line Items Editor (Mobile stacked cards < 640px): `rounded-xl bg-bg-weak-50/50 p-4 ring-1 ring-inset ring-stroke-soft-200 space-y-3`, clean item header, quantity & unit price grid, line subtotal.
   - Grand Total Summary Bar: `flex items-center justify-between border-t border-stroke-soft-200 bg-bg-weak-50/50 px-6 py-4 rounded-b-2xl`, item count badge, bold grand total (`title-h4 sm:title-h3 font-semibold tabular-nums text-text-strong-950`).
   - Form Actions: "Cancel" button (stroke) and "Submit" button (primary filled) with loading spinner state.
3. **`order-edit-guard.tsx`**:
   - Refine locked order view: lock icon bubble, explanation text, payment count/amount badges, "Back to order details" CTA.

Verification Requirement:
- Run `pnpm typecheck`
- Run `pnpm lint`
- Run `pnpm build`
- Run `pnpm --filter @crossval/web test`
- All must pass with 0 errors.

Write handoff report to:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m5/handoff.md`
Report back to parent via `send_message`.

## 2026-08-16T00:10:46Z
Execute Milestone 5: Polish Order Create and Edit Workspaces, Form Inputs, Line Items Editor table & mobile stacked cards, Grand Total summary bar, OrderEditGuard, and backlink rhythm.
Run build/test verification (typecheck, lint, build, test).
Write report to /Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m5/handoff.md and report back to parent.
