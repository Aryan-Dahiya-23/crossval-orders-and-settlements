# Dispatch: Worker 3 (Milestone 3 — Dashboard, KPI Cards & Orders Table)

You are Worker 3. Working directory:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m3/`

Read:
1. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md` (MANDATORY)
2. `/Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md`
3. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/PROJECT.md`
4. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_1/handoff.md` (Design Playbook)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files Owned:
- `apps/web/components/orders/orders-dashboard.tsx`
- `apps/web/components/orders/orders-toolbar.tsx`
- `apps/web/components/orders/sample-data-cta.tsx`
- `apps/web/components/orders/orders-pagination.tsx`
- `apps/web/components/ui/table.tsx`

Scope & Polish Tasks:
1. **`orders-dashboard.tsx` (Summary KPI Cards & Layout)**:
   - Upgrade KPI cards with `WidgetBox` styling: `rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 hover:shadow-regular-sm transition-shadow duration-200`.
   - Semantic icon bubbles: `grid size-9 place-items-center rounded-xl ring-1 ring-inset` (Primary: `bg-primary-alpha-10 text-primary-base ring-primary-base/20`, Overdue: `bg-error-lighter text-error-dark ring-error-base/20`, Outstanding: `bg-warning-lighter text-warning-base ring-warning-base/20`, Settled: `bg-success-lighter text-success-base ring-success-base/20`).
   - Bold metric values: `text-title-h4 font-semibold tabular-nums text-text-strong-950 tracking-tight sm:text-title-h3`.
   - Eyebrows: `text-subheading-xs uppercase font-medium text-text-soft-400`.
   - Section headers: `text-label-md font-semibold text-text-strong-950`.
   - Mobile stacked card view (`md:hidden`): polish card borders, padding, metric grid, and touch targets.
2. **`orders-toolbar.tsx` (Filters, Search & Sort)**:
   - Segmented filter buttons: active tab `bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold`, inactive `text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40`, focus ring `focus-visible:ring-2 focus-visible:ring-stroke-strong-950`.
   - Sort Select trigger: `bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-stroke-strong-950`.
   - Customer search input: clear button with `focus-visible:ring-2 focus-visible:ring-stroke-strong-950`.
3. **`sample-data-cta.tsx` (Demo Dataset Card)**:
   - Refine dashed border card: `rounded-2xl border-2 border-dashed border-primary-base/25 bg-primary-alpha-10/40 p-6`.
   - Semantic icon bubble: `size-12 rounded-xl bg-primary-alpha-10 text-primary-base ring-1 ring-inset ring-primary-base/20`.
4. **`orders-pagination.tsx`**:
   - Refine pagination controls, page range text, prev/next buttons, and disabled states.
5. **`table.tsx`**:
   - Refine table root wrapper (`overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs border border-stroke-soft-200`), row hover transitions (`hover:bg-bg-weak-50/50`).

Verification Requirement:
- Run `pnpm typecheck`
- Run `pnpm lint`
- Run `pnpm build`
- Run `pnpm --filter @crossval/web test`
- All must pass with 0 errors.

Write handoff report to:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m3/handoff.md`
Report back to parent via `send_message`.
