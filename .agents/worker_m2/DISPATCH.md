# Dispatch: Worker 2 (Milestone 2 — Shell, Navigation & Auth Views)

You are Worker 2. Working directory:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m2/`

Read:
1. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md` (MANDATORY)
2. `/Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md`
3. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/PROJECT.md`
4. `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_1/handoff.md` (Design Playbook)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. An auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Files Owned:
- `apps/web/components/layout/app-shell.tsx`
- `apps/web/components/auth/auth-shell.tsx`
- `apps/web/components/layout/user-button.tsx`
- `apps/web/components/layout/page-header.tsx`
- `apps/web/components/auth/login-form.tsx`
- `apps/web/components/auth/register-form.tsx`

Scope & Polish Tasks:
1. **`app-shell.tsx`**:
   - Refine fixed sidebar styling (272px expanded / 82px collapsed, `border-r border-stroke-soft-200 bg-bg-white-0`).
   - Add left active navigation indicator pill: `absolute -left-5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-base` (or equivalent) for active route.
   - Smooth transition timing (`transition-all duration-300 ease-out`).
   - Refine mobile header (`h-[60px] border-b border-stroke-soft-200 bg-bg-white-0/95 backdrop-blur`) and mobile drawer (`bg-overlay backdrop-blur-[10px]`, `w-[min(86vw,300px)]`).
2. **`auth-shell.tsx`**:
   - Fix mobile border quirk: change `border-r` to `lg:border-r` on the left section.
   - Elevate right-side marketing panel: quote styling, feature pills with semantic Align UI tokens (`bg-primary-alpha-10 text-primary-base`, `bg-bg-weak-50 text-text-sub-600`), and clean typography.
3. **`user-button.tsx`**:
   - Refine user button trigger, avatar bubble (`bg-primary-alpha-10 text-primary-base ring-1 ring-inset ring-primary-base/20`), dropdown popover with `shadow-regular-md ring-1 ring-inset ring-stroke-soft-200`, and logout action.
4. **`page-header.tsx`**:
   - Standardize typography hierarchy: eyebrow `text-subheading-xs uppercase font-medium text-text-soft-400`, title `text-title-h4 font-semibold text-text-strong-950 sm:text-title-h3`, description `text-paragraph-sm text-text-sub-600`.
5. **`login-form.tsx` & `register-form.tsx`**:
   - Form inputs, label weights (`text-label-sm font-medium`), submit buttons with smooth hover/active transitions and loading states.

Verification Requirement:
- Run `pnpm typecheck`
- Run `pnpm lint`
- Run `pnpm build`
- Run `pnpm --filter @crossval/web test`
- All must pass with 0 errors.

Write handoff report to:
`/Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m2/handoff.md`
Report back to parent via `send_message`.
