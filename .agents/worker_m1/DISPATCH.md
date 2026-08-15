# Dispatch: Worker 1 (Milestone 1 — Foundation, Token Engine & 6 Audit Bug Fixes)

You are Worker 1. Your working directory is:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1/`

Read:
1. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md` (MANDATORY)
2. `/Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md`
3. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/PROJECT.md`
4. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_1/handoff.md`
5. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_2/handoff.md`

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Tasks for Milestone 1:
1. **Token Engine & Dynamic HSL in `tailwind.config.ts` & `globals.css`**:
   - Update `apps/web/tailwind.config.ts`: add `const hsl = (token: string) => \`hsl(var(\${token}) / <alpha-value>)\`;` and map colors so alpha opacity modifiers work cleanly.
   - Define `primary.lighter: hsl('--primary-lighter')` and alias `bg-white`, `bg-white-0`, `text-strong`, `text-strong-950`, `stroke-soft`, `stroke-soft-200`, etc.
   - Add missing border radii: `'12': '.75rem'`, `'16': '1rem'`.
   - Update `apps/web/app/globals.css`: ensure clean HSL variable channels (`--primary-lighter: 222 100% 96%`, `--overlay: 209 84% 5% / 32%`), add optical RemixIcon styling (`.remixicon path { transform: scale(0.8996); transform-origin: center; }`), and tabular-nums utility.
2. **Utility Harmonization in `lib/cn.ts` & `utils/cn.ts`**:
   - Re-export `cn` and `cnExt` in `apps/web/lib/cn.ts` from `apps/web/utils/cn.ts` so custom AlignUI twMerge configuration is universally applied.
3. **Bug 1 (`bg-primary-lighter`)**:
   - Standardize `components/layout/user-button.tsx` and `components/ui/loading-state.tsx` to use valid Align UI primary tokens (`bg-primary-alpha-10` / `bg-primary-lighter`).
4. **Bug 2 (`text-blue-500` / status badge)**:
   - Add `information` status variant and light compound variant in `components/ui/status-badge.tsx` (`icon: text-information-base`, `dot: text-information-base`, `variant: light` compound `bg-information-lighter text-information-base`).
   - Update `components/orders/status-badge.tsx` for `partially_paid` to use `statusVariant = "information"`, removing hardcoded `text-blue-500`.
5. **Bug 3 (`subheading-xs` typography & tracking)**:
   - Fix `order-detail-workspace.tsx` line 63: remove `font-semibold` and `tracking-wider`, use `text-subheading-xs uppercase font-medium text-text-soft-400`.
   - Fix `order-edit-guard.tsx` line 21: use `text-subheading-xs uppercase font-medium text-text-soft-400`.
   - Audit other occurrences in `app-shell.tsx`, `auth-shell.tsx`, `page-header.tsx`, `orders-dashboard.tsx` to ensure `text-subheading-xs uppercase font-medium text-text-soft-400` is used without manual tracking overrides.
6. **Bug 4 (Table header styling)**:
   - Harmonize `components/orders/order-form.tsx` line-items table `<thead>` to use `text-paragraph-sm text-text-sub-600 bg-bg-weak-50 px-3 py-2 first:rounded-l-lg last:rounded-r-lg` matching `TableHead`.
7. **Bug 5 (Label weights & Section Titles)**:
   - Form input labels use `text-label-sm font-medium`, section titles use `text-label-md font-semibold text-text-strong-950`.
8. **Bug 6 (Back link spacing)**:
   - Wrap back links in `create-order-workspace.tsx`, `edit-order-workspace.tsx`, and `order-detail-workspace.tsx` in `<div className="mb-5">...</div>` before `<PageHeader>` / `<header>`.

Verification Requirement:
- Run `pnpm typecheck`
- Run `pnpm lint`
- Run `pnpm build`
- Run `pnpm --filter @crossval/web test`
- All must pass with 0 errors.

Write your report to:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1/handoff.md`
Report back to parent via `send_message`.
