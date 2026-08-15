# Milestone 1: Foundation, Token Engine & 6 Audit Bug Fixes — Handoff Report

**Worker**: Worker 1  
**Working Directory**: `/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1/`  
**Milestone**: Milestone 1 (Token Engine, Dynamic HSL, cn Consolidation, 6 Audit Bug Fixes)  
**Status**: COMPLETE (Hard Handoff)  
**Date**: 2026-08-16  

---

## 1. Observation

A full survey and audit of the token system, utility functions, and the 6 identified audit bugs in `apps/web` revealed the following concrete observations:

1. **Token Engine & Dynamic HSL in `tailwind.config.ts` & `globals.css`**:
   - `tailwind.config.ts` lacked dynamic alpha support for CSS variable colors (`hsl(var(--token) / <alpha-value>)`), preventing opacity modifiers like `bg-primary-lighter/60` and `bg-bg-weak-50/50` from resolving properly.
   - Missing border radii: `borderRadii` only declared `'10'` (10px) and `'20'` (20px), omitting standard Align UI tokens `'12': '.75rem'` (12px) and `'16': '1rem'` (16px).
   - In `globals.css`, `--primary-lighter` (`222 100% 96.08%`) and `--primary-alpha` (`227.93 100% 63.92% / 16%`) were not explicitly defined as channel triplets in `:root` and `.dark`.
   - Box-shadows in `tailwind.config.ts` used `theme(colors.bg[white-0])` strings that could break when dynamic alpha syntax is introduced.

2. **Utility Harmonization in `lib/cn.ts` vs `utils/cn.ts`**:
   - `apps/web/utils/cn.ts` properly configured `extendTailwindMerge` with custom Align UI classes (`texts`, `shadows`, `borderRadii`), but `apps/web/lib/cn.ts` contained a separate raw `twMerge` instance.
   - 4 component files imported from `../../lib/cn` while the rest imported from `@/utils/cn`.

3. **Bug 1 (`bg-primary-lighter` / avatar & loading tokens)**:
   - `components/layout/user-button.tsx:75` and `components/ui/loading-state.tsx:51, 69` used `bg-primary-lighter` instead of the Align UI primary alpha token `bg-primary-alpha-10`.

4. **Bug 2 (`text-blue-500` / status badge information variant)**:
   - `components/orders/status-badge.tsx:14-17` handled `partially_paid` by setting `statusVariant = "pending"` and manually overriding the dot color because `components/ui/status-badge.tsx` lacked an `information` status variant and compound light style.

5. **Bug 3 (`subheading-xs` typography & tracking harmonization)**:
   - `tailwind.config.ts` defines `subheading-xs` with `letterSpacing: '0.04em'` and `fontWeight: '500'`.
   - `components/orders/order-detail-workspace.tsx:63` added conflicting `font-semibold uppercase tracking-wider`.
   - `components/orders/order-edit-guard.tsx:21` used `font-mono text-paragraph-xs font-semibold uppercase tracking-wider` instead of standard `text-subheading-xs`.

6. **Bug 4 (Table header styling)**:
   - `components/orders/order-form.tsx:243-256` line-items table `<thead>` used `py-2.5` without edge cell rounded corners (`first:rounded-l-lg last:rounded-r-lg`), diverging from `components/ui/table.tsx` `TableHead` (`py-2 text-paragraph-sm text-text-sub-600 first:rounded-l-lg last:rounded-r-lg`).

7. **Bug 5 (Label weights & Section Titles)**:
   - Form input labels canonical standard is `text-label-sm font-medium text-text-strong-950`.
   - Section titles in `orders-dashboard.tsx:171` and `order-detail-workspace.tsx:304` were using `text-label-sm font-semibold` instead of the canonical section header standard `text-label-md font-semibold text-text-strong-950`.

8. **Bug 6 (Back link spacing)**:
   - `create-order-workspace.tsx` and `edit-order-workspace.tsx` wrapped `<PageHeader>` in `<div className="mt-4 mb-6">`, while `order-detail-workspace.tsx` placed `mt-5` on `<header>`.

9. **Additional Audit Findings**:
   - `components/orders/payment-dialog.tsx:253`: "Use remaining balance" button lacked a visible focus ring.
   - `components/orders/orders-toolbar.tsx:112, 169`: Segmented status filter buttons and search clear button lacked visible focus rings.
   - `components/orders/orders-dashboard.tsx:99, 185`: Small buttons had manual `className="rounded-10"` overriding the standard `rounded-lg`.
   - `components/orders/order-delete-dialog.tsx:76`: Inner summary card used `rounded-10` instead of `rounded-xl`.

---

## 2. Logic Chain

1. **Token Engine & Dynamic HSL**:
   - Defining `const hsl = (token: string) => \`hsl(var(\${token}) / <alpha-value>)\`;` ensures that any Tailwind class using opacity modifiers (e.g. `bg-primary-lighter/60`, `ring-primary-base/20`, `bg-bg-weak-50/50`) generates valid CSS color values at compile time.
   - Mapping both semantic names (`bg.white`, `text.strong`, `stroke.soft`) and numeric tokens (`bg['white-0']`, `text['strong-950']`, `stroke['soft-200']`) ensures 100% backward and forward compatibility.
   - Adding `'12': '.75rem'` and `'16': '1rem'` to `borderRadii` satisfies all Align UI card and container specifications.
   - Replacing `theme(colors...)` in `shadows` with explicit `hsl(var(--...))` avoids syntax conflicts with `<alpha-value>`.

2. **Utility Harmonization**:
   - Re-exporting `cn` and `cnExt` in `apps/web/lib/cn.ts` from `apps/web/utils/cn.ts` ensures that all components importing from `@/lib/cn` or `@/utils/cn` use the exact same custom `extendTailwindMerge` configuration.

3. **Status Badge Variant**:
   - Adding `information` variant to `ui/status-badge.tsx` with `icon: text-information-base`, `dot: text-information-base`, and `variant: light` compound `bg-information-lighter text-information-base` gives first-class token support to `partially_paid` status badges without ad-hoc overrides.

4. **Typography & Spacing Standardization**:
   - Eliminating manual `tracking-wider` and `font-semibold` overrides on `subheading-xs` restores consistency with the Align UI design token specifications.
   - Standardizing back links inside a dedicated `<div className="mb-5">` container creates an identical vertical rhythm across create, edit, and detail views.
   - Standardizing section titles to `text-label-md font-semibold text-text-strong-950` provides clear distinction from `text-label-sm font-medium` input labels.

---

## 3. Caveats

1. **Scope Boundaries**: All changes are strictly visual/token/layout refactorings within `apps/web`. Zero modifications were made to `apps/api` or `packages/contracts`.
2. **Behavioral Invariance**: All query parameters, React Hook Form bindings, Zod validations, React Query cache keys, and calculation flows remain completely unaltered.
3. **No External Library Dependencies**: No third-party UI libraries were added; all primitives reside in `apps/web/components/ui/`.

---

## 4. Conclusion

Milestone 1 is completely implemented and verified:
- `apps/web/tailwind.config.ts`: Modernized with dynamic HSL helper, border radii `'12'` and `'16'`, token aliases, and clean shadow definitions.
- `apps/web/app/globals.css`: Augmented with `--primary-lighter`, `--primary-alpha`, and `.tabular-nums` utility.
- `apps/web/lib/cn.ts`: Re-exports `cn` and `cnExt` from `../utils/cn`.
- `apps/web/components/layout/user-button.tsx`: Avatar token updated to `bg-primary-alpha-10`.
- `apps/web/components/ui/loading-state.tsx`: Loading states standardized to `bg-primary-alpha-10`.
- `apps/web/components/ui/status-badge.tsx`: Added `information` status variant and compound light style.
- `apps/web/components/orders/status-badge.tsx`: Updated `partially_paid` to use `information` variant.
- `apps/web/components/orders/order-detail-workspace.tsx`: Fixed subheading-xs tracking/weight, wrapped back link in `mb-5` container, updated section title to `text-label-md font-semibold`.
- `apps/web/components/orders/order-edit-guard.tsx`: Normalized displayId eyebrow to `text-subheading-xs uppercase font-medium`.
- `apps/web/components/orders/order-form.tsx`: Harmonized line items `<thead>` with `TableHead` dimensions and rounded corners.
- `apps/web/components/orders/create-order-workspace.tsx`: Standardized back link spacing in `mb-5` wrapper.
- `apps/web/components/orders/edit-order-workspace.tsx`: Standardized back link spacing in `mb-5` wrapper.
- `apps/web/components/orders/orders-dashboard.tsx`: Removed `rounded-10` button overrides, updated section title to `text-label-md font-semibold`.
- `apps/web/components/orders/payment-dialog.tsx`: Added focus-visible ring to remaining balance quick button.
- `apps/web/components/orders/orders-toolbar.tsx`: Added focus-visible rings to status filters and search clear button.
- `apps/web/components/orders/order-delete-dialog.tsx`: Standardized inner summary card radius to `rounded-xl`.

---

## 5. Verification Method

Independent verification was executed with zero errors and zero warnings:

1. **TypeScript Typecheck**:
   ```bash
   pnpm typecheck
   ```
   *Result*: Scope: 3 of 4 workspace projects (`@crossval/contracts`, `apps/api`, `apps/web`) — all passed with 0 errors.

2. **ESLint Linting**:
   ```bash
   pnpm lint
   ```
   *Result*: Scope: 3 of 4 workspace projects — all passed with 0 errors and 0 warnings.

3. **Workspace Production Build**:
   ```bash
   pnpm build
   ```
   *Result*: Next.js 16.3.1 (Turbopack) compiled successfully and generated all static & dynamic routes without warnings.

4. **Automated Unit & Integration Test Suite**:
   ```bash
   pnpm --filter @crossval/web test
   ```
   *Result*: 11 test files passed, 127 tests passed (0 failures).

5. **Hardcoded Color Audit**:
   ```bash
   rg -n "text-blue-500|bg-gray-|text-gray-|bg-red-|hover:bg-red-" apps/web
   ```
   *Result*: 0 matches found across the entire web application.
