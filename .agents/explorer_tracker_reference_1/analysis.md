# Reference Visual & UX Analysis: crossval-tracker vs. crossval

## Executive Summary

This document provides a deep, comprehensive design and visual polish audit of the sibling reference dashboard at `/Users/aryandahiya/Desktop/Programming/crossval-tracker` compared against `/Users/aryandahiya/Desktop/Programming/crossval`.

`crossval-tracker` represents a premier example of a clean, restrained, high-density B2B fintech SaaS application built with the Align UI design token system. It achieves its visual quality through:
1. **Mathematical visual rhythm & spacing** (strict 4px/8px/12px/16px/20px/24px scale with unified section headers and card paddings).
2. **Semantic color hierarchy with tinted accent containers** (KPI icon badges with soft pastel backgrounds, inset rings, and vibrant glyphs rather than dull gray circles).
3. **Structured data density with high contrast tabular typography** (consistent `tabular-nums font-semibold` numbers and `font-mono text-paragraph-xs` identifiers).
4. **Cohesive micro-interactions** (elevated card hover shadows `hover:shadow-regular-sm`, table row tinting `group-hover/row:bg-bg-weak-50/50`, dual-ring focus outlines `shadow-button-primary-focus`).
5. **Polished modal and sheet wrappers** (tinted backdrop overlays `bg-overlay backdrop-blur-[10px]`, shaded footer action bars `bg-bg-weak-50/50 rounded-b-20`, and explicit icon header badges).

Below are the exhaustive findings across tokens, layouts, components, micro-interactions, and direct gap analysis with concrete code transformation recipes for `crossval`.

---

## 1. Design Tokens, Typography, & System Foundations

### 1.1 Color Palette & Token Architecture

In `crossval-tracker`, colors are organized cleanly with HSL CSS variables and Tailwind extensions:

```ts
// crossval-tracker/apps/web/tailwind.config.ts
colors: {
  bg: {
    strong: hsl('--bg-strong'),
    'strong-950': hsl('--bg-strong'),
    surface: hsl('--bg-surface'),
    'surface-800': hsl('--bg-surface'),
    sub: hsl('--bg-sub'),
    'sub-300': hsl('--bg-sub'),
    soft: hsl('--bg-soft'),
    'soft-200': hsl('--bg-soft'),
    weak: hsl('--bg-weak'),
    'weak-50': hsl('--bg-weak'),
    white: hsl('--bg-white'),
    'white-0': hsl('--bg-white'),
  },
  text: {
    strong: hsl('--text-strong'),
    'strong-950': hsl('--text-strong'),
    sub: hsl('--text-sub'),
    'sub-600': hsl('--text-sub'),
    soft: hsl('--text-soft'),
    'soft-400': hsl('--text-soft'),
    disabled: hsl('--text-disabled'),
    'disabled-300': hsl('--text-disabled'),
    white: hsl('--text-white'),
    'white-0': hsl('--text-white'),
  },
  stroke: {
    strong: hsl('--stroke-strong'),
    'strong-950': hsl('--stroke-strong'),
    sub: hsl('--stroke-sub'),
    'sub-300': hsl('--stroke-sub'),
    soft: hsl('--stroke-soft'),
    'soft-200': hsl('--stroke-soft'),
  },
  primary: {
    darker: hsl('--primary-darker'),
    base: hsl('--primary-base'),
    alpha: hsl('--primary-alpha'),
    lighter: hsl('--primary-lighter'), // 222 100% 96%
  },
  success: {
    dark: hsl('--success-dark'),
    base: hsl('--success-base'),
    lighter: hsl('--success-lighter'),
  },
  warning: {
    dark: hsl('--warning-dark'),
    base: hsl('--warning-base'),
    lighter: hsl('--warning-lighter'),
  },
  error: {
    dark: hsl('--error-dark'),
    base: hsl('--error-base'),
    lighter: hsl('--error-lighter'),
  },
  information: {
    dark: hsl('--information-dark'),
    base: hsl('--information-base'),
    lighter: hsl('--information-lighter'),
  },
  overlay: hsl('--overlay'),
}
```

#### Token Gap in `crossval`:
- In `crossval`, `bg-primary-lighter` is used in `user-button.tsx` (line 75) and `loading-state.tsx` (lines 51, 69) but is **missing from `tailwind.config.ts`**, resulting in an unrendered transparent background.
- `apps/web/tailwind.config.ts` must map `primary.lighter` to `hsl(var(--blue-50))` or `hsl(var(--primary-alpha-10))` (or declare `lighter: 'hsl(var(--blue-50))'` under `primary`).
- In `apps/web/components/orders/status-badge.tsx`, hardcoded `text-blue-500` is used for `partially_paid` instead of `text-information-base`.
- In `apps/web/components/ui/button.tsx`, hardcoded `hover:bg-red-700` and `bg-red-alpha-10` are used instead of `hover:bg-error-dark` and `bg-error-lighter`.

---

### 1.2 Typography Hierarchy & Letter Spacing

The Align UI typography scale in `crossval-tracker` and `crossval` is standardized as follows:

| Token | Font Size | Line Height | Letter Spacing | Default Weight | Role / Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `title-h1` | 3.5rem (56px) | 4.0rem (64px) | -0.01em | 500 (Medium) | Display / Hero headers |
| `title-h2` | 3.0rem (48px) | 3.5rem (56px) | -0.01em | 500 (Medium) | Major landing titles |
| `title-h3` | 2.5rem (40px) | 3.0rem (48px) | -0.01em | 500 (Medium) | Top-level KPI cards |
| `title-h4` | 2.0rem (32px) | 2.5rem (40px) | -0.005em | 500 (Medium) | Major modal / auth headers |
| `title-h5` | 1.5rem (24px) | 2.0rem (32px) | 0.0em | 500 (Medium) | Primary page headers (`PageHeader`) |
| `title-h6` | 1.25rem (20px)| 1.75rem (28px)| 0.0em | 500 (Medium) | Section cards / sub-headers |
| `label-xl` | 1.5rem (24px) | 2.0rem (32px) | -0.015em | 500 (Medium) | Large highlighted labels |
| `label-lg` | 1.125rem (18px)| 1.5rem (24px) | -0.015em | 500 (Medium) | Prominent form labels |
| `label-md` | 1.0rem (16px) | 1.5rem (24px) | -0.011em | 500 (Medium) | Card titles, Dialog titles |
| `label-sm` | 0.875rem (14px)| 1.25rem (20px)| -0.006em | 500 (Medium) | Form field labels, button text |
| `label-xs` | 0.75rem (12px) | 1.0rem (16px) | 0.0em | 500 (Medium) | Badges, status pills, small tags |
| `paragraph-lg` | 1.125rem (18px)| 1.5rem (24px) | -0.015em| 400 (Regular)| Lead paragraphs |
| `paragraph-md` | 1.0rem (16px) | 1.5rem (24px) | -0.011em| 400 (Regular)| Standard body prose |
| `paragraph-sm` | 0.875rem (14px)| 1.25rem (20px)| -0.006em| 400 (Regular)| Table text, descriptions |
| `paragraph-xs` | 0.75rem (12px) | 1.0rem (16px) | 0.0em | 400 (Regular)| Hints, captions, table metadata |
| `subheading-md`| 1.0rem (16px) | 1.5rem (24px) | 0.06em | 500 (Medium) | Uppercase section label |
| `subheading-sm`| 0.875rem (14px)| 1.25rem (20px)| 0.06em | 500 (Medium) | Uppercase group label |
| `subheading-xs`| 0.75rem (12px) | 1.0rem (16px) | 0.04em | 500 (Medium) | Eyebrow, sidebar section label |
| `subheading-2xs`|0.6875rem(11px)| 0.75rem (12px)| 0.02em | 500 (Medium) | Micro labels, table column headers |

#### Standardizing `subheading-xs` Across `crossval`:
Because `subheading-xs` has `letterSpacing: '0.04em'` and `fontWeight: '500'` built into the config, remove manual tracking and weight overrides:
- Change `text-subheading-xs uppercase font-medium tracking-wider` -> `text-subheading-xs uppercase text-text-soft-400 font-medium`
- Change `text-subheading-xs font-semibold uppercase tracking-wider` -> `text-subheading-xs uppercase text-text-soft-400 font-medium`
- Change `text-subheading-xs uppercase font-medium tracking-wide` -> `text-subheading-xs uppercase text-text-soft-400 font-medium`

---

### 1.3 Shadows and Elevation Scale

`crossval-tracker` utilizes a multi-layer shadow system that creates clean elevation without muddy darkness:

```ts
shadows: {
  'regular-xs': '0 1px 2px 0 #0a0d1408', // Subtle border enhancement for cards and inputs
  'regular-sm': '0 2px 4px #1b1c1d0a',  // Hover state for interactive cards
  'regular-md': '0 16px 32px -12px #0e121b1a', // Floating dialogs and popovers
  'button-primary-focus': '0 0 0 2px hsl(var(--bg-white)), 0 0 0 4px hsl(var(--primary-alpha))',
  'button-important-focus': '0 0 0 2px hsl(var(--bg-white)), 0 0 0 4px hsl(var(--text-strong) / 16%)',
  'button-error-focus': '0 0 0 2px hsl(var(--bg-white)), 0 0 0 4px hsl(var(--error-base) / 16%)',
}
```

---

## 2. Layout Structure & Shell Architecture

### 2.1 Sidebar & Navigation Bar

In `crossval-tracker/apps/web/src/components/layout/app-shell.tsx`:
1. **Collapsible Sidebar**:
   - Expanded width: `w-[272px]`, Collapsed width: `w-[82px]`.
   - Content area padding transitions smoothly: `collapsed ? 'lg:pl-[82px]' : 'lg:pl-[272px]'` with `transition-[padding] duration-300 ease-out`.
   - Toggle button: `CompactButton.Root` floating at `top-[18px]` with `RiArrowLeftSLine` rotating 180 degrees. Includes `⌘B` keyboard shortcut with Tooltip.
2. **Active Navigation Indicator**:
   - Indicator is an absolute vertical accent pill on the left:
     ```tsx
     <span
       className={cn(
         'absolute -left-5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-base transition-transform duration-200',
         active ? 'scale-y-100' : 'scale-y-0',
       )}
       aria-hidden="true"
     />
     ```
   - Active link styling: `bg-bg-weak-50 text-text-strong-950 font-medium` with a subtle trailing `RiArrowRightSLine` when expanded.
3. **Workspace Header in Sidebar**:
   - Section heading: `p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium"`.
4. **User Button in Sidebar**:
   - Avatar pill: `grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-sm font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20`.
   - Outer container in expanded mode: `ring-1 ring-inset ring-stroke-soft-200 shadow-regular-xs hover:shadow-none bg-bg-white-0`.

### 2.2 Mobile Navigation Drawer

- Sticky top mobile header: `h-[60px] border-b border-stroke-soft-200 bg-bg-white-0/95 backdrop-blur px-4 lg:hidden`.
- Trigger: `CompactButton.Root variant="stroke" size="large"` with `RiMenu3Line`.
- Drawer Content: slide-in drawer sheet with backdrop blur overlay `bg-overlay backdrop-blur-[10px]`, proper `Dialog.Title`, `Dialog.Description` sr-only, and identical nav links and user button at the bottom.

### 2.3 Page Spacing & Back-Link Rhythm

In `crossval`:
- **Current problem**:
  - `/orders/new` and `/orders/[orderId]/edit` put `<Link>All orders</Link>` then `<div className="mt-4 mb-6"><PageHeader .../></div>`.
  - `/orders/[orderId]` put `<Link>All orders</Link>` then `<header className="mt-5 ... pb-6 ...">`.
- **Target standard**:
  - Top Back Link:
    ```tsx
    <Link
      href="/orders"
      className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
    >
      <RiArrowLeftLine className="size-4" />
      All orders
    </Link>
    ```
  - Standard container spacing after back link: `mt-4 mb-6` wrapping the header, followed immediately by the workspace card sections with uniform `space-y-6`.

---

## 3. Component Deep Dive: Tracker vs CrossVal

### 3.1 KPI Summary Cards

#### `crossval-tracker` Implementation:
In `crossval-tracker/apps/web/src/components/dashboard/kpi-cards.tsx`:
- Wrapped in `WidgetBox.Root`: `rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 transition-shadow duration-200 hover:shadow-regular-sm space-y-3`.
- Top row: `flex items-center justify-between` with label `text-subheading-xs uppercase font-medium text-text-soft-400` and an icon badge.
- **Icon Badge**: `grid size-9 place-items-center rounded-xl ring-1 ring-inset`:
  - Blue / Primary: `bg-primary-lighter text-primary-base ring-primary-base/20`
  - Amber / Warning: `bg-warning-lighter text-warning-dark ring-warning-base/20`
  - Emerald / Success: `bg-success-lighter text-success-dark ring-success-base/20`
  - Rose / Error: `bg-error-lighter text-error-dark ring-error-base/20`
- Value: `text-title-h4 font-semibold tabular-nums text-text-strong-950 tracking-tight sm:text-title-h3`.
- Hint / Subtext: `text-paragraph-xs text-text-sub-600`.

#### `crossval` Current State vs Recommended Polish:
Currently in `orders-dashboard.tsx`:
- Icons are plain gray circles `flex size-10 items-center justify-center rounded-full bg-bg-weak-50 text-text-sub-600`.
- Card has no hover shadow elevation `hover:shadow-regular-sm`.
- Recommendation: Adopt `crossval-tracker`'s tinted `rounded-xl` icon container pattern with semantic background and border tints for:
  - **Total Orders**: `bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20`
  - **Outstanding**: `bg-warning-lighter text-warning-dark ring-1 ring-inset ring-warning-base/20`
  - **Collected**: `bg-success-lighter text-success-dark ring-1 ring-inset ring-success-base/20`
  - **Overdue**: `bg-error-lighter text-error-dark ring-1 ring-inset ring-error-base/20`

---

### 3.2 Data Tables & Row Treatments

#### Desktop Table Standards (harmonizing view vs edit mode):
1. **Table Container**:
   `overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200`
2. **Table Header (`TableHead` / `thead`)**:
   `bg-bg-weak-50 px-3.5 py-3 text-left text-paragraph-sm text-text-sub-600 font-semibold whitespace-nowrap`
   *(This resolves Known Issue #4 where `order-form.tsx` had `th` with `text-subheading-2xs uppercase text-text-soft-400 font-medium` while `TableHead` had `text-paragraph-sm text-text-sub-600`)*.
3. **Table Body Rows (`TableRow`)**:
   `border-b border-stroke-soft-200/70 transition-colors duration-150 ease-out group-hover/row:bg-bg-weak-50/50`
4. **Table Cells (`TableCell`)**:
   `px-3.5 py-3 text-paragraph-sm text-text-strong-950`
   - Numeric values: `text-right font-semibold tabular-nums text-text-strong-950`
   - Sub-metadata: `font-mono text-paragraph-xs text-text-soft-400`
5. **Table Footer Summary Bar** (when records exist):
   ```tsx
   <div className="flex items-center justify-between border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-3">
     <span className="text-paragraph-xs text-text-sub-600">
       Showing <strong className="font-semibold text-text-strong-950">{count}</strong> orders
     </span>
     <div className="flex items-center gap-2 text-paragraph-sm">
       <span className="text-text-sub-600">Total balance:</span>
       <span className="font-bold tabular-nums text-text-strong-950">{formatUsd(totalBalance)}</span>
     </div>
   </div>
   ```

#### Mobile Stacked Row Treatment:
On screens `< 768px`:
- Stacking with clean dividers `divide-y divide-stroke-soft-200`.
- Each row is a block card link with `p-4 hover:bg-bg-weak-50/50 transition-colors`.
- Customer name in `text-label-sm font-semibold text-text-strong-950`, display ID in `font-mono text-paragraph-xs text-text-soft-400`, status badge top-right.
- 3-column metric grid (`dl`):
  - Column 1: `Due` date
  - Column 2: `Total` amount
  - Column 3: `Balance` amount (highlighted in `text-label-xs font-semibold tabular-nums text-text-strong-950`)

---

### 3.3 Modals & Dialogs

In `crossval-tracker/apps/web/src/components/ui/modal.tsx`:
- **Overlay**: `fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-overlay p-4 backdrop-blur-[10px]`
- **Content**: `relative w-full max-w-[440px] sm:max-w-[480px] rounded-20 bg-bg-white-0 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95`
- **Header**:
  ```tsx
  <div className="relative flex items-start gap-3.5 border-b border-stroke-soft-200 p-5 pr-12">
    {icon && (
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-bg-white-0 ring-1 ring-inset ring-stroke-soft-200 shadow-regular-xs">
        <Icon className="size-5 text-text-sub-600" />
      </div>
    )}
    <div className="flex-1 space-y-1">
      <ModalTitle className="text-label-md font-semibold text-text-strong-950">{title}</ModalTitle>
      <ModalDescription className="text-paragraph-xs text-text-sub-600">{description}</ModalDescription>
    </div>
  </div>
  ```
- **Body**: `p-5 space-y-4`
- **Footer**: `flex items-center justify-end gap-3 border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-4 rounded-b-20`

---

### 3.4 Status Badges

In `crossval-tracker/apps/web/src/components/ui/status-badge.tsx`:
- Badge Root: `inline-flex h-6 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-label-xs font-medium`
- Stroke variant: `bg-bg-white-0 text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200`
- Light variant with semantic compounds:
  - `favorable` / `completed` (`paid`): `bg-success-lighter text-success-dark` with `text-success-base` dot/icon
  - `unfavorable` / `failed` (`overdue`): `bg-error-lighter text-error-dark` with `text-error-base` dot/icon
  - `pending` (`pending`): `bg-warning-lighter text-warning-dark` with `text-warning-base` dot/icon
  - `open` / `information` (`partially_paid`): `bg-information-lighter text-information-dark` with `text-information-base` dot/icon
- In `crossval/components/orders/status-badge.tsx`:
  - Replace `dotColorClass = "text-blue-500"` with `dotColorClass = "text-information-base"` (and support `variant="light"` or `variant="stroke"`).

---

### 3.5 Forms, Inputs, & Fields

- **Field Container**: `flex flex-col gap-1.5`
- **Label**: `text-label-sm text-text-strong-950 font-medium` with optional badge `text-paragraph-xs text-text-soft-400` on right.
- **Input Primitive**:
  - Default: `h-10 rounded-10 bg-bg-white-0 text-paragraph-sm text-text-strong-950 shadow-regular-xs before:ring-1 before:ring-inset before:ring-stroke-soft-200`
  - Hover: `hover:before:ring-stroke-sub-300`
  - Focus: `has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong-950`
  - Error: `before:ring-error-base has-[input:focus]:shadow-button-error-focus has-[input:focus]:before:ring-error-base`
- **Error Hint Text**: `text-paragraph-xs text-error-base font-medium mt-1`

---

### 3.6 Sample Data CTA Card

In `crossval-tracker/apps/web/src/components/dashboard/sample-data-cta.tsx`:
- Container: `relative overflow-hidden rounded-2xl p-5 sm:p-6 border-dashed border-2 border-primary-base/30 bg-primary-lighter/10`
- Icon container: `grid size-12 shrink-0 place-items-center rounded-xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20`
- Title: `text-title-h6 font-semibold text-text-strong-950`
- Description: `text-paragraph-sm text-text-sub-600 max-w-xl`
- Action Button: `Button.Root size="medium" variant="primary"` with `RiDatabase2Line`

---

## 4. Micro-Interactions & State Transitions

1. **Card Elevation on Hover**:
   - Adding `transition-shadow duration-200 hover:shadow-regular-sm` to KPI summary cards and list containers.
2. **Table Row Hover**:
   - `transition duration-150 ease-out group-hover/row:bg-bg-weak-50/50`.
3. **Button Focus Rings**:
   - Focus ring standard: `focus-visible:outline-none focus-visible:shadow-button-primary-focus` (for primary buttons), `focus-visible:shadow-button-important-focus` (for neutral buttons), `focus-visible:shadow-button-error-focus` (for destructive buttons).
4. **Action Icon Transitions**:
   - Action buttons (like edit/delete compact buttons in rows): `text-text-sub-600 hover:text-text-strong-950 transition-colors duration-150`.
5. **Loading Skeletons**:
   - Standardized skeleton pulse with `bg-bg-soft-200` and shimmer animation matching layout geometry.

---

## 5. Comprehensive Gap Catalog & Fix Matrix

| Area | Observed Gap in `crossval` | crossval-tracker Pattern | Concrete Fix for `crossval` |
| :--- | :--- | :--- | :--- |
| **Tokens / Config** | `bg-primary-lighter` undefined in `tailwind.config.ts` | Defined as `hsl(--primary-lighter)` (`222 100% 96%`) | Add `primary.lighter: 'hsl(var(--blue-50))'` or map `--primary-lighter` in config |
| **Color Tokens** | `text-blue-500` in `status-badge.tsx:16` | Uses `text-information-base` semantic token | Replace `text-blue-500` with `text-information-base` |
| **Color Tokens** | `hover:bg-red-700`, `bg-red-alpha-10` in `button.tsx` | Uses `hover:bg-error-dark`, `bg-error-lighter` | Replace raw red classes with `error-*` tokens |
| **Typography** | Inconsistent manual `tracking-wider` / `tracking-wide` on `subheading-xs` | Config default letter-spacing (0.04em) & weight (500) | Remove manual `tracking-*` and `font-*` overrides on `subheading-xs` |
| **Typography** | Line items table header uses `th` with `text-subheading-2xs` in `order-form.tsx:243` | All table heads use `TableHead` with `text-paragraph-sm font-semibold text-text-sub-600` | Harmonize `order-form.tsx` table header to use `TableHead` / `text-paragraph-sm` |
| **Layout / Rhythm** | Mixed spacing after back link (`mt-4 mb-6` vs `mt-5 pb-6`) | Uniform `mt-4 mb-6` header margin across all pages | Standardize back-link spacing and header wrappers to `mt-4 mb-6` |
| **Summary Cards** | Plain grey circle icons `size-10 rounded-full bg-bg-weak-50` | Semantic tinted `rounded-xl` icon containers with inset rings | Update KPI cards to use tinted `rounded-xl` icon badges with `ring-1 ring-inset` |
| **Modals** | Plain modal header and simple footer | Header with icon badge `shadow-regular-xs` and tinted footer `bg-bg-weak-50/50 rounded-b-20` | Add subtle footer shading and icon badge support to `Modal` |
| **Data Tables** | No table footer count / balance summary | Summary bar at table bottom showing count and total | Add summary footer bar to orders table |
| **Buttons / Rings** | `compact-button.tsx` inverts background to black on focus | Uses standard `focus-visible:shadow-button-important-focus` | Standardize focus rings on `compact-button.tsx` |

---

## 6. Verification Checklist for Implementation

- [ ] Zero undefined Tailwind classes (`bg-primary-lighter` resolved).
- [ ] Zero hardcoded colors (`text-blue-500`, `hover:bg-red-700`, `bg-red-alpha-10` replaced with Align UI semantic tokens).
- [ ] Typography scale follows single source of truth from config (no manual tracking overrides on `subheading-xs`).
- [ ] Table headers in `order-form.tsx` match `TableHead` style in view mode tables.
- [ ] Spacing after back links is uniform (`mt-4 mb-6`).
- [ ] KPI cards feature semantic tinted icon badges and hover shadow transitions.
- [ ] Data tables, modals, inputs, and buttons match the visual polish bar of `crossval-tracker`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm build`, and all 127 tests in `pnpm --filter @crossval/web test` pass with zero errors.
