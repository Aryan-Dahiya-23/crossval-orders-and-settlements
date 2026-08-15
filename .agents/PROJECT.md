# Project: CrossVal — Orders & Settlements UI/UX Polish

## Architecture
- **Target Application**: `apps/web` (Next.js 16.3.1 App Router, TypeScript, React Query, React Hook Form, Align UI primitives, RemixIcon, Tailwind CSS v3).
- **Design System**: Align UI token taxonomy, dynamic HSL alpha syntax, 22-token typography scale, strict semantic colors, zero raw hardcoded palette colors.
- **Reference Standard**: `/Users/aryandahiya/Desktop/Programming/crossval-tracker` design playbook and token architecture.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Token Engine & Dynamic HSL | Upgrade `tailwind.config.ts` and `globals.css` with dynamic `hsl(var(--token) / <alpha-value>)`, add border radii ('12', '16'), alias Align UI tokens, harmonize `cn.ts` | M1 | DONE |
| 2 | 6 Audit Bugs Fixes | Fix bg-primary-lighter, hardcoded text-blue-500, subheading-xs tracking/weights, table header mismatch, label weights, back link spacing | M1 | DONE |
| 3 | Layout Shell & Auth Polish | Refine `app-shell.tsx`, `auth-shell.tsx` (fix mobile `lg:border-r`), navigation active pills, user button, mobile drawer | M2 | DONE |
| 4 | Dashboard & KPI Cards Refinement | Elevate summary KPI scorecards with semantic icon bubbles, bold tabular numerals, hover depth, refine segmented filters & search toolbar, table container styling | M3 | DONE |
| 5 | Order Detail & Payment Settlement Polish | Refine financial metrics scorecards, line-items table, payment ledger, live payment modal preview, delete dialog, order lock banners | M4 | DONE |
| 6 | Order Create/Edit Workspaces | Refine customer & terms form inputs, line items editor table & mobile stacked cards, grand total calculation bar, backlink spacing | M5 | DONE |
| 7 | Full E2E & Adversarial Verification | Run typecheck, lint, build, all 127+ unit tests, multi-tier adversarial checks, forensic integrity audit | M6 | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Token Engine & 6 Audit Bug Fixes | `tailwind.config.ts`, `globals.css`, `utils/cn.ts`, `lib/cn.ts`, `status-badge.tsx`, `loading-state.tsx`, `order-form.tsx` headers | none | DONE |
| M2 | Shell, Navigation & Auth Views | `app-shell.tsx`, `auth-shell.tsx`, `user-button.tsx`, `page-header.tsx`, login/register pages | M1 | DONE |
| M3 | Dashboard, KPI Cards & Orders Table | `orders-dashboard.tsx`, `orders-toolbar.tsx`, `orders-pagination.tsx`, `sample-data-cta.tsx`, `table.tsx` | M1 | DONE |
| M4 | Order Detail, Financial Metrics & Modals | `order-detail-workspace.tsx`, `order-action-bar.tsx`, `order-lock-banner.tsx`, `payment-dialog.tsx`, `order-delete-dialog.tsx`, `modal.tsx` | M1 | DONE |
| M5 | Order Creation & Edit Workspaces | `create-order-workspace.tsx`, `edit-order-workspace.tsx`, `order-form.tsx`, `order-edit-guard.tsx` | M1 | DONE |
| M6 | Comprehensive Verification & Final Audit | Workspace build, typecheck, lint, 136 web tests, 131 API tests, responsive audits, forensic integrity audit | M1-M5 | DONE |

## Code Layout
- `apps/web/tailwind.config.ts`: Tailwind configuration, tokens, font scale, border radii, shadows.
- `apps/web/app/globals.css`: Root CSS variables (raw HSL channels), optical RemixIcon styling, utilities.
- `apps/web/lib/cn.ts`: Re-export of configured custom twMerge utility.
- `apps/web/utils/cn.ts`: Align UI custom Tailwind merge configuration.
- `apps/web/components/ui/`: 19 reusable Align UI primitives (Button, Input, Select, Table, StatusBadge, Modal, Alert, etc.).
- `apps/web/components/layout/`: App shell, mobile header, auth shell, page header, user button.
- `apps/web/components/orders/`: Dashboard, order detail workspace, create/edit workspaces, form components, dialogs, status badges, pagination, toolbar.
- `apps/web/components/auth/`: Login and registration form wrappers.

## Interface Contracts
- **Visual-only invariance**: All React props, URL search parameters (`status`, `sort`, `search`, `page`), React Query hooks (`useOrders`, `useOrder`, `useCreateOrder`, `useUpdateOrder`, `useDeleteOrder`, `useRecordPayment`), Zod validation schemas, and integer-cents money calculations remain strictly identical.
- **Zero backend/contracts modifications**: `apps/api` and `packages/contracts` remain completely untouched.
