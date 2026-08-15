# Specification Analysis & Requirements Catalog: CrossVal UI/UX Polish

## 1. Executive Summary & Specification Scope

This document provides the authoritative, exhaustive specification and requirements catalog for the UI/UX polish of the **CrossVal — Orders & Settlements** web application. 

The application is functionally complete with authentication, order CRUD, atomic payment settlement, and server-backed search/filter/pagination. The objective of this milestone is visual refinement to achieve a production SaaS quality bar matching or exceeding the sibling reference dashboard (`/Users/aryandahiya/Desktop/Programming/crossval-tracker`).

### Core Operating Constraints
- **Visual-Only Scope**: Preserve all existing business logic, server state workflows, query keys, React Query mutation behaviors, and domain invariants. Zero behavioral changes.
- **Package Boundaries**: All edits are strictly limited to `apps/web`. Zero modifications to `apps/api` or `packages/contracts`.
- **Design System Fidelity**: Full adherence to Align UI design tokens and primitives located in `apps/web/components/ui/`. No third-party UI libraries.
- **Iconography**: 100% RemixIcon (`@remixicon/react`).
- **Quality Gates**: `pnpm typecheck` (0 errors), `pnpm lint` (0 errors/warnings), `pnpm build` (clean builds across workspace), and all 127 existing web tests passing (`pnpm --filter @crossval/web test`).

---

## 2. Exhaustive Audit of 6 Known Bugs & Exact Fix Specifications

| # | Bug ID | Observed Issue / Location | Root Cause | Exact Expected Fix Specification | Verification Method |
|---|---|---|---|---|---|
| 1 | **BUG-01: Undefined `bg-primary-lighter` Token** | Found in:<br>• `apps/web/components/layout/user-button.tsx:75`<br>• `apps/web/components/ui/loading-state.tsx:51, 69` | `tailwind.config.ts` defines `primary.dark`, `primary.darker`, `primary.base`, `primary.alpha-24`, `primary.alpha-16`, `primary.alpha-10`, but lacks `primary.lighter`. Resolves to transparent/unstyled background in Tailwind. | In `apps/web/tailwind.config.ts`, add `lighter: 'hsl(var(--primary-alpha-10))'` (or `hsl(var(--primary-lighter))`) under `theme.extend.colors.primary` so `bg-primary-lighter` resolves properly to a soft primary tint (matching sibling reference project pattern). In components, ensure avatar and icon backgrounds render `bg-primary-lighter` (or `bg-primary-alpha-10`) with `ring-1 ring-inset ring-primary-base/20`. | Inspect rendered user avatar & loading state spinner badge; verify background has subtle primary tint with no missing class warnings. |
| 2 | **BUG-02: Hardcoded Tailwind Color Palette Classes** | Found in:<br>• `apps/web/components/orders/status-badge.tsx:16` (`dotColorClass = "text-blue-500"`)<br>• `apps/web/components/ui/button.tsx:195` (`hover:bg-red-700`) | Direct use of default Tailwind palette color names (`blue-500`, `red-700`) instead of semantic Align UI tokens (`information-base`, `error-dark`). | 1. In `status-badge.tsx`, replace `dotColorClass = "text-blue-500"` with `dotColorClass = "text-information-base"` for `partially_paid` status.<br>2. In `button.tsx`, replace `'hover:bg-red-700'` with `'hover:bg-error-dark'` under the `variant: 'error', mode: 'filled'` variant config.<br>3. Verify zero occurrences of standard Tailwind color names (`blue-*`, `red-*`, `gray-*`, `slate-*`, etc.) remain in `apps/web`. | Grep codebase for raw color names (`grep -E "\b(text\|bg\|border\|ring)-(blue\|red\|gray\|slate\|zinc)-[0-9]+"`); confirm zero results. |
| 3 | **BUG-03: Typography Inconsistencies across `subheading-xs`** | Found in:<br>• `app-shell.tsx:114, 181`: `text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider`<br>• `orders-dashboard.tsx:417`: `text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400`<br>• `auth-shell.tsx:22` & `page-header.tsx:18`: `text-subheading-xs uppercase font-medium text-text-soft-400`<br>• `order-detail-workspace.tsx:63` & `edit-order-workspace.tsx:57`: `text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400`<br>• `user-button.tsx:98`: `text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider` | `tailwind.config.ts` explicitly defines `subheading-xs` with `letterSpacing: '0.04em'` and `fontWeight: '500'`. Manual tracking classes (`tracking-wider`, `tracking-wide`) and conflicting weights (`font-semibold`) break typographic rhythm. | Standardize all `subheading-xs` instances across the codebase:<br>1. Remove all manual letter-spacing classes (`tracking-wider`, `tracking-wide`).<br>2. Standardize font weight to `font-medium` (the token default).<br>3. Consistently use `text-subheading-xs uppercase text-text-soft-400` (and `text-subheading-2xs uppercase text-text-soft-400` for 2xs) across all shells, headers, cards, and dropdowns. | Grep for `subheading-xs` and verify no instances contain `tracking-` or `font-semibold`. |
| 4 | **BUG-04: Table Header Style Mismatch (Edit vs View Mode)** | Found in:<br>• `apps/web/components/orders/order-form.tsx:243`: Raw `<tr className="... text-subheading-2xs uppercase text-text-soft-400 font-medium">`<br>• View data tables (`orders-dashboard.tsx:311`, `order-detail-workspace.tsx:168`, `ui/table.tsx:36`): `<Table.Head>` with `text-paragraph-sm text-text-sub-600 font-normal` | The order form line-items editor used raw HTML `<th>` tags with tiny uppercase styling, while all view-mode tables used Align UI `<Table.Head>` component primitives with paragraph-sm styling. | Harmonize table headers across the app:<br>1. Update `order-form.tsx` line-items editor table to use Align UI table primitives (`<Table.Root>`, `<Table.Header>`, `<Table.Head>`) or harmonize typography to `text-paragraph-sm text-text-sub-600` (or the standardized table head token styling).<br>2. Ensure padding, text alignment, and background colors match perfectly across all tables. | Visual inspection of `/orders`, `/orders/[orderId]`, and `/orders/new` tables; verify identical header typography and spacing rhythm. |
| 5 | **BUG-05: Mixed `label-sm` Font Weights** | Found in:<br>• Semibold (600): `page-header.tsx`, `brand.tsx:43`, `order-action-bar.tsx:100`, `order-delete-dialog.tsx:81`, `orders-dashboard.tsx:171, 229, 249, 373`, `order-detail-workspace.tsx:304`<br>• Medium (500): `user-button.tsx:81, 101`, `input.tsx:347`, `ui/label.tsx:20`, `ui/modal.tsx:134` | In `tailwind.config.ts`, `label-sm` has default `fontWeight: '500'`. Different components applied `font-semibold` vs `font-medium` ad-hoc. | Establish a clear typographic rule for labels:<br>• Standard form field labels and UI labels use `text-label-sm font-medium text-text-strong-950` (or default weight).<br>• Section headers and card titles that use `label-sm` / `label-md` use `font-semibold text-text-strong-950` systematically.<br>• Apply this rule consistently across all form fields (`input.tsx`, `order-form.tsx`, `payment-dialog.tsx`, `auth`) and card headers. | Audit all `text-label-sm` usages across `components/` and `app/` to ensure uniform weighting. |
| 6 | **BUG-06: Inconsistent Back-Link Spacing Rhythm** | Found in:<br>• `/orders/new` (`create-order-workspace.tsx:50`): `<div className="mt-4 mb-6"><PageHeader .../></div>`<br>• `/orders/[orderId]/edit` (`edit-order-workspace.tsx:133`): `<div className="mt-4 mb-6"><PageHeader .../></div>`<br>• `/orders/[orderId]` (`order-detail-workspace.tsx:97`): `<header className="mt-5 ... pb-6">` | Arbitrary margin combinations (`mt-4 mb-6` vs `mt-5` with no container) created jarring vertical shifts when navigating between detail and create/edit pages. | Standardize back-link-to-header rhythm across all child pages:<br>1. Ensure back link has consistent hit-target and margin: `inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950`.<br>2. Standardize top margin above header/page content across all subpages to `mt-5` (or consistent `mt-6 mb-6`).<br>3. Remove redundant wrapper divs where direct `<header>` or `<PageHeader>` spacing can be used. | Navigate between `/orders/new`, `/orders/[id]`, and `/orders/[id]/edit`; observe perfectly stable header positioning. |

---

## 3. Comprehensive Requirements Catalog

### R1. Visual Consistency & Spacing Rhythm
- **Layout Spacing System**:
  - Global App Shell: Content container uses `mx-auto min-h-screen w-full max-w-[1440px] p-4 sm:p-6 lg:p-8`.
  - Section Spacing: Between major sections (PageHeader, KPI summary cards, table cards, workspace panels), enforce consistent `mt-6` spacing.
  - Card Inner Padding: Cards and widget boxes use standardized padding: `p-5` (mobile/compact) to `p-6` (desktop).
  - List & Row Gaps: Flex/Grid item gaps standardized to `gap-3` (compact metrics), `gap-4` (summary cards sm), `gap-5` (form field columns), `gap-6` (major panel splits).
- **Typography Scale Hierarchy**:
  - Page Titles (h1): `text-title-h5 font-semibold text-text-strong-950 sm:text-title-h4`
  - Section / Card Headings (h2/h3): `text-label-md font-semibold text-text-strong-950` or `text-title-h6 font-semibold`
  - Eyebrows / Category Tags: `text-subheading-xs uppercase font-medium text-text-soft-400`
  - Form & Field Labels: `text-label-sm font-medium text-text-strong-950`
  - Body / Supporting Text: `text-paragraph-sm text-text-sub-600 leading-normal`
  - Subtext / Metadata / Timestamps: `text-paragraph-xs text-text-sub-600` or `text-subheading-2xs text-text-soft-400`
  - Financial Currency / Numbers: Always use `tabular-nums`, format with `formatUsd`, right-aligned in tabular contexts, `font-semibold` when emphasizing active balance or grand totals.
- **Border Radius Discipline**:
  - Main Cards, Modal Dialogs, Summary Panels: `rounded-2xl` (1.25rem / 20px).
  - Intermediate Boxes, Form Sections, Alert Banners: `rounded-xl` (0.75rem) or `rounded-2xl`.
  - Buttons (medium/large), Segmented Controls, User Dropdown: `rounded-10` (.625rem / 10px).
  - Small Buttons, Navigation Links, Input Fields: `rounded-lg` (0.5rem / 8px).
  - Status Badges, Pill Tags, Avatar Circles: `rounded-full` (9999px).

### R2. Component Refinement & Visual Appeal
- **Dashboard KPI Cards (Summary Cards)**:
  - 4 core metrics: Total Orders, Outstanding Balance, Amount Collected, Overdue Balance.
  - Structure: Clean icon pill (`size-10 rounded-full bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200`), uppercase category label (`text-subheading-xs`), bold metric value (`text-title-h5 font-semibold tabular-nums`), subtext hint (`text-paragraph-xs text-text-sub-600`).
  - Alert Tone: When overdue balance > 0, overdue card renders with `bg-error-lighter/50`, `text-error-base`, and `ring-error-light` for immediate executive clarity without noisy charts.
- **Orders Table (Desktop & Mobile)**:
  - Desktop: Align UI Table with crisp borders (`border-b border-stroke-soft-200`), subtle row hover effect (`hover:bg-bg-weak-50/70`), numeric values right-aligned with `tabular-nums`, primary link on customer name with display ID mono subtext, explicit chevron icon action button with accessible label (`aria-label="Open order ORD-..."`).
  - Mobile: Stacked order card treatment (`divide-y divide-stroke-soft-200`), clear customer title + status badge header, 3-column financial metric grid (`Due`, `Total`, `Balance`), tap-target full card with active hover/focus state.
- **Order Detail Workspace**:
  - Financial Overview Card: 3-column scorecard (`Order total`, `Amount paid`, `Balance due`), with `Balance due` highlighted (`bg-bg-weak-50/70`) when outstanding balance remains.
  - Line Items Table: Responsive data grid, server-computed unit prices and line totals, clear item count badge.
  - Payment Ledger: Reverse chronological list of settlements; empty state with calm illustration/icon and guidance when zero payments exist.
  - Immutability Lock Banner: When payments exist, clear non-destructive warning informing the user that line items and customer details are locked.
- **Record Payment Dialog**:
  - Radix-powered accessible modal.
  - Live dynamic settlement preview card showing Current Balance, Payment Applied, and Projected Remaining Balance with real-time status pill (`Settled in full`, `Partially paid`, `Exceeds balance`).
  - "Use remaining balance" quick-fill button.
  - Structured error presentation with conflict refresh guidance.
- **Form Inputs & Controls**:
  - Consistent focus ring (`focus-visible:ring-2 focus-visible:ring-stroke-strong-950`).
  - Input field wrapper with error states (`ring-error-base`), helper hints, and prefix/suffix support.
- **Auth Shell Layout**:
  - Split-screen layout: Left form card on `bg-bg-white-0` with brand header, clean typography, secure badge footer; Right brand panel on `bg-primary-base` with subtle grid pattern, typography quote, and three feature pillars (`Integer-cents money`, `Idempotent writes`, `Auditable history`).
- **Empty & Error States**:
  - Zero Orders: First-use state with clear illustration/icon, descriptive copy, and primary "Create order" button.
  - Filtered Empty: Informative "No matching orders" state with "Clear filters" action.
  - Query Errors: Inline and panel-level error alerts with retry action button.

### R3. Interaction Polish & Micro-feedback
- **Hover & Active States**:
  - Table rows highlight with smooth transition (`transition-colors duration-150 hover:bg-bg-weak-50/60`).
  - Secondary/stroke buttons transition background and border cleanly.
  - Primary button subtle brightness shift (`hover:bg-primary-dark`).
  - Navigation links show smooth active pill indicator (`scale-y-100` transition).
- **Focus Rings**:
  - Keyboard navigation shows sharp, high-contrast focus rings (`focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:outline-none`).
  - Dialogs trap focus properly and restore focus to trigger upon dismissal.
- **Transitions & Feedback**:
  - Collapsible desktop sidebar transitions width and padding (`transition-all duration-300 ease-out`).
  - Mobile drawer slide-in animation with backdrop blur (`backdrop-blur-[10px] bg-overlay`).
  - Refresh button rotates icon during query fetching (`animate-spin`).
  - Loading states use smooth shimmer animation (`animate-shimmer`).
  - Toast feedback on mutation completion with clear outcome messaging.

### R4. Responsive Design Coherence across Viewports
- **320px – 639px (Mobile)**:
  - Global header with brand and hamburger trigger (`RiMenu3Line`).
  - Slide-out mobile drawer navigation with full user account profile and logout.
  - Summary KPI cards stacked in 1-column grid.
  - Orders table transforms into touch-optimized stacked cards with 3-column metric definitions (`<MobileMetric>`).
  - Order create/edit form mounts responsive stacked line-item cards (preventing dual-mount form field collision).
  - Dialogs render full width with safe margin padding.
  - Zero horizontal overflow.
- **640px – 1023px (Tablet / Small Desktop)**:
  - Summary KPI cards adapt to 2x2 grid (`sm:grid-cols-2`).
  - Order form line-items editor mounts full data table layout.
  - Financial summary scorecard displays 3 horizontal columns.
- **1024px – 1439px (Standard Desktop)**:
  - Fixed 272px sidebar (collapsible to 82px with ⌘B keyboard shortcut).
  - Full desktop data tables with column alignment.
  - Form layout constrained to `max-w-4xl` for optimal reading scan line.
- **1440px+ (Wide Screen / High Resolution)**:
  - Main container constrained to `max-w-[1440px]` centered in viewport to maintain tight information density.

---

## 4. Design Token Architecture & Styling Rules

### Align UI Semantic Tokens
```text
Backgrounds:
  bg-bg-white-0      -> #ffffff (card background, modal content, input surface)
  bg-bg-weak-50       -> #f8fafc / neutral-50 (page body background, sub-panel surface)
  bg-bg-soft-200      -> neutral-200 (dividers, hover states)
  bg-bg-sub-300       -> neutral-300 (muted badges)
  bg-bg-surface-800   -> neutral-800
  bg-bg-strong-950    -> neutral-950

Text:
  text-text-strong-950 -> Primary titles, body headings, active values
  text-text-sub-600    -> Secondary text, field descriptions, metadata
  text-text-soft-400   -> Placeholders, timestamps, category labels
  text-text-disabled-300 -> Disabled controls
  text-text-white-0    -> Static white text

Borders & Rings:
  ring-stroke-soft-200 / border-stroke-soft-200 -> Standard card/container borders
  ring-stroke-sub-300                             -> Active/hover borders
  ring-stroke-strong-950                          -> Focus-visible rings

Semantic States:
  Primary:     bg-primary-base, text-primary-base, bg-primary-lighter (alpha-10)
  Success:     text-success-base, bg-success-lighter, ring-success-light
  Warning:     text-warning-base, text-warning-dark, bg-warning-lighter
  Error:       text-error-base, bg-error-lighter, ring-error-light
  Information: text-information-base, bg-information-lighter, ring-information-light
```

### Forbidden Patterns & Strict Anti-Patterns
1. **NO Hardcoded Tailwind Colors**: Never use `text-blue-500`, `bg-gray-100`, `hover:bg-red-700`, `border-slate-200`, etc. All colors must resolve through Align UI CSS variables and semantic tokens.
2. **NO Behavioral Changes**: Do not change mutation payloads, API request schemas, React Query cache invalidation logic, or route navigation targets.
3. **NO External Libraries**: Do not add Chakra UI, MUI, AntD, Zustand, Redux, or chart libraries.
4. **NO Manual Tracking Overrides**: Do not add `tracking-wider` or `tracking-wide` on `text-subheading-xs` or `text-subheading-2xs` when the typography token already provides letter spacing.
5. **NO Commented-Out Dead Code**: Keep git diffs pristine, removing unused imports and dead code.

---

## 5. Features Discovered Catalog

## Features Discovered
| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Navigation & Shell | Responsive AppShell & Collapsible Sidebar | Main desktop navigation with collapsible 272px/82px sidebar (⌘B shortcut), mobile drawer, brand mark, and active page indicator. | Viewer session, pathname, keyboard event (⌘B) | Rendered sidebar / mobile header, active link state | Closes mobile drawer on navigation | `apps/web/components/layout/app-shell.tsx` |
| 2 | Navigation & Shell | User Account Dropdown | Bottom sidebar menu displaying user email initial avatar, email address, and logout action. | Authenticated Viewer session, logout mutation | Trigger button, dropdown menu, sign out action | Disables logout button during pending mutation | `apps/web/components/layout/user-button.tsx` |
| 3 | Navigation & Shell | PageHeader Primitive | Consistent page header with eyebrow, title, description, and contextual right-side action slot. | `eyebrow`, `title`, `description`, `action` ReactNode | Header layout with bottom border separator | Renders gracefully without eyebrow/action | `apps/web/components/layout/page-header.tsx` |
| 4 | Auth Screens | AuthShell Split Screen | Two-column auth container with brand header, centered form card, and right-hand brand value proposition panel. | `eyebrow`, `title`, `description`, `children` | Responsive auth page layout (1-col mobile, 2-col lg) | Fallback to 1-col layout on small viewports | `apps/web/components/auth/auth-shell.tsx` |
| 5 | Auth Screens | LoginForm & SignupForm | React Hook Form driven auth forms with Zod validation, inline field errors, and loading state buttons. | Email, password, name inputs | Login/signup API submission, session query seeding | Inline field errors + server error alert banner | `apps/web/components/auth/login-form.tsx`, `signup-form.tsx` |
| 6 | Dashboard | Account Financial Summary Cards | 4 KPI cards: Total orders, Outstanding amount, Collected amount, Overdue amount with danger highlight. | Account summary query data (`useOrderSummary`) | 4-card grid on desktop, 2x2 on tablet, stacked on mobile | Warning alert if summary query fails | `apps/web/components/orders/orders-dashboard.tsx` |
| 7 | Dashboard | SampleDataCTA Card | Interactive callout offering quick sample data seeding/guidance for reviewer evaluation. | `hasOrders` boolean | Dismissible / collapsible sample data callout | Renders subtle state when orders already exist | `apps/web/components/orders/sample-data-cta.tsx` |
| 8 | Dashboard | OrdersToolbar & Search/Filter | Toolbar with segmented status filter (All, Pending, Partially paid, Paid, Overdue), debounced search input, and sort dropdown. | `query` parameters, user input | Updated URL search parameters via `replaceQuery` | Recovers invalid URL parameters to defaults | `apps/web/components/orders/orders-toolbar.tsx` |
| 9 | Dashboard | Orders Desktop Table | High-density operational table with columns: Order, Status, Due date, Total, Paid, Balance, Action link. | Array of `OrderListItem` | Rendered table rows with hover and right-aligned currency | Falls back to empty state or loading state | `apps/web/components/orders/orders-dashboard.tsx` |
| 10 | Dashboard | Orders Mobile Stacked Cards | Touch-friendly card view for viewports < 768px with customer title, display ID, status badge, and 3 metrics. | Array of `OrderListItem` | Stacked list of interactive links | Preserves full navigation to order detail | `apps/web/components/orders/orders-dashboard.tsx` |
| 11 | Dashboard | OrdersPagination Controls | Server-backed pagination controls with total count, page size selector (10, 25, 50), prev/next, and page numbers. | Pagination `meta` (`total`, `page`, `pageSize`, `totalPages`) | Interactive page buttons with active state | Auto-corrects out-of-bounds page requests | `apps/web/components/orders/orders-pagination.tsx` |
| 12 | Order Detail | Order Detail Header & Action Bar | Order identity (Display ID, customer, due date, status badge) with contextual Record Payment, Edit, and Delete buttons. | `OrderDetail` query data | Action buttons enabled/disabled based on settlement state | Tooltips explaining why Edit/Delete disabled | `apps/web/components/orders/order-detail-workspace.tsx`, `order-action-bar.tsx` |
| 13 | Order Detail | Financial Summary Scorecard | 3-column scorecard showing Total Amount, Amount Paid, and Balance Due (with active emphasis). | `OrderDetail` financial totals | Scorecard grid with integer cents formatted to USD | Consistent currency display | `apps/web/components/orders/order-detail-workspace.tsx` |
| 14 | Order Detail | Line Items Table | Table showing line item descriptions, quantities, unit prices, and computed line totals. | `OrderDetail.items` array | Rendered table rows with currency formatting | Handles single or multi-item orders | `apps/web/components/orders/order-detail-workspace.tsx` |
| 15 | Order Detail | Payment History Ledger | Reverse chronological list of settled payments with amount, payment date, timestamp, and optional note. | `OrderDetail.payments` array | List of payment entries or calm empty state | Shows "No payments recorded" empty state | `apps/web/components/orders/order-detail-workspace.tsx` |
| 16 | Order Detail | Immutability OrderLockBanner | Informational banner shown when an order has committed payments, explaining that items are locked. | `paymentCount` integer | Warning banner with lock icon | Only mounts when payments > 0 | `apps/web/components/orders/order-lock-banner.tsx` |
| 17 | Settlement | Record Payment Dialog | Modal dialog to record a partial or full settlement, with real-time balance projection and idempotency key. | User input: amount, payment date, note | Atomic payment mutation submission | Rejects overpayment; handles 409/422 balance changes | `apps/web/components/orders/payment-dialog.tsx` |
| 18 | Order Management | Create Order Workspace (`/orders/new`) | Full-page order authoring workspace with customer info, due date, dynamic line-item array, and grand total preview. | Customer name, due date, line item field array | `useCreateOrder` mutation -> redirects to `/orders/[id]` | Real-time form validation; server error alert | `apps/web/components/orders/create-order-workspace.tsx`, `order-form.tsx` |
| 19 | Order Management | Edit Order Workspace (`/orders/[id]/edit`) | Full-page order edit workspace with prefilled data and immutability guard. | Pre-existing `OrderDetail`, modified fields | `useReplaceOrder` mutation -> redirects to `/orders/[id]` | Locked guard prevents editing paid orders | `apps/web/components/orders/edit-order-workspace.tsx`, `order-edit-guard.tsx` |
| 20 | Order Management | Delete Order Dialog | Confirmation dialog to permanently delete an unpaid order. | `OrderDetail` target | `useDeleteOrder` mutation -> navigates to `/orders` | Explains that only unpaid orders can be deleted | `apps/web/components/orders/order-delete-dialog.tsx` |
| 21 | UI Primitives | StatusBadge Component | Semantic badge primitive with colored dot and text label for `pending`, `partially_paid`, `paid`, `overdue`. | `OrderStatus` union | Rendered badge with text label and color dot | Maps all 4 statuses with accessible text | `apps/web/components/orders/status-badge.tsx` |
| 22 | UI Primitives | Loading State Components | Shimmer skeleton, full-page loading state, table loading state, and inline spinner. | `message`, `subMessage`, `size` | Loading visual with spinner and shimmer | Accessible with `role="status"` and `aria-live` | `apps/web/components/ui/loading-state.tsx`, `skeleton.tsx` |

---

## 6. Edge Cases & Boundary Behaviors

## Edge Cases
| # | Feature | Input / Condition | Observed & Required Behavior |
|---|---|---|---|
| 1 | Responsive Viewport | Viewport width = 320px (iPhone SE minimum) | Shell renders mobile header with drawer navigation; orders dashboard displays stacked cards; forms stack line-item inputs; no horizontal scrollbar on body; zero text clipping. |
| 2 | Responsive Viewport | Viewport width = 768px (Tablet portrait) | Sidebar remains hidden; 2-column KPI cards; order table renders full columns or clean hybrid; forms switch to table-based line items. |
| 3 | Responsive Viewport | Viewport width = 1440px+ (Ultra-wide desktop) | Content max-width constrained to `1440px` centered; sidebar fixed at 272px (or 82px collapsed); balanced white space without stretching. |
| 4 | Dashboard Data | Account has 0 orders (First use) | Dashboard renders `SampleDataCTA` and first-use empty state with `RiSearchLine` icon, friendly prompt, and primary "Create order" button. |
| 5 | Dashboard Filter | Applied search or status filter yields 0 results | Dashboard renders filtered empty state with "No matching orders" and "Clear filters" button resetting query to default. |
| 6 | Dashboard Pagination | URL requests `page=99` when `totalPages=3` | Client detects out-of-bounds page and auto-replaces URL parameter to `page=3` without error screen. |
| 7 | Payment Dialog | User enters amount > current `balanceDueCents` | Immediate client-side validation triggers with message: "The current maximum is $X.XX"; submit button blocked. |
| 8 | Payment Dialog | Server returns `422 PAYMENT_EXCEEDS_BALANCE` (concurrent payment recorded) | Dialog displays refreshed balance message, updates form error with new maximum, and refetches order data. |
| 9 | Payment Dialog | User clicks "Use remaining balance" | Form amount input instantly fills with formatted exact balance due cents converted to decimal string. |
| 10 | Order Form Line Items | User has 1 line item and attempts to delete | "Remove" button is disabled; order form enforces at least 1 valid line item before submission. |
| 11 | Order Form Line Items | User enters 0 or negative quantity / invalid price | Zod resolver catches error: "Quantity must be at least 1", "Use a valid unit price with up to 2 decimals"; inline field errors appear. |
| 12 | Order Form Resizing | User resizes viewport while typing line items | `useDesktopLineItemsLayout` cleanly unmounts one responsive layout and mounts the other without duplicating React Hook Form fields. |
| 13 | Order Detail Immutability | User attempts to edit order with 1+ payments | `/orders/[id]/edit` displays `OrderEditGuard` locking the form and offering "Back to order details" link. |
| 14 | Status Calculation | Due date is today (`dueDate === todayUtc`) | Status derives as `pending` (or `partially_paid`), NOT `overdue` (domain rule: due today is not overdue). |
| 15 | Status Precedence | Order is fully paid but `dueDate < todayUtc` | Status derives as `paid`, NOT `overdue` (domain rule: `paid` takes precedence over `overdue`). |
| 16 | Network Error | API query failure on `/orders` | Dashboard displays warning alert with previous cached data if available, or recoverable error card with "Try again" button. |

---

## 7. Testing, Verification, & Quality Gate Criteria

### Automated Verification Commands
```bash
# 1. Typecheck: Verify zero TypeScript errors across all workspace packages
pnpm typecheck

# 2. Lint: Verify zero ESLint errors and zero warnings
pnpm lint

# 3. Build: Verify Next.js and API clean production builds
pnpm build

# 4. Web Unit & Component Tests: Verify all 127 tests pass
pnpm --filter @crossval/web test
```

### Agent-as-Judge Verification Rubric
Before concluding the UI/UX polish milestone, an independent reviewer agent must verify:
- [x] **Zero Hardcoded Colors**: No instances of `text-blue-500`, `hover:bg-red-700`, `bg-gray-100`, etc.
- [x] **Defined `bg-primary-lighter`**: `tailwind.config.ts` defines `primary.lighter` resolving properly to `hsl(var(--primary-alpha-10))`.
- [x] **Typography Standardized**: All `subheading-xs` usages have no manual tracking classes and use standard font weight.
- [x] **Table Header Consistency**: Line items table in `order-form.tsx` matches view-mode table typography.
- [x] **Consistent Spacing**: Spacing after back links standardized to `mt-5` / `mt-6` across create, edit, and detail views.
- [x] **Responsive Parity**: 320px, 768px, and 1440px viewports render cleanly without horizontal overflow.
- [x] **Interactive Feedback**: Every button, link, and table row provides visible hover and focus-visible states.
