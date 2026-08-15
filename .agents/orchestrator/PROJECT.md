# Project: CrossVal UI/UX Polish

## Architecture
- **Web App**: Next.js 14 App Router in `apps/web`
- **Styling**: Tailwind CSS + Align UI Design Tokens + RemixIcon (`@remixicon/react`)
- **State Management**: TanStack React Query for server state, React Hook Form + Zod for forms
- **Quality Reference**: `/Users/aryandahiya/Desktop/Programming/crossval-tracker`

## Feature Inventory
| # | Feature / Work Item | Description | Milestone | Source |
|---|---------------------|-------------|-----------|--------|
| 1 | `bg-primary-lighter` Token Fix | Define `primary.lighter: 'hsl(var(--primary-alpha-10))'` in `tailwind.config.ts` | M1 | Bug 1 |
| 2 | Hardcoded Colors Elimination | Replace `text-blue-500` with `text-information-base` in `status-badge.tsx`; fix red classes in `button.tsx` | M1 | Bug 2 |
| 3 | `subheading-xs` Typography Standardization | Standardize weight, remove manual tracking overrides across all 5+ component files | M1 | Bug 3 |
| 4 | Table Header Typography Harmony | Harmonize table headers in `order-form.tsx` with view-mode `TableHead` (`text-paragraph-sm text-text-sub-600`) | M1 | Bug 4 |
| 5 | Label Font Weights Standardization | Standardize field labels (`label-sm font-medium`) and section titles | M1 | Bug 5 |
| 6 | Back-Link Spacing Standardization | Standardize header containers across create, edit, and detail views to `mt-4 mb-6` | M1 | Bug 6 |
| 7 | Layout & App Shell Refinement | Polish sidebar, mobile navigation drawer, header, and user profile popover | M2 | R1, R4 |
| 8 | Auth Shell & Screens Polish | Elevate login and signup screens with split layout, brand showcase, and refined inputs | M2 | R1, R2 |
| 9 | Dashboard KPI Summary Cards | Semantic tinted icon badges with inset rings, hover shadow elevations (`hover:shadow-regular-sm`) | M2 | R2, R3 |
| 10 | Orders Table & Filter Toolbar | Desktop and mobile row treatments, hover tints, segmented filters, focus rings, pagination | M2 | R1, R2, R3, R4 |
| 11 | Empty, Loading & CTA States | Polish dashboard empty states, loading skeletons, and sample data CTA card | M2 | R2 |
| 12 | Order Detail Workspace & Scorecard | Financial summary cards, balance metrics, payment progress bar, payment history ledger | M3 | R1, R2 |
| 13 | Order Create & Edit Forms | Line item dynamic table editor, subtotal/tax cards, validation states, action buttons | M3 | R1, R2, R4 |
| 14 | Payment Settlement Modal | Input controls, remaining balance shortcut, shaded footer (`bg-bg-weak-50/50`), focus rings | M3 | R2, R3 |
| 15 | Order Delete & Confirmation Modals | Destructive modal styling, warning alerts, focus rings, disabled/loading states | M3 | R2, R3 |
| 16 | Responsive Layout Coherence | Verify 320px mobile, 768px tablet, and 1440px desktop across all screens with 0 overflow | M2, M3 | R4 |
| 17 | Interaction & Focus Ring Polish | Consistent `focus-visible:` rings, hover transitions, and interactive micro-feedback | M1, M2, M3 | R3 |
| 18 | Build & Test Suite Verification | `pnpm typecheck`, `pnpm lint`, `pnpm build`, 127 web tests pass | M4 | AC |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|--------------|--------|
| M1 | Core Tokens, Typography & Bug Fixes | `tailwind.config.ts`, `button.tsx`, `status-badge.tsx`, `order-form.tsx` headers, `subheading-xs` tracking, back link spacing | none | PLANNED |
| M2 | Auth, Layout, Navigation & Dashboard Polish | `app-shell.tsx`, `sidebar.tsx`, `user-button.tsx`, `auth-shell.tsx`, `login/page.tsx`, `signup/page.tsx`, `orders-dashboard.tsx`, `kpi-cards.tsx`, `orders-table.tsx`, `orders-toolbar.tsx`, `orders-mobile-list.tsx`, empty/loading states | M1 | PLANNED |
| M3 | Order Detail, Create/Edit Forms & Modals | `order-detail-workspace.tsx`, `create-order-workspace.tsx`, `edit-order-workspace.tsx`, `order-form.tsx`, `payment-dialog.tsx`, `order-delete-dialog.tsx`, `order-action-bar.tsx` | M1, M2 | PLANNED |
| M4 | Comprehensive Verification & Final Audit | Typecheck, lint, build, all 127 web vitest tests, visual token compliance, forensic integrity audit | M1, M2, M3 | PLANNED |

## Interface Contracts & Guidelines
- **Tokens**: Use Align UI tokens exclusively (`text-text-strong-950`, `bg-bg-white-0`, `ring-stroke-soft-200`, `bg-primary-lighter`, `text-information-base`, `hover:bg-error-dark`, etc.).
- **Typography**:
  - `subheading-xs`: Use token default (0.04em letter-spacing, weight 500). No ad-hoc `tracking-*` overrides.
  - `label-sm`: Use `font-medium` for input labels.
  - Section headers: Use `font-semibold text-text-strong-950`.
- **Spacing**:
  - Sub-page back-link headers: Container `mt-4 mb-6`.
  - Card padding: `p-5` or `p-6`.
- **Interactions**:
  - Cards: `transition-all duration-200 hover:shadow-regular-sm`.
  - Table rows: `group-hover/row:bg-bg-weak-50/50`.
  - Interactive controls: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950`.
- **Zero Behavioral Regressions**: Do not alter API request/response types, form schema validations, React Query query keys, or idempotency keys.
