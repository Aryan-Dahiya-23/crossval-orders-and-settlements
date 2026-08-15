## 2026-08-15T12:45:10Z

You are a Worker agent (worker_m1_1) responsible for implementing Milestone 1: Core Tokens, Typography Standardization & Bug Fixes.

Your working directory is /Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1_1

You MUST read:
- /Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md
- /Users/aryandahiya/Desktop/Programming/crossval/.agents/orchestrator/PROJECT.md
- /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_1/analysis.md
- /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_2/analysis.md
- /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_3/analysis.md
- /Users/aryandahiya/Desktop/Programming/crossval/AGENTS.md
- /Users/aryandahiya/Desktop/Programming/crossval/apps/web/AGENTS.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Scope and File Ownership:
You have exclusive write ownership of the following files:
1. `apps/web/tailwind.config.ts`: Add `lighter: 'hsl(var(--primary-alpha-10))'` under `colors.primary`.
2. `apps/web/components/orders/status-badge.tsx`: Replace `dotColorClass = "text-blue-500"` with `dotColorClass = "text-information-base"`.
3. `apps/web/components/ui/button.tsx`: Replace `hover:bg-red-700` with `hover:bg-error-dark`, and raw `red-alpha-10` with `error-lighter`.
4. `apps/web/components/orders/order-form.tsx`: Standardize table header `<tr>` at line 243 to `text-paragraph-sm font-medium text-text-sub-600` (matching TableHead) and ensure delete button has focus ring.
5. Typography standardization: Remove manual `tracking-*` and `font-*` overrides on `subheading-xs` and `subheading-2xs` in:
   - `apps/web/components/layout/app-shell.tsx` (lines 114, 181)
   - `apps/web/components/layout/user-button.tsx` (line 98)
   - `apps/web/components/orders/orders-dashboard.tsx` (line 417)
   - `apps/web/components/orders/edit-order-workspace.tsx` (line 57)
   - `apps/web/components/orders/order-detail-workspace.tsx` (line 63)
6. Subpage back-link and header spacing harmonization: Standardize header wrappers to `mt-4 mb-6` across:
   - `apps/web/components/orders/create-order-workspace.tsx` (line 50)
   - `apps/web/components/orders/edit-order-workspace.tsx` (line 133)
   - `apps/web/components/orders/order-detail-workspace.tsx` (line 97)
7. Dialog Title font weight: Ensure `ModalTitle` in `apps/web/components/ui/modal.tsx` uses `font-semibold`.

Verification Requirements:
After implementing all changes, run and verify:
1. `pnpm typecheck` (must pass with 0 errors)
2. `pnpm lint` (must pass with 0 errors and 0 warnings)
3. `pnpm --filter @crossval/web test` (all 127 tests must pass)
4. `pnpm build` (must succeed)
5. Grep search verification confirming no `text-blue-500`, `hover:bg-red-700`, or manual `tracking-wider` on `subheading-xs`.

Write your full report to /Users/aryandahiya/Desktop/Programming/crossval/.agents/worker_m1_1/handoff.md with all execution commands and outputs documented.
When finished, send a completion message back to the orchestrator.
