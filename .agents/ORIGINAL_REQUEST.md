# Original User Request

## Initial Request — 2026-08-15T18:26:10Z

Polish the entire UI/UX of an existing Next.js + Express B2B finance dashboard ("CrossVal — Orders & Settlements") to production-quality. The app is functionally complete (auth, orders CRUD, payment settlement, dashboard with filters/search/pagination) but needs visual refinement to achieve a "wow factor." The audience is an assignment reviewer evaluating both engineering and design sensibility.

Working directory: /Users/aryandahiya/Desktop/Programming/crossval
Integrity mode: benchmark

**Reference project for visual quality bar**: `/Users/aryandahiya/Desktop/Programming/crossval-tracker` — a sibling dashboard built by the same developer. Match or exceed its polish level. Study its components, spacing patterns, and visual refinements.

**Key constraints (from AGENTS.md — you MUST read it before making any changes)**:
- Use Align UI design tokens throughout (no hardcoded colors — use `text-text-strong-950`, `bg-bg-white-0`, `ring-stroke-soft-200`, etc.)
- Use RemixIcon (`@remixicon/react`) for all icons
- Use existing UI primitives in `apps/web/components/ui/` (Button, Input, Select, Table, Badge, Modal, Alert, etc.) — don't introduce new component libraries
- Preserve all existing functionality — this is a visual-only refactor, no behavior changes
- The app uses pnpm workspaces with `apps/web` (Next.js), `apps/api` (Express), and `packages/contracts`
- Run `pnpm typecheck && pnpm lint && pnpm build` and ensure zero errors before finishing
- All 127 existing tests must still pass: `pnpm --filter @crossval/web test`

## Known Bugs & Issues Found During Audit

These are specific issues discovered during a thorough code audit. Fix all of them:

1. **`bg-primary-lighter` is undefined** in `tailwind.config.ts` — causes transparent backgrounds. Found in:
   - `apps/web/components/layout/user-button.tsx` (line ~75)
   - `apps/web/components/ui/loading-state.tsx` (lines ~51, ~69)
   - Fix: Either add `primary-lighter` to `tailwind.config.ts` mapped to the `--primary-alpha-10` CSS variable, or replace with `bg-primary-alpha-10`

2. **Hardcoded `text-blue-500`** in `apps/web/components/orders/status-badge.tsx` (line 16) for `partially_paid` status — should use `text-information-base` design token instead

3. **Typography inconsistencies across subheading-xs usage**:
   - `app-shell.tsx` & `user-button.tsx`: `text-subheading-xs uppercase font-medium tracking-wider`
   - `orders-dashboard.tsx`: `text-subheading-xs uppercase font-medium tracking-wide`
   - `auth-shell.tsx` & `page-header.tsx`: `text-subheading-xs uppercase font-medium` (no tracking)
   - `order-detail-workspace.tsx`: `text-subheading-xs font-semibold uppercase tracking-wider`
   - The config already defines `letterSpacing: '0.04em'` for `subheading-xs`. Standardize: remove all manual tracking overrides and use consistent font weight

4. **Table header style mismatch**: Order form line items editor (`order-form.tsx:~243`) uses raw `th` with `text-subheading-2xs uppercase text-text-soft-400 font-medium`, while view-mode data tables use `TableHead` with `text-paragraph-sm text-text-sub-600 font-normal`. Harmonize these.

5. **Mixed label font weights**: `label-sm` defaults to weight 500 in config, but some components add `font-semibold` (600) while others add `font-medium` (500). Establish a clear rule and apply consistently.

6. **Spacing after back links**: `/orders/new` and `/orders/[orderId]/edit` use `mt-4 mb-6` after the back link, while `/orders/[orderId]` uses `mt-5 ... pb-6`. Standardize.

## Requirements

### R1. Visual Consistency and Spacing
Audit and fix every page and component for: inconsistent margin/padding patterns, mixed typography scales and weights, inconsistent border-radius values, and uneven card/section spacing. Establish and apply a consistent visual rhythm across all screens: auth pages (login, register), main dashboard, order detail, order create/edit, and all modal dialogs.

### R2. Component Refinement and Visual Appeal
Elevate the visual quality of individual components and screens to production SaaS standards. This includes: summary KPI cards on the dashboard, the orders table and its rows (desktop and mobile treatments), order detail financial metrics and line-items table, payment dialog, status badges, form inputs, the auth shell split-screen layout, empty states, error states, and the sample data CTA card. Each component should feel deliberate, refined, and cohesive with every other component.

### R3. Interaction Polish and Micro-feedback
Add subtle interaction polish: hover states on interactive elements (table rows, cards, buttons), focus-visible rings that are consistent, smooth transitions on state changes (sidebar collapse, dialog open/close, loading→content), and appropriate visual feedback for user actions.

### R4. Responsive Design Coherence
Ensure every screen works well from 320px mobile through 1440px+ desktop. The mobile drawer navigation, stacked order rows on small screens, and form layouts on narrow viewports should all feel intentionally designed. Fix any overflow, cramping, or awkward breakpoint transitions.

## Acceptance Criteria

### Build Integrity
- [ ] `pnpm typecheck` passes with zero errors
- [ ] `pnpm lint` passes with zero errors and zero warnings
- [ ] `pnpm build` succeeds for all workspace packages
- [ ] All 127 existing tests pass (`pnpm --filter @crossval/web test`)
- [ ] No new dependencies added without clear justification
- [ ] No behavioral changes — all existing functionality preserved exactly

### Bug Fixes
- [ ] `bg-primary-lighter` is either defined in tailwind config or replaced with a valid token everywhere
- [ ] Zero hardcoded Tailwind color classes (no `text-blue-500`, `bg-gray-100`, `hover:bg-red-700`, etc.) — all colors use Align UI semantic tokens
- [ ] All `subheading-xs` usages have consistent font weight and no manual tracking overrides
- [ ] Table headers use consistent typography between form edit mode and view mode

### Visual Quality (agent-as-judge rubric)
An independent reviewer agent must verify each of the following by reading the final source code:

- [ ] **Consistent spacing**: All pages use the same margin/gap patterns between similar section types. No mixed `mt-5`/`mt-6` for equivalent contexts.
- [ ] **Consistent typography**: Text sizing and weight follows a clear hierarchy — page titles, section headings, labels, body text, and hints each use exactly one size/weight combination across the entire app.
- [ ] **Design token compliance**: Zero hardcoded color values. All colors use Align UI tokens.
- [ ] **Border radius consistency**: Cards, inputs, buttons, badges, and modals use consistent border-radius values.
- [ ] **Hover/focus states**: Every interactive element has visible hover and focus-visible states.
- [ ] **Responsive layout**: Auth pages, dashboard, order detail, and forms render without horizontal overflow at 320px, 768px, and 1440px viewport widths.

### Code Quality
- [ ] No commented-out code, unused imports, or dead CSS classes
- [ ] Changes are limited to `apps/web` — no API or contracts changes
- [ ] Git diff is clean and reviewable
