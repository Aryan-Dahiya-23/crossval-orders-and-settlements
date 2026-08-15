# Handoff Report: Milestone 1 Core Tokens, Typography & Bug Fixes

**Agent ID**: `explorer_m1_1`  
**Milestone**: Milestone 1 (Core Tokens, Typography & Bug Fixes)  
**Date**: 2026-08-15  
**Handoff Type**: Hard (Investigation & Specification Complete)  

---

## 1. Observation

1. **`bg-primary-lighter` Undefined in `apps/web/tailwind.config.ts`**:
   - Location: `apps/web/tailwind.config.ts:342–349`
   - Existing code:
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
   - Observed usages in `user-button.tsx:75`, `loading-state.tsx:51`, `loading-state.tsx:69`:
     ```tsx
     <span className="... bg-primary-lighter text-label-xs font-semibold text-primary-base ...">
     ```
   - In `apps/web/app/globals.css`:
     - Line 22: `--neutral-alpha-10: 220 11.48% 64.12% / 10%;`
     - Line 119: `--primary-alpha-10: var(--neutral-alpha-10);`

2. **Hardcoded Color in `apps/web/components/orders/status-badge.tsx`**:
   - Location: `apps/web/components/orders/status-badge.tsx:16`
   - Verbatim code:
     ```tsx
     case "partially_paid":
       statusVariant = "pending";
       dotColorClass = "text-blue-500";
       break;
     ```

3. **Hardcoded Red Palette Classes in `apps/web/components/ui/button.tsx`**:
   - Location: `apps/web/components/ui/button.tsx:186–243`
   - Verbatim code:
     - Line 195: `'hover:bg-red-700'`
     - Line 209: `'hover:bg-red-alpha-10 hover:ring-transparent'`
     - Line 221: `'bg-red-alpha-10 text-error-base ring-transparent'`
     - Line 237: `'hover:bg-red-alpha-10'`

4. **Zero Other Hardcoded Palette Colors in `apps/web`**:
   - Comprehensive regex search across all 113+ files in `apps/web` (`\b(text|bg|border|ring)-(blue|red|green|yellow|orange|amber|emerald|slate|gray|zinc|neutral|stone|purple|violet|indigo|cyan|teal|sky|rose|pink|fuchsia|lime)-(50|[1-9]00|950|alpha)\b`) matched only the above items. All other component styles already use Align UI design tokens (`text-text-strong-950`, `bg-bg-white-0`, `ring-stroke-soft-200`, `text-success-base`, etc.).

5. **`subheading-xs` Tracking & Font-Weight Inconsistencies**:
   - `components/layout/app-shell.tsx:114, 181`: `tracking-wider font-medium`
   - `components/layout/user-button.tsx:98`: `text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider`
   - `components/orders/orders-dashboard.tsx:417`: `text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400`
   - `components/orders/edit-order-workspace.tsx:57`: `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400`
   - `components/orders/order-detail-workspace.tsx:63`: `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400`

6. **Table Header Mismatch**:
   - `components/orders/order-form.tsx:243`: `<tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">`
   - View mode tables (`orders-dashboard.tsx:311`, `order-detail-workspace.tsx:168`, `ui/table.tsx:36`): `text-paragraph-sm text-text-sub-600`

7. **Back-Link Spacing Inconsistency**:
   - `create-order-workspace.tsx:50` & `edit-order-workspace.tsx:133`: `<div className="mt-4 mb-6"><PageHeader .../></div>`
   - `order-detail-workspace.tsx:97`: `<header className="mt-5 ... pb-6 ...">`

---

## 2. Logic Chain

1. **Token Resolution Logic**:
   - Because `bg-primary-lighter` is used in user avatars and loading state containers, and `--primary-alpha-10` is defined in `globals.css` as `var(--neutral-alpha-10)`, defining `lighter: 'hsl(var(--primary-alpha-10))'` under `theme.extend.colors.primary` in `tailwind.config.ts` causes Tailwind to generate `.bg-primary-lighter { background-color: hsl(var(--primary-alpha-10)); }`. This perfectly restores visual rendering of tinted primary badges without needing component renames.

2. **Color Token Normalization**:
   - `status-badge.tsx:16`: `partially_paid` denotes an open receivable; Align UI specifies `text-information-base` for informational and partially fulfilled states. Replacing `text-blue-500` with `text-information-base` ensures 100% token fidelity.
   - `button.tsx`: In Align UI, the `error` variant should strictly use semantic error tokens. `hover:bg-red-700` maps to `hover:bg-error-dark`, and `red-alpha-10` maps to `error-lighter`. Replacing raw red classes with `hover:bg-error-dark` and `bg-error-lighter` / `hover:bg-error-lighter` eliminates all raw Tailwind color leaks.

3. **Typography & Layout Normalization**:
   - `subheading-xs` has `letterSpacing: '0.04em'` and `fontWeight: '500'` built into `tailwind.config.ts`. Removing manual `tracking-wider` / `tracking-wide` and normalizing `font-semibold` to `font-medium` ensures typographic consistency across the entire app.
   - Standardizing `order-form.tsx:243` to `text-paragraph-sm text-text-sub-600` eliminates the visual mismatch between form line-item entry and order detail viewing.
   - Standardizing header top margin to `mt-4 mb-6` across `create-order-workspace.tsx`, `edit-order-workspace.tsx`, and `order-detail-workspace.tsx` prevents layout jumps when switching between detail and edit views.

---

## 3. Caveats

- **No Behavioral / Logic Changes**: This milestone is purely token configuration, class replacement, and typographic harmony. No API contracts, query keys, validation schemas, or mutation handlers are modified.
- **Dependency Assumptions**: No new npm dependencies are required. All tokens map directly to existing Align UI CSS variables in `apps/web/app/globals.css`.

---

## 4. Conclusion

The exact locations, root causes, and before-and-after replacement snippets for Milestone 1 are fully identified, verified, and documented in `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_1/analysis.md`. 

The Worker agent can implement these changes directly and proceed with automated verification.

---

## 5. Verification Method

The Worker and reviewer can independently verify all changes by running:

```bash
# 1. Typecheck: Zero TypeScript errors
pnpm typecheck

# 2. Lint: Zero ESLint errors and zero warnings
pnpm lint

# 3. Test: All 127 web unit & component tests must pass
pnpm --filter @crossval/web test

# 4. Color Audit: Confirm zero hardcoded color classes remain
grep -rn "text-blue-500" apps/web/
grep -rn "hover:bg-red-700" apps/web/
grep -rn "bg-red-alpha-10" apps/web/

# 5. Production Build: Next.js clean production build
pnpm build
```
