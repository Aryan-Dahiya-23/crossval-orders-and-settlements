# Handoff Report: UI/UX Codebase & Bug Audit Survey

**Agent**: Explorer 2  
**Target Directory**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web`  
**Date**: 2026-08-15T18:33:00Z  
**Type**: Hard Handoff (Complete)

---

## 1. Observation

A full audit of `apps/web` (including `tailwind.config.ts`, `globals.css`, 19 UI primitives in `components/ui/`, layout components, auth screens, order CRUD workflows, and application routes) revealed the following verbatim facts, line numbers, and styling patterns.

### 1.1 The 6 Identified Audit Bugs

#### Bug 1: `bg-primary-lighter` Token Status
- **`tailwind.config.ts:346`**: Defines `lighter: 'hsl(var(--primary-alpha-10))'` under `colors.primary`.
- **`apps/web/app/globals.css:119`**: Defines `--primary-alpha-10: var(--neutral-alpha-10);` where `--neutral-alpha-10` is `220 11.48% 64.12% / 10%`.
- **`components/layout/user-button.tsx:75`**:
  ```tsx
  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
  ```
- **`components/ui/loading-state.tsx:51`**:
  ```tsx
  <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
  ```
- **`components/ui/loading-state.tsx:69`**:
  ```tsx
  <div className="flex size-10 items-center justify-center rounded-xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
  ```
- *Observation*: In Align UI design token conventions, alpha tokens are named `alpha-10`, `alpha-16`, and `alpha-24` (e.g. `bg-primary-alpha-10` is used in `sample-data-cta.tsx:44`). `lighter` on primary is an alias. Standardizing on `bg-primary-alpha-10` ensures token purity across the component tree.

---

#### Bug 2: Hardcoded `text-blue-500` vs `text-information-base` in `status-badge.tsx`
- **`components/orders/status-badge.tsx:14-17`**:
  ```tsx
  case "partially_paid":
    statusVariant = "pending";
    dotColorClass = "text-information-base";
    break;
  ```
- **`components/ui/status-badge.tsx:35-52`**:
  `statusBadgeVariants` only supports `status: 'completed' | 'pending' | 'failed' | 'disabled'`. It lacks an `information` status variant (e.g. `information: { icon: 'text-information-base', dot: 'text-information-base' }`).
- *Observation*: Because `ui/status-badge.tsx` lacks `status="information"`, `orders/status-badge.tsx` passes `statusVariant = "pending"` (which defaults the dot to `text-warning-base`) and overrides it manually via `className={dotColorClass}`.

---

#### Bug 3: Typography & Tracking Discrepancies Across `subheading-xs`
- **`tailwind.config.ts:150-157`**:
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
  `subheading-xs` already defines `letterSpacing: '0.04em'` and `fontWeight: '500'`.
- **`components/orders/order-detail-workspace.tsx:63`**:
  ```tsx
  <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
  ```
  *Discrepancy*: Adds conflicting `font-semibold` (600) and redundant `tracking-wider` (0.05em), overriding the token definition.
- **`components/orders/order-edit-guard.tsx:21`**:
  ```tsx
  <p className="mt-5 font-mono text-paragraph-xs font-semibold uppercase tracking-wider text-text-soft-400">
  ```
  *Discrepancy*: Uses `text-paragraph-xs` with `font-semibold uppercase tracking-wider` instead of the standard `text-subheading-xs`.
- **Canonical Usages**:
  - `components/auth/auth-shell.tsx:22`: `text-subheading-xs uppercase font-medium text-text-soft-400`
  - `components/layout/app-shell.tsx:114, 181`: `text-subheading-xs uppercase text-text-soft-400 font-medium`
  - `components/layout/page-header.tsx:18`: `text-subheading-xs uppercase font-medium text-text-soft-400`
  - `components/orders/edit-order-workspace.tsx:57`: `text-subheading-xs uppercase font-medium text-text-soft-400`
  - `components/orders/order-detail-workspace.tsx:285`: `text-subheading-xs uppercase font-medium text-text-soft-400`
  - `components/orders/orders-dashboard.tsx:417`: `text-subheading-xs uppercase font-medium text-text-soft-400`

---

#### Bug 4: Table Header Style Mismatch
- **`components/ui/table.tsx:36`** (`TableHead` primitive):
  ```tsx
  className={cnExt(
    'bg-bg-weak-50 px-3 py-2 text-left text-paragraph-sm text-text-sub-600 first:rounded-l-lg last:rounded-r-lg',
    className,
  )}
  ```
- **`components/orders/orders-dashboard.tsx:308-319`** & **`order-detail-workspace.tsx:165-173`**:
  Both use `<Table.Root>`, `<Table.Header>`, and `<Table.Head>` (`px-3 py-2 text-paragraph-sm text-text-sub-600`).
- **`components/orders/order-form.tsx:241-256`**:
  ```tsx
  <table className="w-full min-w-[640px] border-collapse text-left">
    <thead>
      <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm font-medium text-text-sub-600">
        <th className="w-10 px-3 py-2.5 text-center font-medium">#</th>
        <th className="px-3 py-2.5 font-medium">Description</th>
        <th className="w-28 px-3 py-2.5 text-center font-medium">Quantity</th>
        <th className="w-36 px-3 py-2.5 text-right font-medium">Unit price ($)</th>
        <th className="w-36 px-3 py-2.5 text-right font-medium">Line total</th>
        <th className="w-12 px-2 py-2.5 text-center font-medium" aria-label="Actions" />
      </tr>
    </thead>
  ```
  *Discrepancy*: Uses raw `table`/`thead`/`th` with `py-2.5` instead of `py-2` and lacks `first:rounded-l-lg last:rounded-r-lg`.
- **`components/orders/order-form.tsx:381`** (Mobile line item header):
  ```tsx
  <span className="text-paragraph-xs font-semibold text-text-sub-600">Item #{index + 1}</span>
  ```

---

#### Bug 5: Mixed `label-sm` Font Weights Across Forms & Cards
- **`tailwind.config.ts:78-85`**: `label-sm` defines `fontWeight: '500'` (medium).
- **Form field labels**:
  - `components/ui/input.tsx:347`: `<LabelPrimitive.Root ... className="text-label-sm text-text-strong-950 font-medium flex items-center">`
  - `components/ui/label.tsx:20`: `'group cursor-pointer text-label-sm text-text-strong-950'`
- **Navigation / User items**:
  - `components/layout/user-button.tsx:81, 101`: `text-label-sm font-medium text-text-strong-950`
  - `components/layout/app-shell.tsx:44`: `text-label-sm text-text-sub-600` / `font-medium`
- **Section Headings using `label-sm font-semibold`**:
  - `components/orders/orders-dashboard.tsx:171`: `<h2 ... className="text-label-sm font-semibold text-text-strong-950">Orders</h2>`
  - `components/orders/orders-dashboard.tsx:229, 249`: `<h3 className="text-label-sm font-semibold text-text-strong-950">`
  - `components/orders/order-detail-workspace.tsx:304`: `<h2 className="text-label-sm font-semibold text-text-strong-950" id={id}>`
  - `components/orders/order-delete-dialog.tsx:81`: `<p className="mt-1 text-label-sm font-semibold text-text-strong-950">`
- **Section Headings using `label-md font-semibold`**:
  - `components/orders/order-form.tsx:154`: `<h2 ... className="text-label-md font-semibold text-text-strong-950">Customer &amp; Terms</h2>`
  - `components/orders/order-form.tsx:204`: `<h2 ... className="text-label-md font-semibold text-text-strong-950">Line Items</h2>`
  - `components/orders/sample-data-cta.tsx:52`: `<h3 className="text-label-md font-semibold text-text-strong-950">Demo Assignment Dataset</h3>`
  - `components/layout/app-shell.tsx:175`: `<Dialog.Title className="text-label-md font-semibold text-text-strong-950 pb-2">`

---

#### Bug 6: Back Link Spacing Inconsistency
- **`components/orders/create-order-workspace.tsx:42-56`**:
  ```tsx
  <Link className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950" href="/orders">
    <RiArrowLeftLine className="size-4" /> All orders
  </Link>
  <div className="mt-4 mb-6">
    <PageHeader eyebrow="Finance operations" title="Create order" ... />
  </div>
  ```
- **`components/orders/edit-order-workspace.tsx:125-139`**:
  ```tsx
  <Link className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950" href={`/orders/${order.id}`}>
    <RiArrowLeftLine className="size-4" /> Back to order details
  </Link>
  <div className="mt-4 mb-6">
    <PageHeader eyebrow={`Edit order ${order.displayId}`} ... />
  </div>
  ```
- **`components/orders/order-detail-workspace.tsx:89-97`**:
  ```tsx
  <Link className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950" href="/orders">
    <RiArrowLeftLine className="size-4" /> All orders
  </Link>
  <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
  ```
- *Observation*: Create and edit views use `mt-4 mb-6` wrapping `<PageHeader>`, whereas detail view uses `<header className="mt-5 ...">`.

---

### 1.2 Additional Codebase Audit Findings

#### Finding 7: Missing Interactive States & Focus Rings on Custom Controls
- **`components/orders/payment-dialog.tsx:253`**:
  ```tsx
  <button
    className="text-subheading-2xs font-semibold text-text-sub-600 underline-offset-2 hover:text-text-strong-950 hover:underline focus-visible:outline-none"
    type="button"
    onClick={handleUseRemaining}
  >
  ```
  *Issue*: Has `focus-visible:outline-none` but lacks a visible focus ring.
  *Fix*: Add `focus-visible:ring-2 focus-visible:ring-stroke-strong-950 rounded-sm`.

- **`components/orders/orders-toolbar.tsx:112-116`**:
  ```tsx
  <button
    key={filter.value}
    type="button"
    aria-pressed={isActive}
    className={cn(
      "h-8 shrink-0 rounded-lg px-3 text-label-xs font-medium transition duration-200 ease-out outline-none",
      isActive
        ? "bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold"
        : "text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40",
    )}
    onClick={() => onStatusChange(filter.value)}
  >
  ```
  *Issue*: Segmented status filter buttons lack keyboard focus indication.
  *Fix*: Add `focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:ring-inset`.

- **`components/orders/orders-toolbar.tsx:168-179`**:
  ```tsx
  <button
    className="grid size-5 place-items-center text-text-soft-400 hover:text-text-strong-950"
    type="button"
    aria-label="Clear customer search"
    onClick={...}
  >
  ```
  *Issue*: Search input clear button lacks focus ring.
  *Fix*: Add `rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950`.

#### Finding 8: Button Radius Class Overrides
- **`components/orders/orders-dashboard.tsx:99, 185`**:
  ```tsx
  <Button.Root variant="primary" size="small" className="rounded-10" asChild>
  ```
  ```tsx
  <Button.Root variant="neutral" mode="stroke" size="small" type="button" className="rounded-10" ...>
  ```
  *Issue*: `size="small"` in `buttonVariants` defaults to `rounded-lg` (8px), but these buttons add manual `className="rounded-10"` (10px).
  *Fix*: Remove `className="rounded-10"` so `size="small"` consistently adheres to `rounded-lg`.

#### Finding 9: Dialog & Modal Card Radius Harmonization
- **`components/orders/order-delete-dialog.tsx:76`**: Uses `rounded-10 bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200`.
- **`components/orders/payment-dialog.tsx:175`**: Uses `overflow-hidden rounded-xl bg-bg-weak-50 ring-1 ring-inset ring-stroke-soft-200`.
- *Fix*: Harmonize both modal inner summary cards to `rounded-xl`.

#### Finding 10: Zero Hardcoded Tailwind Palette Colors
- Comprehensive regex scan confirmed 0 instances of unmapped Tailwind colors (e.g. `gray-`, `blue-`, `red-`, `green-`, `slate-`, `zinc-`, `stone-`) and 0 arbitrary hex strings in JSX component code. All colors strictly use Align UI semantic tokens.

---

## 2. Logic Chain

```
Observation 1.1 (Bug 1): user-button.tsx:75 and loading-state.tsx:51, 69 reference `bg-primary-lighter`.
  └─ In Align UI taxonomy, primary variants are alpha-based (`primary-alpha-10`), while status/accent colors use `lighter`.
  └─ Replacing `bg-primary-lighter` with `bg-primary-alpha-10` unifies component code with the official token design system.

Observation 1.2 (Bug 2): ui/status-badge.tsx defines variants for completed, pending, failed, disabled only.
  └─ partially_paid orders currently require setting statusVariant="pending" and overriding dot className.
  └─ Adding `information` variant to ui/status-badge.tsx gives first-class status badge support for partially_paid.

Observation 1.3 (Bug 3): tailwind.config.ts sets letter-spacing: 0.04em and font-weight: 500 for subheading-xs.
  └─ order-detail-workspace.tsx:63 adds font-semibold and tracking-wider, clashing with standard eyebrows.
  └─ Removing tracking-wider and font-semibold harmonizes all section eyebrows to `text-subheading-xs uppercase font-medium text-text-soft-400`.

Observation 1.4 (Bug 4): order-form.tsx uses raw <th> with py-2.5 while TableHead uses py-2 and rounded corner classes.
  └─ Tables in dashboard and detail views use Table.Head.
  └─ Standardizing order-form.tsx to match Table.Head dimensions (py-2, text-paragraph-sm, text-text-sub-600, rounded edge cells) aligns form edit and view modes.

Observation 1.5 (Bug 5): label-sm is used for both form input labels (medium 500) and card section headers (semibold 600).
  └─ Standardizing form labels to `text-label-sm font-medium` and card/panel section headers to `text-label-md font-semibold text-text-strong-950` creates unambiguous visual hierarchy.

Observation 1.6 (Bug 6): create-order and edit-order wrap PageHeader in `mt-4 mb-6`, while order-detail uses `mt-5` on header.
  └─ Standardizing the back link to a dedicated `mb-5` wrapper div ensures consistent vertical rhythm across all detail/create/edit views.

Observation 1.7 (Finding 7): Quick balance button and filter buttons in toolbar lack focus rings.
  └─ Adding `focus-visible:ring-2 focus-visible:ring-stroke-strong-950` guarantees WCAG 2.1 AA keyboard accessibility and visual polish.
```

---

## 3. Caveats

1. **Visual-Only Refactor Constraint**: No domain logic, API queries, or form schemas (`features/orders/form-schema.ts`, `contracts`) should be modified.
2. **Test Baseline**: All 127 tests in `apps/web` must remain green (`pnpm --filter @crossval/web test`).
3. **No Unused Imports / Build Cleanliness**: Ensure removing redundant classes or components does not introduce lint warnings or typecheck errors.

---

## 4. Conclusion & Concrete Replacement Proposals

Below is the exhaustive, file-by-file blueprint of exact replacement proposals for implementation.

### 4.1 Token & Primitive Standardizations

#### `apps/web/components/layout/user-button.tsx` (Line 75)
```diff
- <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
+ <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-alpha-10 text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
```

#### `apps/web/components/ui/loading-state.tsx` (Lines 51, 69)
```diff
- <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
+ <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-alpha-10 text-primary-base ring-1 ring-inset ring-primary-base/20">
...
- <div className="flex size-10 items-center justify-center rounded-xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
+ <div className="flex size-10 items-center justify-center rounded-xl bg-primary-alpha-10 text-primary-base ring-1 ring-inset ring-primary-base/20">
```

#### `apps/web/components/ui/status-badge.tsx` (Lines 35-83)
Add `information` status variant and compound light variant:
```diff
     status: {
+      information: {
+        icon: 'text-information-base',
+        dot: 'text-information-base',
+      },
       completed: {
         icon: 'text-success-base',
         dot: 'text-success-base',
       },
...
     compoundVariants: [
+      {
+        variant: 'light',
+        status: 'information',
+        class: {
+          root: 'bg-information-lighter text-information-base',
+        },
+      },
       {
         variant: 'light',
         status: 'completed',
```

#### `apps/web/components/orders/status-badge.tsx` (Lines 6-33)
```diff
- let statusVariant: "completed" | "pending" | "failed" | "disabled" = "pending";
+ let statusVariant: "completed" | "pending" | "failed" | "disabled" | "information" = "pending";
  let dotColorClass = "";

  switch (status) {
    case "paid":
      statusVariant = "completed";
      dotColorClass = "text-success-base";
      break;
    case "partially_paid":
-     statusVariant = "pending";
+     statusVariant = "information";
      dotColorClass = "text-information-base";
      break;
```

---

### 4.2 Typography & Tracking Cleanups

#### `apps/web/components/orders/order-detail-workspace.tsx` (Line 63)
```diff
- <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
+ <p className="mt-4 text-subheading-xs uppercase font-medium text-text-soft-400">
```

#### `apps/web/components/orders/order-edit-guard.tsx` (Line 21)
```diff
- <p className="mt-5 font-mono text-paragraph-xs font-semibold uppercase tracking-wider text-text-soft-400">
+ <p className="mt-5 text-subheading-xs uppercase font-medium text-text-soft-400">
```

#### `apps/web/components/orders/orders-dashboard.tsx` (Line 171) & `order-detail-workspace.tsx` (Line 304)
Standardize Card / Section Titles to `text-label-md font-semibold text-text-strong-950`:
```diff
- <h2 id="orders-heading" className="text-label-sm font-semibold text-text-strong-950">
+ <h2 id="orders-heading" className="text-label-md font-semibold text-text-strong-950">
```
```diff
- <h2 className="text-label-sm font-semibold text-text-strong-950" id={id}>
+ <h2 className="text-label-md font-semibold text-text-strong-950" id={id}>
```

---

### 4.3 Table Header & Line Items Styling

#### `apps/web/components/orders/order-form.tsx` (Lines 242-256)
```diff
- <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm font-medium text-text-sub-600">
-   <th className="w-10 px-3 py-2.5 text-center font-medium">#</th>
-   <th className="px-3 py-2.5 font-medium">Description</th>
-   <th className="w-28 px-3 py-2.5 text-center font-medium">Quantity</th>
-   <th className="w-36 px-3 py-2.5 text-right font-medium">
-     Unit price ($)
-   </th>
-   <th className="w-36 px-3 py-2.5 text-right font-medium">Line total</th>
-   <th
-     className="w-12 px-2 py-2.5 text-center font-medium"
-     aria-label="Actions"
-   />
- </tr>
+ <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600">
+   <th className="w-10 px-3 py-2 text-center font-medium first:rounded-l-lg">#</th>
+   <th className="px-3 py-2 font-medium">Description</th>
+   <th className="w-28 px-3 py-2 text-center font-medium">Quantity</th>
+   <th className="w-36 px-3 py-2 text-right font-medium">Unit price ($)</th>
+   <th className="w-36 px-3 py-2 text-right font-medium">Line total</th>
+   <th className="w-12 px-2 py-2 text-center font-medium last:rounded-r-lg" aria-label="Actions" />
+ </tr>
```

---

### 4.4 Back Link Spacing Standardizations

#### `apps/web/components/orders/create-order-workspace.tsx` (Lines 42-56)
```diff
- <Link
-   className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
-   href="/orders"
- >
-   <RiArrowLeftLine className="size-4" />
-   All orders
- </Link>
-
- <div className="mt-4 mb-6">
-   <PageHeader
-     eyebrow="Finance operations"
-     title="Create order"
-     description="Draft a new receivable order with custom line items and settlement due date."
-   />
- </div>
+ <div className="mb-5">
+   <Link
+     className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
+     href="/orders"
+   >
+     <RiArrowLeftLine className="size-4" />
+     All orders
+   </Link>
+ </div>
+
+ <PageHeader
+   eyebrow="Finance operations"
+   title="Create order"
+   description="Draft a new receivable order with custom line items and settlement due date."
+ />
```

#### `apps/web/components/orders/edit-order-workspace.tsx` (Lines 124-139)
```diff
- <Link
-   className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
-   href={`/orders/${order.id}`}
- >
-   <RiArrowLeftLine className="size-4" />
-   Back to order details
- </Link>
-
- <div className="mt-4 mb-6">
-   <PageHeader
-     eyebrow={`Edit order ${order.displayId}`}
-     title={`Edit ${order.customerName}`}
-     description="Update customer name, due date, or line items. The order total will recalculate automatically."
-   />
- </div>
+ <div className="mb-5">
+   <Link
+     className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
+     href={`/orders/${order.id}`}
+   >
+     <RiArrowLeftLine className="size-4" />
+     Back to order details
+   </Link>
+ </div>
+
+ <PageHeader
+   eyebrow={`Edit order ${order.displayId}`}
+   title={`Edit ${order.customerName}`}
+   description="Update customer name, due date, or line items. The order total will recalculate automatically."
+ />
```

#### `apps/web/components/orders/order-detail-workspace.tsx` (Lines 89-97)
```diff
- <Link
-   className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
-   href="/orders"
- >
-   <RiArrowLeftLine className="size-4" />
-   All orders
- </Link>
-
- <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
+ <div className="mb-5">
+   <Link
+     className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
+     href="/orders"
+   >
+     <RiArrowLeftLine className="size-4" />
+     All orders
+   </Link>
+ </div>
+
+ <header className="flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
```

---

### 4.5 Interactive Focus Rings & Button Cleanups

#### `apps/web/components/orders/payment-dialog.tsx` (Line 253)
```diff
- className="text-subheading-2xs font-semibold text-text-sub-600 underline-offset-2 hover:text-text-strong-950 hover:underline focus-visible:outline-none"
+ className="text-subheading-2xs font-semibold text-text-sub-600 underline-offset-2 hover:text-text-strong-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950 rounded-sm"
```

#### `apps/web/components/orders/orders-toolbar.tsx` (Lines 112, 168)
```diff
- className={cn(
-   "h-8 shrink-0 rounded-lg px-3 text-label-xs font-medium transition duration-200 ease-out outline-none",
-   isActive
-     ? "bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold"
-     : "text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40",
- )}
+ className={cn(
+   "h-8 shrink-0 rounded-lg px-3 text-label-xs font-medium transition duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:ring-inset",
+   isActive
+     ? "bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold"
+     : "text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40",
+ )}
```
```diff
- className="grid size-5 place-items-center text-text-soft-400 hover:text-text-strong-950"
+ className="grid size-5 place-items-center rounded-sm text-text-soft-400 hover:text-text-strong-950 outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
```

#### `apps/web/components/orders/orders-dashboard.tsx` (Lines 99, 185)
```diff
- <Button.Root variant="primary" size="small" className="rounded-10" asChild>
+ <Button.Root variant="primary" size="small" asChild>
```
```diff
- <Button.Root variant="neutral" mode="stroke" size="small" type="button" className="rounded-10"
+ <Button.Root variant="neutral" mode="stroke" size="small" type="button"
```

#### `apps/web/components/orders/order-delete-dialog.tsx` (Line 76)
```diff
- <div className="rounded-10 bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200">
+ <div className="rounded-xl bg-bg-weak-50 p-4 ring-1 ring-inset ring-stroke-soft-200">
```

---

## 5. Verification Method

To independently verify all findings and confirm zero regressions after applying proposals:

1. **Unit & Component Tests**:
   ```bash
   pnpm --filter @crossval/web test
   ```
   *Expected*: All 11 test suites and 127 tests pass (0 failures).

2. **TypeScript Compilation**:
   ```bash
   pnpm typecheck
   ```
   *Expected*: Zero TypeScript diagnostic errors across all packages (`@crossval/contracts`, `apps/api`, `apps/web`).

3. **ESLint Linting**:
   ```bash
   pnpm lint
   ```
   *Expected*: Zero errors, zero warnings across all workspace packages.

4. **Production Build**:
   ```bash
   pnpm build
   ```
   *Expected*: Clean build for all packages.

5. **Token Compliance Verification**:
   ```bash
   rg "text-blue-|text-gray-|bg-gray-|bg-blue-|bg-red-|bg-green-" apps/web
   ```
   *Expected*: 0 matches.
