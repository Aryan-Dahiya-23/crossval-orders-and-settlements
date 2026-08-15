# Specification Miner Handoff Report (spec_miner_survey_2)

## 1. Observation

Direct observations and evidence collected during the specification discovery and audit:

1. **Bug 1 (`bg-primary-lighter` undefined)**:
   - In `apps/web/tailwind.config.ts` (lines 342–349), `primary` color configuration is:
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
   - Referenced in `apps/web/components/layout/user-button.tsx:75`:
     ```tsx
     <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
     ```
   - Referenced in `apps/web/components/ui/loading-state.tsx:51, 69`:
     ```tsx
     <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
     ```
   - In sibling reference project `/Users/aryandahiya/Desktop/Programming/crossval-tracker/apps/web/tailwind.config.ts:54`, `primary.lighter` is defined as `hsl('--primary-lighter')`.

2. **Bug 2 (Hardcoded Tailwind colors)**:
   - In `apps/web/components/orders/status-badge.tsx:16`:
     ```tsx
     case "partially_paid":
       statusVariant = "pending";
       dotColorClass = "text-blue-500";
       break;
     ```
   - In `apps/web/components/ui/button.tsx:195`:
     ```tsx
     variant: 'error',
     mode: 'filled',
     class: {
       root: [
         'bg-error-base text-static-white',
         'hover:bg-red-700',
     ```

3. **Bug 3 (`subheading-xs` typography inconsistencies)**:
   - `tailwind.config.ts:150-157` defines `subheading-xs` with `fontSize: '.75rem'`, `lineHeight: '1rem'`, `letterSpacing: '0.04em'`, `fontWeight: '500'`.
   - `apps/web/components/layout/app-shell.tsx:114, 181`: `text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider`
   - `apps/web/components/orders/orders-dashboard.tsx:417`: `text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400`
   - `apps/web/components/auth/auth-shell.tsx:22` & `page-header.tsx:18`: `text-subheading-xs uppercase font-medium text-text-soft-400`
   - `apps/web/components/orders/order-detail-workspace.tsx:63` & `edit-order-workspace.tsx:57`: `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400`
   - `apps/web/components/layout/user-button.tsx:98`: `text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider`

4. **Bug 4 (Table header style mismatch)**:
   - In `apps/web/components/orders/order-form.tsx:243`:
     ```tsx
     <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">
     ```
   - In `apps/web/components/orders/orders-dashboard.tsx:311` & `order-detail-workspace.tsx:168`:
     Uses `<Table.Head>` from `apps/web/components/ui/table.tsx:36` (`text-paragraph-sm text-text-sub-600 font-normal`).

5. **Bug 5 (Mixed `label-sm` font weights)**:
   - `tailwind.config.ts:78` defines `label-sm` with default `fontWeight: '500'`.
   - Ad-hoc overrides: `font-semibold` in `page-header.tsx`, `brand.tsx:43`, `order-action-bar.tsx:100`, `order-delete-dialog.tsx:81`, `orders-dashboard.tsx:171, 229, 249, 373`, `order-detail-workspace.tsx:304` vs `font-medium` in `user-button.tsx:81, 101`, `input.tsx:347`.

6. **Bug 6 (Spacing after back links)**:
   - `apps/web/components/orders/create-order-workspace.tsx:50` and `edit-order-workspace.tsx:133` use `<div className="mt-4 mb-6"><PageHeader .../></div>`.
   - `apps/web/components/orders/order-detail-workspace.tsx:97` uses `<header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">`.

7. **Test and Build Baseline**:
   - `pnpm --filter @crossval/web test` ran 11 test files and passed 127/127 tests in 547ms.
   - `pnpm typecheck` passed with 0 errors across 3 workspace projects (`contracts`, `api`, `web`).
   - `pnpm lint` passed with 0 errors and 0 warnings.

---

## 2. Logic Chain

1. **Step 1 — Audit & Extraction**: By examining `ORIGINAL_REQUEST.md`, `AGENTS.md`, `docs/UI_UX.md`, and `docs/FRONTEND.md`, all required polish objectives decompose into 6 concrete bug fixes and 4 overarching requirement pillars (R1: Visual Consistency & Spacing Rhythm, R2: Component Refinement & Visual Appeal, R3: Interaction Polish & Micro-feedback, R4: Responsive Coherence).
2. **Step 2 — Codebase Verification of Bugs**: Direct file inspection and regex searching confirmed the exact locations, line numbers, and root causes for all 6 bugs (such as `bg-primary-lighter` missing in `tailwind.config.ts`, `text-blue-500` in `status-badge.tsx`, and `hover:bg-red-700` in `button.tsx`).
3. **Step 3 — Token & Convention Mapping**: Comparing with Align UI token rules and the sibling reference project (`crossval-tracker`) established exact drop-in replacements (`lighter: 'hsl(var(--primary-alpha-10))'`, `text-information-base`, `hover:bg-error-dark`) and typographic standardization rules (removing ad-hoc tracking overrides and standardizing `label-sm` weights).
4. **Step 4 — Responsive & Interaction Specifications**: Cataloging the full set of 22 features and 16 edge cases mapped every UI view (auth, dashboard, create/edit, detail, payment dialog, delete dialog) across 320px, 768px, and 1440px+ viewports with zero layout breaks.
5. **Step 5 — Scope Boundary Enforcement**: Verified that all polish requirements can be satisfied solely within `apps/web`, keeping `apps/api` and `packages/contracts` untouched, and preserving all 127 automated web tests.

---

## 3. Caveats

No caveats. All files and test suites were directly inspected and verified against the running codebase and documentation.

---

## 4. Conclusion

The specification survey is complete and documented in full detail in `.agents/spec_miner_survey_2/analysis.md`. The design constraints, bug fix specifications, token rules, component hierarchy, responsive layouts, and verification rubrics are ready for implementation planning and execution.

---

## 5. Verification Method

To independently verify the findings:
1. View the analysis artifact:
   `view_file /Users/aryandahiya/Desktop/Programming/crossval/.agents/spec_miner_survey_2/analysis.md`
2. Verify existing test baseline:
   `pnpm --filter @crossval/web test` (must pass 127 tests)
3. Verify type checking and linting:
   `pnpm typecheck && pnpm lint` (must succeed with zero errors/warnings)
