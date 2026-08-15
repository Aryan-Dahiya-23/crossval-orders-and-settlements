# Milestone 1: Core Tokens, Typography & Bug Fixes — Handoff Report

## 1. Observation

Direct code inspection of the target workspace (`apps/web`) confirmed the following exact locations and verbatim issues:

1. **Bug 1 (`bg-primary-lighter` undefined)**:
   - File: `apps/web/tailwind.config.ts:342–349`
   - Code: `primary` defines `dark`, `darker`, `base`, `alpha-24`, `alpha-16`, `alpha-10`, but lacks `lighter`.
   - Manifested in: `apps/web/components/layout/user-button.tsx:75` and `apps/web/components/ui/loading-state.tsx:51, 69`.

2. **Bug 2 (Hardcoded color values)**:
   - File: `apps/web/components/orders/status-badge.tsx:16`
     - Code: `dotColorClass = "text-blue-500";`
   - File: `apps/web/components/ui/button.tsx:195, 209, 221, 237`
     - Code: `'hover:bg-red-700'`, `'hover:bg-red-alpha-10'`, `'bg-red-alpha-10'`

3. **Bug 3 (`subheading-xs` tracking & weight overrides)**:
   - `apps/web/components/layout/app-shell.tsx:114, 181`: `className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider"`
   - `apps/web/components/layout/user-button.tsx:98`: `className="text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider"`
   - `apps/web/components/orders/edit-order-workspace.tsx:57`: `className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400"`
   - `apps/web/components/orders/order-detail-workspace.tsx:63`: `className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400"`
   - `apps/web/components/orders/orders-dashboard.tsx:417`: `className="text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400"`

4. **Bug 4 (Table header styling mismatch)**:
   - `apps/web/components/orders/order-form.tsx:243`: Raw `<tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">` with raw `<th>` tags.
   - `apps/web/components/orders/orders-dashboard.tsx:311–318` & `apps/web/components/orders/order-detail-workspace.tsx:168–172`: `<Table.Head>` rendering `bg-bg-weak-50 px-3 py-2 text-left text-paragraph-sm text-text-sub-600`.

5. **Bug 6 (Back-link to header container spacing mismatch)**:
   - `apps/web/components/orders/create-order-workspace.tsx:50`: `<div className="mt-4 mb-6"><PageHeader .../></div>`
   - `apps/web/components/orders/edit-order-workspace.tsx:133`: `<div className="mt-4 mb-6"><PageHeader .../></div>`
   - `apps/web/components/orders/order-detail-workspace.tsx:97`: `<header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">`

6. **Interactive Focus Rings & Micro-Feedback**:
   - `order-form.tsx:342`: Line item delete button has `focus-visible:outline-none` without focus ring.
   - `order-form.tsx:386`: Mobile remove item button lacks hover underline and focus ring.
   - `payment-dialog.tsx:253`: "Use remaining balance" shortcut has `focus-visible:outline-none` without focus ring.
   - `orders-toolbar.tsx:112`: Segmented filter buttons lack focus-visible rings.
   - `orders-toolbar.tsx:169`: Search clear button lacks focus-visible ring.
   - `pagination.tsx:19–21`: Pagination items and nav buttons lack focus-visible rings.

---

## 2. Logic Chain

1. **Design Token Integrity (Bug 1 & Bug 2)**:
   - Adding `lighter: 'hsl(var(--primary-alpha-10))'` to `primary` in `apps/web/tailwind.config.ts` ensures `bg-primary-lighter` resolves correctly to `--primary-alpha-10` CSS variable, eliminating transparent backgrounds in avatars and loading spinners without modifying component HTML structures.
   - Replacing `text-blue-500` with `text-information-base` in `status-badge.tsx` restores 100% token fidelity for the `partially_paid` badge status.
   - Replacing `hover:bg-red-700` and `red-alpha-10` in `button.tsx` with `hover:bg-error-dark` and `error-lighter` ensures error/destructive button states use Align UI design tokens rather than raw Tailwind colors.

2. **Typographic Rhythm (Bug 3 & Bug 4)**:
   - `tailwind.config.ts` defines `subheading-xs` with `letterSpacing: '0.04em'` and `fontWeight: '500'`, and `subheading-2xs` with `letterSpacing: '0.02em'` and `fontWeight: '500'`. Manual `tracking-wider` (0.05em) and `tracking-wide` (0.025em) overrides distort this spacing. Removing all manual tracking classes restores mathematical typography rhythm across all navigation, cards, and error headers.
   - Replacing `text-subheading-2xs uppercase text-text-soft-400 font-medium` in `order-form.tsx:243` with `text-paragraph-sm font-medium text-text-sub-600` aligns line-item form headers with `Table.Head` across the dashboard and detail views.

3. **Spatial Rhythm (Bug 6)**:
   - Standardizing the header container in `order-detail-workspace.tsx` from `mt-5` to `mt-4 mb-6` establishes a uniform vertical rhythm (`mt-4 mb-6`) across `/orders/new`, `/orders/[id]`, and `/orders/[id]/edit`.

4. **Keyboard Accessibility & Interactive Polish**:
   - Adding `focus-visible:ring-2 focus-visible:ring-stroke-strong-950` or `focus-visible:ring-error-base` to all clickable icon buttons, shortcuts, segmented filter tabs, search clear triggers, and pagination buttons ensures high-contrast keyboard navigation.

---

## 3. Caveats

- **Visual-Only Scope**: The changes in this milestone are purely presentation-layer CSS classes and design token mappings. No data models, form schemas, React Query mutations, or API endpoints are modified.
- **Worker Execution Order**: `tailwind.config.ts` and `button.tsx` should be modified first so subsequent component changes resolve tokens cleanly.

---

## 4. Conclusion

All 6 known bugs and visual discrepancies within Milestone 1 scope have been mapped to exact files and line numbers, with concrete before/after code replacement blocks provided in `.agents/explorer_m1_3/analysis.md`. Implementing these changes will resolve all M1 bugs, harmonize table headers and back-link vertical rhythm, and restore full keyboard focus visibility across interactive controls.

---

## 5. Verification Method

To independently verify after implementation:

```bash
# 1. Typecheck: Verify 0 TypeScript compilation errors across workspace
pnpm typecheck

# 2. Lint: Verify 0 ESLint errors and 0 warnings
pnpm lint

# 3. Unit & Component Tests: Verify all 127 web tests pass
pnpm --filter @crossval/web test

# 4. Grep Verification: Verify zero occurrences of hardcoded colors or undefined classes
grep -rn "text-blue-500" apps/web/
grep -rn "hover:bg-red-700" apps/web/
grep -rn "tracking-wider" apps/web/components/layout/
grep -rn "tracking-wider" apps/web/components/orders/
```
