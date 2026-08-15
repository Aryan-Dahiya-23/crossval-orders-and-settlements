# Dispatch: Worker 4 (Milestone 4 — Order Detail, Financial Metrics & Modals)

You are Worker 4. Working directory:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m4/`

Read:
1. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md` (MANDATORY)
2. `/Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md`
3. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/PROJECT.md`
4. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_1/handoff.md` (Design Playbook)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files Owned:
- `apps/web/components/orders/order-detail-workspace.tsx`
- `apps/web/components/orders/order-action-bar.tsx`
- `apps/web/components/orders/order-lock-banner.tsx`
- `apps/web/components/orders/payment-dialog.tsx`
- `apps/web/components/orders/order-delete-dialog.tsx`
- `apps/web/components/ui/modal.tsx`

Scope & Polish Tasks:
1. **`order-detail-workspace.tsx` (Financial Metrics & Panels)**:
   - Financial scorecards: Refine 3-metric container (`rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 divide-y sm:divide-y-0 sm:divide-x divide-stroke-soft-200`), bold tabular numbers (`title-h4 font-semibold tabular-nums text-text-strong-950`), clean label hierarchy (`subheading-xs uppercase font-medium text-text-soft-400`).
   - Line items data table: Header styling, row borders, responsive overflow wrapper.
   - Payment history ledger: Clean empty state ("No payments recorded"), ledger cards with amount badges, dates, and idempotency key tooltip/tag.
2. **`order-action-bar.tsx`**:
   - Action buttons: "Record payment" (primary fancy/filled), "Edit" (stroke), "Delete" (destructive/stroke), disabled lock states with clear explanatory tooltips.
3. **`order-lock-banner.tsx`**:
   - Refine lock banner card: `rounded-xl bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200`, lock icon, clear explanation of financial immutability.
4. **`payment-dialog.tsx`**:
   - Real-time balance preview card: `rounded-xl bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200`, projected balance calculation, status badge pill, "Use remaining balance" quick shortcut button with focus ring.
   - Payment amount input: currency prefix `$`, helper text, submit button loading state.
5. **`order-delete-dialog.tsx`**:
   - Confirmation summary card: `rounded-xl bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200`, order metadata, destructive confirmation button.
6. **`modal.tsx`**:
   - Dialog frame: `relative w-full rounded-20 bg-bg-white-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 p-0 overflow-hidden`.
   - Header: `border-b border-stroke-soft-200 p-5 pr-12`.
   - Footer: `flex items-center justify-end gap-3 border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-4 rounded-b-20`.

Verification Requirement:
- Run `pnpm typecheck`
- Run `pnpm lint`
- Run `pnpm build`
- Run `pnpm --filter @crossval/web test`
- All must pass with 0 errors.

Write handoff report to:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m4/handoff.md`
Report back to parent via `send_message`.
