# Handoff Report: Milestone 1 Scope (Core Tokens, Typography & Bug Fixes)

**Agent**: `explorer_m1_2`  
**Milestone**: M1 (Core Tokens, Typography & Bug Fixes)  
**Date**: 2026-08-15  
**Handoff Type**: Hard (Investigation Complete & Actionable)  

---

## 1. Observation

Direct code inspection across `apps/web` identified the following concrete observations:

1. **Missing `bg-primary-lighter` Definition in Tailwind Config**:
   - `apps/web/tailwind.config.ts:342–349`:
     ```ts
     primary: {
       dark: 'hsl(var(--primary-dark))',
       darker: 'hsl(var(--primary-darker))',
       base: 'hsl(var(--primary-base))',
       'alpha-24': 'hsl(var(--primary-alpha-24))',
       'alpha-16': 'hsl(var(--primary-alpha-16))',
       'alpha-10': 'hsl(var(--primary-alpha-10))',
     },
     ```
   - `bg-primary-lighter` is used in `components/layout/user-button.tsx:75` and `components/ui/loading-state.tsx:51, 69`, but because `lighter` is not in `tailwind.config.ts`, Tailwind does not generate a CSS rule for `bg-primary-lighter` (rendering transparent background).

2. **Hardcoded Color Classes**:
   - `components/orders/status-badge.tsx:16`: `dotColorClass = "text-blue-500";` for `partially_paid` status.
   - `components/ui/button.tsx:195`: `'hover:bg-red-700'` under `variant: 'error', mode: 'filled'`.

3. **Manual Letter-Spacing & Font-Weight Overrides on `subheading-xs` & `subheading-2xs`**:
   - `apps/web/tailwind.config.ts:150–165` defines `letterSpacing: '0.04em'` and `fontWeight: '500'` for `subheading-xs`, and `letterSpacing: '0.02em'` and `fontWeight: '500'` for `subheading-2xs`.
   - `components/layout/app-shell.tsx:114, 181`: `text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider` (manual `tracking-wider`).
   - `components/layout/user-button.tsx:98`: `text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider` (manual `tracking-wider`).
   - `components/orders/orders-dashboard.tsx:417`: `text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400` (manual `tracking-wide`).
   - `components/orders/order-detail-workspace.tsx:63` & `components/orders/edit-order-workspace.tsx:57`: `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400` (manual `tracking-wider` and `font-semibold`).
   - `components/auth/auth-shell.tsx:22` & `components/layout/page-header.tsx:18`: `text-subheading-xs uppercase font-medium text-text-soft-400` (already clean).

4. **Table Header Style Discrepancy**:
   - `components/orders/order-form.tsx:243`: `<tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">` with raw `<th>` tags.
   - View mode tables (`orders-dashboard.tsx:311–318`, `order-detail-workspace.tsx:168–172`) and `Table.Head` (`components/ui/table.tsx:36`): `text-paragraph-sm text-text-sub-600`.

5. **Label Font Weight Inconsistencies**:
   - Form input labels centrally defined via `components/ui/input.tsx:347` use `text-label-sm text-text-strong-950 font-medium`.
   - Card headers, section titles, and modal titles use `font-semibold text-text-strong-950` (`order-form.tsx:154, 204`, `sample-data-cta.tsx:52`, `orders-dashboard.tsx:171`, `order-detail-workspace.tsx:304`). `ModalTitle` in `components/ui/modal.tsx:134` was missing explicit `font-semibold`.

6. **Subpage Back-Link Spacing Discrepancy**:
   - `/orders/new` (`create-order-workspace.tsx:50`) and `/orders/[id]/edit` (`edit-order-workspace.tsx:133`): `<div className="mt-4 mb-6"><PageHeader .../></div>`.
   - `/orders/[id]` (`order-detail-workspace.tsx:97`): `<header className="mt-5 ... pb-6 ...">`.

---

## 2. Logic Chain

1. **Root Cause Resolution for Missing Tokens (Observation 1)**: Adding `lighter: 'hsl(var(--primary-alpha-10))'` to `tailwind.config.ts` under `theme.colors.primary` directly provides the Tailwind utility `bg-primary-lighter` mapped to the Align UI alpha-10 token, restoring the intended tinted background for avatars and spinner badges without touching JSX call sites.
2. **Elimination of Arbitrary Color Literals (Observation 2)**: Substituting `text-blue-500` with `text-information-base` in `status-badge.tsx` and `hover:bg-red-700` with `hover:bg-error-dark` in `button.tsx` ensures 100% adherence to Align UI semantic color variables.
3. **Typographic Standard and Rhythm (Observation 3)**: Because `subheading-xs` and `subheading-2xs` already encapsulate their calibrated tracking in `tailwind.config.ts`, stripping manual `tracking-wider` and `tracking-wide` restores optical balance and removes CSS specificity clutter across shells and headers.
4. **Table Header Consistency (Observation 4)**: Updating `order-form.tsx:243` to use `text-paragraph-sm text-text-sub-600 font-medium` aligns the create/edit form line items header with all view mode tables.
5. **Form Label vs Section Heading Weight Rule (Observation 5)**: Enforcing `font-medium` for input labels (`label-sm font-medium`) and `font-semibold` for section/card headings (`text-label-md / text-label-sm font-semibold text-text-strong-950`) creates a crisp, consistent visual hierarchy. Adding `font-semibold` to `ModalTitle` standardizes all dialog titles.
6. **Unified Subpage Layout Rhythm (Observation 6)**: Standardizing `mt-4 mb-6` for the header container across detail and create/edit pages eliminates vertical layout jumping during subpage navigation.

---

## 3. Caveats

- **Scope Boundary**: Milestone 1 focuses on core tokens, typography cleanup, and bug fixes. Full dashboard card redesigns, table hover elevation effects, and modal footer enhancements are scheduled for Milestone 2 and Milestone 3.
- **No API / Contracts Changes**: All work is strictly confined to `apps/web`. Zero modifications to `apps/api` or `packages/contracts`.
- **No Behavioral Changes**: Form validation schemas, React Query query keys, and submission hooks remain completely untouched.

---

## 4. Conclusion

Milestone 1 has been exhaustively investigated with an exact, 11-task code replacement plan formulated in `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_2/analysis.md`. The worker can apply these replacements cleanly and with zero risk of regression.

---

## 5. Verification Method

To verify the changes independently:

1. **Automated Test Suite**:
   ```bash
   pnpm --filter @crossval/web test
   ```
   *Success Condition*: All 11 test suites and 127 tests pass.

2. **Static Analysis & Type Checking**:
   ```bash
   pnpm typecheck
   pnpm lint
   ```
   *Success Condition*: Zero errors and zero warnings across all workspace packages.

3. **Build Check**:
   ```bash
   pnpm build
   ```
   *Success Condition*: Clean production build of `@crossval/web` and `apps/api`.

4. **Forensic Token and Typography Assertions**:
   ```bash
   # Confirm no manual tracking on subheading classes:
   git grep -E "text-subheading-(xs|2xs).*tracking-" apps/web
   
   # Confirm no raw Tailwind color names remain:
   git grep -E "\b(text|bg|border|ring)-(blue|red|gray|slate)-[0-9]+" apps/web
   ```
   *Success Condition*: Zero matches returned.
