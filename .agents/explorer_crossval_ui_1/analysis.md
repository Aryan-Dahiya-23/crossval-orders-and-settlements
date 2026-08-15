# UI/UX Codebase Audit & Gap Analysis Report

**Target Workspace**: `apps/web` (Next.js 15 App Router, React 19, Tailwind CSS, Align UI tokens, RemixIcon)  
**Reference Benchmark**: `/Users/aryandahiya/Desktop/Programming/crossval-tracker`  
**Date**: 2026-08-15  
**Test Suite Status**: 11 test suites, 127 tests passing (`pnpm --filter @crossval/web test`)

---

## Executive Summary

The CrossVal web application (`apps/web`) is functionally complete, with complete authentication, orders CRUD, idempotent payment settlements, URL-synced search/filter/sort pagination, and responsive layouts. The application already adopts Align UI design principles and tokens. However, our codebase audit identified specific design token gaps, typography inconsistencies, table header discrepancies, spacing misalignments, and interaction/focus gaps that need refinement to achieve production SaaS polish.

---

## Section 1: Known Bug Locations & Root Cause Analysis

### 1.1 `bg-primary-lighter` Undefined in Tailwind Configuration
- **Observed Locations**:
  1. `apps/web/components/layout/user-button.tsx:75`
     ```tsx
     <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
     ```
  2. `apps/web/components/ui/loading-state.tsx:51`
     ```tsx
     <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
     ```
  3. `apps/web/components/ui/loading-state.tsx:69`
     ```tsx
     <div className="flex size-10 items-center justify-center rounded-xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
     ```
- **Root Cause**:
  In `apps/web/tailwind.config.ts` (lines 342–349), the `primary` color token group is defined as:
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
  `lighter` is missing from `primary` in `tailwind.config.ts`, causing `bg-primary-lighter` to be an unrecognized Tailwind utility that produces no CSS background rule (rendering as transparent).
- **Resolution Options**:
  1. Add `lighter: 'hsl(var(--primary-alpha-10))'` (or `hsl(var(--primary-lighter))`) to `tailwind.config.ts` under `theme.colors.primary` to match the sibling tracker pattern.
  2. Replace `bg-primary-lighter` with `bg-primary-alpha-10` in `user-button.tsx` and `loading-state.tsx`.
  3. Both: Add `lighter` to `tailwind.config.ts` and ensure components use valid tokens.

---

### 1.2 Hardcoded Color Classes Across Components
- **Observed Locations**:
  1. `apps/web/components/orders/status-badge.tsx:16`
     ```tsx
     case "partially_paid":
       statusVariant = "pending";
       dotColorClass = "text-blue-500";
       break;
     ```
     **Root Cause**: Hardcoded Tailwind default blue `text-blue-500` instead of the Align UI token `text-information-base`.
  2. `apps/web/components/ui/button.tsx:195`
     ```tsx
     variant: 'error',
     mode: 'filled',
     class: {
       root: [
         'bg-error-base text-static-white',
         'hover:bg-red-700', // <-- Hardcoded color class!
         'focus-visible:shadow-button-error-focus',
       ],
     },
     ```
     **Root Cause**: Hardcoded `hover:bg-red-700` instead of tokenized `hover:bg-error-dark` or `hover:bg-error-darker`.
  3. `apps/web/components/auth/auth-shell.tsx:41`
     ```tsx
     <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
     ```
     **Root Cause**: Arbitrary `#fff` in CSS background linear gradient rather than using static white or standard grid overlay.

---

### 1.3 `subheading-xs` Usages and Tracking/Font-Weight Overrides
- **Token Definition**:
  In `apps/web/tailwind.config.ts` (lines 150–157):
  ```ts
  'subheading-xs': [
    '.75rem',
    {
      lineHeight: '1rem',
      letterSpacing: '0.04em',
      fontWeight: '500',
    },
  ],
  ```
  `subheading-2xs` (lines 158–165):
  ```ts
  'subheading-2xs': [
    '.6875rem',
    {
      lineHeight: '.75rem',
      letterSpacing: '0.02em',
      fontWeight: '500',
    },
  ],
  ```
- **Inconsistencies Observed**:
  | File & Line | Usage in Code | Inconsistency |
  |---|---|---|
  | `components/layout/app-shell.tsx:114` | `text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider` | Redundant `font-medium`, manual `tracking-wider` (0.05em overrides token 0.04em) |
  | `components/layout/app-shell.tsx:181` | `text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider` | Redundant `font-medium`, manual `tracking-wider` |
  | `components/layout/user-button.tsx:98` | `text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider` | Redundant `font-medium`, manual `tracking-wider` (overrides 0.02em) |
  | `components/orders/orders-dashboard.tsx:417` | `text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400` | Redundant `font-medium`, manual `tracking-wide` (0.025em overrides 0.04em) |
  | `components/orders/edit-order-workspace.tsx:57` | `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400` | Overrides font-weight to `font-semibold` and letter-spacing to `tracking-wider` |
  | `components/orders/order-detail-workspace.tsx:63` | `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400` | Overrides font-weight to `font-semibold` and letter-spacing to `tracking-wider` |
  | `components/auth/auth-shell.tsx:22` | `text-subheading-xs uppercase font-medium text-text-soft-400` | Clean (no manual tracking override) |
  | `components/layout/page-header.tsx:18` | `text-subheading-xs uppercase font-medium text-text-soft-400` | Clean (no manual tracking override) |
  | `components/orders/order-detail-workspace.tsx:285`| `text-subheading-xs uppercase font-medium text-text-soft-400` | Clean (no manual tracking override) |
- **Standardization Rule**:
  Remove all manual `tracking-wider` / `tracking-wide` overrides so that the typography token `letterSpacing: '0.04em'` (or `'0.02em'` for 2xs) applies uniformly across the entire app. Use consistent `font-medium` (token default) or deliberate `font-semibold` strictly where established.

---

### 1.4 Table Header Typography Mismatch (Edit Mode vs View Mode)
- **Observed Locations**:
  1. `apps/web/components/orders/order-form.tsx:243` (Form line items editor):
     ```html
     <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">
       <th className="w-10 px-3 py-2.5 text-center">#</th>
       <th className="px-3 py-2.5">Description</th>
       <th className="w-28 px-3 py-2.5 text-center">Quantity</th>
       <th className="w-36 px-3 py-2.5 text-right">Unit price ($)</th>
       <th className="w-36 px-3 py-2.5 text-right">Line total</th>
       <th className="w-12 px-2 py-2.5 text-center" aria-label="Actions" />
     </tr>
     ```
  2. `apps/web/components/orders/orders-dashboard.tsx:309–319` (Dashboard orders data table):
     ```tsx
     <Table.Header>
       <tr>
         <Table.Head>Order</Table.Head>
         <Table.Head>Status</Table.Head>
         <Table.Head>Due date</Table.Head>
         <Table.Head className="text-right">Total</Table.Head>
         <Table.Head className="text-right">Paid</Table.Head>
         <Table.Head className="text-right">Balance</Table.Head>
         <Table.Head className="w-12 text-center" aria-label="Open order" />
       </tr>
     </Table.Header>
     ```
  3. `apps/web/components/orders/order-detail-workspace.tsx:166–173` (Detail line items view table):
     ```tsx
     <Table.Header>
       <Table.Row>
         <Table.Head>Description</Table.Head>
         <Table.Head className="text-center">Qty</Table.Head>
         <Table.Head className="text-right">Unit price</Table.Head>
         <Table.Head className="text-right">Line total</Table.Head>
       </Table.Row>
     </Table.Header>
     ```
  4. `apps/web/components/ui/table.tsx:36` (TableHead primitive):
     ```tsx
     className={cnExt(
       'bg-bg-weak-50 px-3 py-2 text-left text-paragraph-sm text-text-sub-600 first:rounded-l-lg last:rounded-r-lg',
       className,
     )}
     ```
- **Discrepancy**:
  `order-form.tsx` uses raw `th` elements with `text-subheading-2xs uppercase text-text-soft-400 font-medium`, whereas the data tables in view mode (`orders-dashboard.tsx` and `order-detail-workspace.tsx`) use `Table.Head` with `text-paragraph-sm text-text-sub-600`.
- **Harmonization**:
  Use `Table.Head` (or align the typography) so table headers across both edit and view modes have consistent font size, weight, text color, and padding.

---

### 1.5 Mixed Label Font Weights Across Forms & Components
- **Token Default**:
  `label-sm` in `tailwind.config.ts:78–85`: `fontWeight: '500'`, `letterSpacing: '-0.006em'`.
  `label-md` in `tailwind.config.ts:70–77`: `fontWeight: '500'`, `letterSpacing: '-0.011em'`.
- **Observed Inconsistencies**:
  - `components/ui/label.tsx:20`: `LabelRoot` has `text-label-sm text-text-strong-950` (weight 500 by token).
  - `components/ui/input.tsx:347`: `Field` explicitly adds `font-medium`:
    `<LabelPrimitive.Root htmlFor={htmlFor} className="text-label-sm text-text-strong-950 font-medium flex items-center">`
  - In other components, section headers or card titles mixing `font-semibold` vs `font-medium`:
    - `orders-dashboard.tsx:171`: `text-label-sm font-semibold text-text-strong-950` (Orders card heading)
    - `orders-dashboard.tsx:229`: `text-label-sm font-semibold text-text-strong-950` (Error alert heading)
    - `orders-dashboard.tsx:249`: `text-label-sm font-semibold text-text-strong-950` (Empty state heading)
    - `order-form.tsx:154, 204`: `text-label-md font-semibold text-text-strong-950` (Customer & Terms, Line Items headings)
    - `order-detail-workspace.tsx:304`: `text-label-sm font-semibold text-text-strong-950` (PanelHeader)
    - `sample-data-cta.tsx:52`: `text-label-md font-semibold text-text-strong-950` (CTA heading)
    - `user-button.tsx:81`: `text-label-sm font-medium text-text-strong-950`
- **Standardization Rule**:
  - **Form Input Labels**: Use `text-label-sm font-medium text-text-strong-950` (via `Field` / `Label.Root`).
  - **Section / Card Subheadings**: Use `text-label-md font-semibold text-text-strong-950` or `text-label-sm font-semibold text-text-strong-950` consistently.
  - **Micro Metadata / Tags**: Use `text-subheading-2xs uppercase text-text-soft-400 font-medium`.

---

### 1.6 Inconsistent Spacing After Back Links
- **Observed Locations**:
  1. `apps/web/components/orders/create-order-workspace.tsx:42–56`:
     ```tsx
     <Link className="..." href="/orders">
       <RiArrowLeftLine className="size-4" /> All orders
     </Link>
     <div className="mt-4 mb-6">
       <PageHeader ... />
     </div>
     ```
  2. `apps/web/components/orders/edit-order-workspace.tsx:125–139`:
     ```tsx
     <Link className="..." href={`/orders/${order.id}`}>
       <RiArrowLeftLine className="size-4" /> Back to order details
     </Link>
     <div className="mt-4 mb-6">
       <PageHeader ... />
     </div>
     ```
  3. `apps/web/components/orders/order-detail-workspace.tsx:89–97`:
     ```tsx
     <Link className="..." href="/orders">
       <RiArrowLeftLine className="size-4" /> All orders
     </Link>
     <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
     ```
- **Discrepancy**:
  `create-order-workspace` and `edit-order-workspace` wrap `PageHeader` in `<div className="mt-4 mb-6">` (outer top margin 16px, bottom margin 24px), whereas `order-detail-workspace` uses `<header className="mt-5 ... pb-6">` (top margin 20px, bottom padding 24px).
- **Standardization Rule**:
  Standardize the vertical rhythm: `mt-5 mb-6` (or uniform `mt-4 mb-6`) between back link and header across `/orders/new`, `/orders/[orderId]`, and `/orders/[orderId]/edit`.

---

## Section 2: Component Inventory & UI Structure

### 2.1 Layout Components (`components/layout/` & `components/auth/`)
| Component | Path | Description & Hierarchy | Tokens / State |
|---|---|---|---|
| `AppShell` | `components/layout/app-shell.tsx` | Main application shell with collapsible sidebar on desktop (`w-[272px]` / `w-[82px]`, `⌘B` toggle, 300ms transition) and mobile drawer menu (`Dialog.Content`). Main content `max-w-[1440px]`. | `bg-bg-weak-50`, `border-stroke-soft-200`, `shadow-regular-xs` |
| `Brand` | `components/layout/brand.tsx` | App brand logo with RemixIcon `RiBarChartGroupedFill` in rounded container. Supports collapsed and inverse (dark mode / white) modes. | `rounded-10`, `ring-stroke-soft-200`, `text-primary-base` |
| `Navigation` | `components/layout/navigation.tsx` | Primary navigation configuration (`/orders`, `/orders/new`) and active pathname detection logic. | `RiFileList3Line`, `RiAddCircleLine` |
| `PageHeader` | `components/layout/page-header.tsx` | Standard top page header with optional uppercase eyebrow, responsive title (`text-title-h5 sm:text-title-h4`), description, and action button slot. | `border-b border-stroke-soft-200 pb-6` |
| `UserButton` | `components/layout/user-button.tsx` | User profile trigger and dropdown menu displaying user email initial, signed-in email address, and sign-out button with mutation state. | `rounded-10`, `bg-primary-lighter` (bug to fix), `Dropdown.Root` |
| `AuthShell` | `components/auth/auth-shell.tsx` | Split-screen SaaS authentication shell (`lg:grid-cols-[minmax(420px,.9fr)_minmax(520px,1.1fr)]`). Left: form container. Right: dark branding panel. | `bg-primary-base`, `text-static-white`, `max-w-[400px]` |
| `AuthBoundary` | `components/auth/auth-boundary.tsx` | `ProtectedRoute` and `PublicOnlyRoute` wrappers managing authentication state, session validation, and full-screen loading/error screens. | Pulse icon loader, session error with retry |
| `AuthenticatedWorkspace` | `components/auth/authenticated-workspace.tsx` | Thin connector wrapping `ProtectedRoute` around `OrdersDashboard`. | — |
| `LogoutButton` | `components/auth/logout-button.tsx` | Standalone sign-out button with loading and error states. | `Button.Root` |

---

### 2.2 UI Primitives (`components/ui/`)
| Primitive | Path | Features & Modes | Notes / Gaps |
|---|---|---|---|
| `Button` | `components/ui/button.tsx` | Variants: `primary`, `neutral`, `error`. Modes: `filled`, `stroke`, `lighter`, `ghost`. Sizes: `medium`, `small`, `xsmall`. | Error filled hover has `hover:bg-red-700` (bug). |
| `CompactButton` | `components/ui/compact-button.tsx` | Small icon buttons for close actions and toolbar controls (`stroke`, `ghost`, `white`). | Has focus-visible styles. |
| `Input` & `Field` | `components/ui/input.tsx` | Composable `InputRoot`, `Wrapper`, `InputSlot`, `Icon`, `Affix`, and unified `Field` with label, asterisk, optional, hint, and error alert. | Polished Align UI pattern. |
| `Select` | `components/ui/select.tsx` | Radix UI accessible Select primitive (`Root`, `Trigger`, `Content`, `Item`) and native `<select>` wrapper component. | Full keyboard navigation and scroll area. |
| `Table` | `components/ui/table.tsx` | `Root`, `Header`, `Head`, `Body`, `Row`, `Cell`, `RowDivider`. Subtitle hover effect, rounded corners. | `TableHead` uses `text-paragraph-sm text-text-sub-600`. |
| `Badge` | `components/ui/badge.tsx` | Align UI badge with variants (`filled`, `light`, `lighter`, `stroke`), 10 color tokens, dot slot, square mode. | Full token coverage. |
| `StatusBadge` | `components/ui/status-badge.tsx` | Align UI status badge primitive (`stroke`, `light`) with `completed`, `pending`, `failed`, `disabled`. | Reusable dot and icon slots. |
| `Modal` | `components/ui/modal.tsx` | Radix Dialog wrapper with `Overlay` (backdrop blur), `Content` (zoom/fade animations), `Header`, `Title`, `Description`, `Body`, `Footer`. | `rounded-20`, `shadow-regular-md`. |
| `Alert` | `components/ui/alert.tsx` | Toast/inline alert banner with 5 tones (`danger`, `warning`, `success`, `info`, `neutral`) and RemixIcons. | `rounded-xl`, `text-paragraph-xs font-medium`. |
| `LoadingState` | `components/ui/loading-state.tsx` | `LoadingSpinner`, `PageLoadingState`, `TableLoadingState`, `InlineLoadingState`. | Uses `bg-primary-lighter` (bug to fix). |
| `Skeleton` | `components/ui/skeleton.tsx` | Shimmer animated skeleton placeholder using CSS keyframe `shimmer-sweep`. | `animate-shimmer rounded-lg`. |
| `Pagination` | `components/ui/pagination.tsx` | Align UI pagination primitive with `NavButton` and `Item` variants (`basic`, `rounded`, `group`). | Needs focus-visible ring styles. |
| `Divider` | `components/ui/divider.tsx` | Separator line with variants: `line`, `line-spacing`, `line-text`, `content`, `text`, `solid-text`. | Clean. |
| `Dropdown` | `components/ui/dropdown.tsx` | Radix DropdownMenu with items, submenus, checkboxes, radio items, separators. | Full keyboard accessibility. |
| `Textarea` | `components/ui/textarea.tsx` | Textarea with error ring, focus within shadows, and `CharCounter`. | Matches input styling. |
| `Tooltip` | `components/ui/tooltip.tsx` | Radix Tooltip with `bg-bg-strong-950 text-text-white-0` and fade/zoom transitions. | Clean. |
| `WidgetBox` | `components/ui/widget-box.tsx` | Dashboard card box container with header and icon slot. | `rounded-2xl`, `shadow-regular-xs`. |

---

### 2.3 Feature Components (`components/orders/` & `components/auth/`)
| Component | Path | Functionality & Key Elements | Layout & Token Characteristics |
|---|---|---|---|
| `OrdersDashboard` | `components/orders/orders-dashboard.tsx` | Core operational dashboard view: PageHeader, SampleDataCTA, 4 summary KPI cards, Orders table with toolbar, empty/loading states, pagination. | `grid sm:grid-cols-2 xl:grid-cols-4`, desktop table + mobile card row treatments. |
| `OrdersToolbar` | `components/orders/orders-toolbar.tsx` | Segmented status filter tabs (All, Pending, Partially paid, Paid, Overdue), Sort select dropdown, debounced search with clear button. | `rounded-10 bg-bg-weak-50 p-1`, `overflow-x-auto` for horizontal scroll on mobile. |
| `OrdersPagination` | `components/orders/orders-pagination.tsx` | Result count range (`1–10 of 25`), page size dropdown, current page indicator, previous/next buttons. | `border-t border-stroke-soft-200 px-5 py-4`. |
| `OrderDetailWorkspace`| `components/orders/order-detail-workspace.tsx`| Full order detail screen with back link, header, `OrderActionBar`, `OrderLockBanner` (conditional), 3 financial metrics cards, line items table, payment history ledger, payment dialog, delete dialog. | `grid gap-6 xl:grid-cols-[1.6fr_1fr]`, `PanelHeader`, `FinancialMetric`. |
| `OrderForm` | `components/orders/order-form.tsx` | Order creation and editing form. Dual layout hook `useDesktopLineItemsLayout` for desktop data table vs mobile stacked cards. Real-time line total & grand total calculation. | `max-w-4xl space-y-6`, `Customer & Terms`, `Line Items`. |
| `PaymentDialog` | `components/orders/payment-dialog.tsx` | Payment recording modal with real-time settlement projection card (shows applied payment, projected balance, dynamic badge: Settled in full / Partially paid / Exceeds balance), quick "Use remaining balance" link, date picker, notes, and idempotency key protection. | `max-w-[480px]`, dynamic badge and border highlights. |
| `SampleDataCTA` | `components/orders/sample-data-cta.tsx` | Promotional banner to populate 6 realistic sample orders. Automatically hides once orders exist. | `bg-primary-alpha-10`, `ring-primary-base/25`. |
| `OrderActionBar` | `components/orders/order-action-bar.tsx` | Action buttons: Edit order, Delete order, Record payment / Paid in full badge. Handles locked states gracefully with disabled tooltips/titles. | `flex flex-wrap items-center gap-2 sm:gap-2.5`. |
| `OrderDeleteDialog` | `components/orders/order-delete-dialog.tsx` | Modal confirmation dialog for deleting unpaid orders with order summary card. | `max-w-[440px]`, `Button variant="error"`. |
| `OrderLockBanner` | `components/orders/order-lock-banner.tsx` | Notification banner explaining the domain rule that orders with recorded payments are locked to preserve audit trail. | `bg-bg-weak-50`, `ring-stroke-soft-200`. |
| `OrderEditGuard` | `components/orders/order-edit-guard.tsx` | Guard screen displayed if user navigates directly to `/orders/[orderId]/edit` for a paid/locked order. | `max-w-xl py-12 text-center`. |
| `LoginForm` | `components/auth/login-form.tsx` | Form with email, password, error alert banner, submit button with pending state, link to signup. | `grid gap-4`. |
| `SignupForm` | `components/auth/signup-form.tsx` | Form with email, password (min 6 chars hint), error alert banner, submit button, link to login. | `grid gap-4`. |

---

## Section 3: Interaction & Styling Gaps

### 3.1 Focus-Visible Rings & Keyboard Navigation
1. **Line Item Delete Action in Order Form Table** (`order-form.tsx:342`):
   - Currently: `className="... focus-visible:outline-none"`
   - Gap: Keyboard tab navigation lands on the remove button without any focus ring.
   - Fix: Add `focus-visible:ring-2 focus-visible:ring-error-base rounded-lg`.
2. **"Use remaining balance" Shortcut in Payment Dialog** (`payment-dialog.tsx:253`):
   - Currently: `className="... focus-visible:outline-none"`
   - Gap: Lacks focus ring indicator.
   - Fix: Add `focus-visible:ring-2 focus-visible:ring-stroke-strong-950 rounded-sm`.
3. **Segmented Status Filter Tabs** (`orders-toolbar.tsx:111`):
   - Currently: `className="... outline-none"`
   - Gap: Tabs lack focus-visible rings for keyboard users.
   - Fix: Add `focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:ring-offset-1`.
4. **Clear Search Button** (`orders-toolbar.tsx:168`):
   - Currently: `className="grid size-5 place-items-center text-text-soft-400 hover:text-text-strong-950"`
   - Gap: Lacks focus-visible ring.
   - Fix: Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950 rounded-sm`.
5. **Mobile Remove Item Button** (`order-form.tsx:386`):
   - Currently: `className="text-paragraph-xs font-medium text-error-base disabled:opacity-30"`
   - Gap: Lacks hover underline and focus ring.
   - Fix: Add `hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error-base rounded-sm`.
6. **Pagination Navigation Buttons** (`components/ui/pagination.tsx:20` & `126`):
   - Currently: `navButton` and `item` have `hover:bg-bg-weak-50` but no `focus-visible` ring.
   - Fix: Add `focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:outline-none`.

### 3.2 Hover States & Micro-Feedback Transitions
- **Button Error Hover**: `button.tsx:195` uses `hover:bg-red-700` instead of Align UI token `hover:bg-error-dark`.
- **Card and Table Row Transitions**: Desktop table rows have `group-hover/row:bg-bg-weak-50` and cell transition `transition duration-200 ease-out`. Mobile list items have `hover:bg-bg-weak-50`.
- **Sidebar Collapse Animation**: Smooth 300ms cubic-bezier transition on sidebar width and main padding.

### 3.3 Responsive Breakpoints & Viewport Behavior
- **320px Viewport (Mobile Narrow)**:
  - `AppShell`: Padding `p-4` (16px), available width 288px. Mobile header height 60px.
  - `AuthShell`: Left padding `px-6` (24px each side) leaves 272px for login/signup forms.
  - `OrdersToolbar`: Segmented filters are set to `inline-flex` inside `overflow-x-auto`, so tabs scroll cleanly horizontally without stretching or wrapping.
  - `OrderForm`: `useDesktopLineItemsLayout` detects screen `<640px` and renders single-column stacked item cards (Item #, Remove, Description, 2-col Quantity/Price grid, Line Subtotal).
  - Modals: `ModalContent` is `w-full max-w-[480px]` inside `ModalOverlay` (`p-4 overflow-y-auto`).
- **768px Viewport (Tablet)**:
  - Summary KPI cards arrange in a 2x2 grid (`sm:grid-cols-2`).
  - Orders table switches from stacked mobile list to full desktop `Table.Root` (`md:block`).
  - Order form switches to full width multi-column data table (`sm:min-w-[640px]`).
- **1440px+ Viewport (Desktop Wide)**:
  - Main workspace max width is constrained to `max-w-[1440px]` with center alignment (`mx-auto`).
  - Summary KPI cards expand to 4 columns in 1 row (`xl:grid-cols-4`).
  - Order detail workspace displays side-by-side columns: Line Items on left (`1.6fr`), Payment History on right (`1fr`).

---

## Section 4: Test Suite Status & Layout

### 4.1 Test Suite Overview
- **Framework**: Vitest v4.1.10
- **Command**: `pnpm --filter @crossval/web test`
- **Execution Result**:
  - **11 Test Files Passed (11/11)**
  - **127 Tests Passed (127/127)**
  - **Duration**: ~450ms
- **Lint & Typecheck**:
  - `pnpm typecheck` — 0 errors across `@crossval/contracts`, `apps/api`, `apps/web`.
  - `pnpm lint` — 0 errors across `@crossval/contracts`, `apps/api`, `apps/web`.

### 4.2 Test File Inventory
| Test File Path | Tests | Coverage Scope |
|---|---|---|
| `components/orders/order-form.test.ts` | 16 | Currency formatting, decimal string to cents, schema validation, zero/negative bounds, multi-item line subtotal calculations. |
| `components/orders/payment-dialog.test.ts` | 10 | Payment schema validation, overpayment detection, exact settlement calculations, form resetting. |
| `components/orders/challenger-m2-idempotency-cache.test.ts` | 18 | Client-side idempotency key generation, payload fingerprinting, retry reuse of keys. |
| `features/orders/challenger-m2-settlement.test.ts` | 12 | Payment attempt logic, remaining balance recalculation, rejection of duplicate keys. |
| `features/orders/challenger-m1-adversarial.test.ts` | 16 | Immutability guard tests, order edit locking upon payment, rejection of edits. |
| `features/orders/adversarial-milestone1.test.ts` | 20 | Boundary testing for customer names, item quantities, cents limits, and date handling. |
| `features/orders/api.test.ts` | 12 | REST API endpoints, parameter serialization, error responses, JSON payloads. |
| `features/orders/errors.test.ts` | 9 | API error normalization, `ORDER_LOCKED_AFTER_PAYMENT` and `PAYMENT_EXCEEDS_BALANCE` error parsing. |
| `features/orders/list-state.test.ts` | 7 | Search parameter parsing, filter state patch helper, URL generation, pagination bounds. |
| `features/orders/queries.test.ts` | 4 | React Query hook definitions and cache invalidation strategies. |
| `features/orders/query-keys.test.ts` | 3 | React Query key hierarchy consistency. |

---

## Section 5: Implementation Recommendations & Action Plan

1. **Token Fixes**:
   - Add `lighter: 'hsl(var(--primary-alpha-10))'` to `theme.colors.primary` in `tailwind.config.ts`.
   - In `apps/web/components/orders/status-badge.tsx:16`, replace `"text-blue-500"` with `"text-information-base"`.
   - In `apps/web/components/ui/button.tsx:195`, replace `'hover:bg-red-700'` with `'hover:bg-error-dark'`.
2. **Typography Harmonization**:
   - Clean up `subheading-xs` in `app-shell.tsx`, `orders-dashboard.tsx`, `user-button.tsx`, `edit-order-workspace.tsx`, `order-detail-workspace.tsx` by removing manual `tracking-wider` / `tracking-wide` overrides.
   - Standardize table headers across `order-form.tsx` and `orders-dashboard.tsx` / `order-detail-workspace.tsx` using `Table.Head` with `text-paragraph-sm font-medium text-text-sub-600`.
   - Ensure form input labels use `text-label-sm font-medium text-text-strong-950`.
3. **Spacing Harmonization**:
   - Standardize back link margin to `mt-5 mb-6` across `create-order-workspace.tsx`, `edit-order-workspace.tsx`, and `order-detail-workspace.tsx`.
4. **Interaction Polish**:
   - Add visible `focus-visible:ring-2 focus-visible:ring-stroke-strong-950` to segmented filter buttons, search clear button, pagination nav buttons, and table delete button (`focus-visible:ring-error-base`).
   - Enhance hover feedback on mobile order rows and table items.
