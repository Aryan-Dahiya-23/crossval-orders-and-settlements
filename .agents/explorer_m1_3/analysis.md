# Milestone 1: Core Tokens, Typography & Bug Fixes — Investigation & Replacement Plans

## Executive Summary

This investigation covers the complete scope of **Milestone 1 (M1: Core Tokens, Typography & Bug Fixes)**. It delivers exact file locations, line numbers, root-cause analyses, and drop-in code replacement plans for the Worker agent across:
1. **Table Header Styling Harmonization** between `order-form.tsx` and view-mode tables (`table.tsx`, `orders-dashboard.tsx`, `order-detail-workspace.tsx`).
2. **Back Link Container & Header Spacing Harmonization** (`mt-4 mb-6`) across `create-order-workspace.tsx`, `edit-order-workspace.tsx`, and `order-detail-workspace.tsx`.
3. **Focus Rings & Interactive Micro-Feedback** on buttons, table actions, and form controls.
4. **All 6 Known Bug Fixes** (Undefined `bg-primary-lighter`, hardcoded colors, `subheading-xs` typography overrides, table header mismatches, label font weights, and back-link vertical spacing).

---

## 1. Table Header Styling Harmonization

### 1.1 Problem Analysis
- **Current State in `order-form.tsx:243`**:
  ```tsx
  <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">
    <th className="w-10 px-3 py-2.5 text-center">#</th>
    <th className="px-3 py-2.5">Description</th>
    <th className="w-28 px-3 py-2.5 text-center">Quantity</th>
    <th className="w-36 px-3 py-2.5 text-right">Unit price ($)</th>
    <th className="w-36 px-3 py-2.5 text-right">Line total</th>
    <th className="w-12 px-2 py-2.5 text-center" aria-label="Actions" />
  </tr>
  ```
  This uses raw `th` elements with `text-subheading-2xs uppercase text-text-soft-400 font-medium` (11px micro-text with uppercase styling).
- **Current State in View Tables**:
  - `orders-dashboard.tsx:311–317`: `<Table.Head>` elements.
  - `order-detail-workspace.tsx:168–171`: `<Table.Head>` elements.
  - `components/ui/table.tsx:36`: `TableHead` primitive renders `bg-bg-weak-50 px-3 py-2 text-left text-paragraph-sm text-text-sub-600`.

### 1.2 Harmonization Standard
Harmonize table header typography across the application so that form line-item headers match the clean, readable `text-paragraph-sm font-medium text-text-sub-600` styling of the Align UI table system.

### 1.3 Exact Code Replacement Plan for `order-form.tsx`
**File**: `apps/web/components/orders/order-form.tsx`  
**Lines**: 242–256  

```tsx
<<<< BEFORE (lines 242-256)
              <thead>
                <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">
                  <th className="w-10 px-3 py-2.5 text-center">#</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="w-28 px-3 py-2.5 text-center">Quantity</th>
                  <th className="w-36 px-3 py-2.5 text-right">
                    Unit price ($)
                  </th>
                  <th className="w-36 px-3 py-2.5 text-right">Line total</th>
                  <th
                    className="w-12 px-2 py-2.5 text-center"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
==== AFTER
              <thead>
                <tr className="border-b border-stroke-soft-200 bg-bg-weak-50">
                  <th className="w-10 px-3 py-2.5 text-center text-paragraph-sm font-medium text-text-sub-600">#</th>
                  <th className="px-3 py-2.5 text-paragraph-sm font-medium text-text-sub-600">Description</th>
                  <th className="w-28 px-3 py-2.5 text-center text-paragraph-sm font-medium text-text-sub-600">Quantity</th>
                  <th className="w-36 px-3 py-2.5 text-right text-paragraph-sm font-medium text-text-sub-600">
                    Unit price ($)
                  </th>
                  <th className="w-36 px-3 py-2.5 text-right text-paragraph-sm font-medium text-text-sub-600">Line total</th>
                  <th
                    className="w-12 px-2 py-2.5 text-center"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
>>>>
```

---

## 2. Back Link Container & Header Spacing Harmonization

### 2.1 Problem Analysis
- `apps/web/components/orders/create-order-workspace.tsx:50`: `<div className="mt-4 mb-6"><PageHeader .../></div>` (Top margin 16px, bottom margin 24px)
- `apps/web/components/orders/edit-order-workspace.tsx:133`: `<div className="mt-4 mb-6"><PageHeader .../></div>` (Top margin 16px, bottom margin 24px)
- `apps/web/components/orders/order-detail-workspace.tsx:97`: `<header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">` (Top margin 20px, bottom padding 24px)

The vertical gap between the `<Link>` back-button and the main header/title shifts noticeably when moving between order detail (`mt-5`) and create/edit (`mt-4 mb-6`).

### 2.2 Harmonization Standard
Standardize all three page header containers to have identical top and bottom margins: `mt-4 mb-6`.

### 2.3 Exact Code Replacement Plan for `order-detail-workspace.tsx`
**File**: `apps/web/components/orders/order-detail-workspace.tsx`  
**Line**: 97  

```tsx
<<<< BEFORE (line 97)
      <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
==== AFTER
      <header className="mt-4 mb-6 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
>>>>
```

---

## 3. Focus Rings & Interactive Micro-Feedback

### 3.1 `button.tsx` (Error Hover Color Bug & Token Cleanliness)
**File**: `apps/web/components/ui/button.tsx`  
**Lines**: 187–243  

```tsx
<<<< BEFORE (lines 187-243)
    //#region variant=error
    {
      variant: 'error',
      mode: 'filled',
      class: {
        root: [
          // base
          'bg-error-base text-static-white',
          // hover
          'hover:bg-red-700',
          // focus
          'focus-visible:shadow-button-error-focus',
        ],
      },
    },
    {
      variant: 'error',
      mode: 'stroke',
      class: {
        root: [
          // base
          'bg-bg-white-0 text-error-base ring-error-base',
          // hover
          'hover:bg-red-alpha-10 hover:ring-transparent',
          // focus
          'focus-visible:shadow-button-error-focus',
        ],
      },
    },
    {
      variant: 'error',
      mode: 'lighter',
      class: {
        root: [
          // base
          'bg-red-alpha-10 text-error-base ring-transparent',
          // hover
          'hover:bg-bg-white-0 hover:ring-error-base',
          // focus
          'focus-visible:bg-bg-white-0 focus-visible:shadow-button-error-focus focus-visible:ring-error-base',
        ],
      },
    },
    {
      variant: 'error',
      mode: 'ghost',
      class: {
        root: [
          // base
          'bg-transparent text-error-base ring-transparent',
          // hover
          'hover:bg-red-alpha-10',
          // focus
          'focus-visible:bg-bg-white-0 focus-visible:shadow-button-error-focus focus-visible:ring-error-base',
        ],
      },
    },
    //#endregion
==== AFTER
    //#region variant=error
    {
      variant: 'error',
      mode: 'filled',
      class: {
        root: [
          // base
          'bg-error-base text-static-white',
          // hover
          'hover:bg-error-dark',
          // focus
          'focus-visible:shadow-button-error-focus',
        ],
      },
    },
    {
      variant: 'error',
      mode: 'stroke',
      class: {
        root: [
          // base
          'bg-bg-white-0 text-error-base ring-error-base',
          // hover
          'hover:bg-error-lighter hover:ring-transparent',
          // focus
          'focus-visible:shadow-button-error-focus',
        ],
      },
    },
    {
      variant: 'error',
      mode: 'lighter',
      class: {
        root: [
          // base
          'bg-error-lighter text-error-base ring-transparent',
          // hover
          'hover:bg-bg-white-0 hover:ring-error-base',
          // focus
          'focus-visible:bg-bg-white-0 focus-visible:shadow-button-error-focus focus-visible:ring-error-base',
        ],
      },
    },
    {
      variant: 'error',
      mode: 'ghost',
      class: {
        root: [
          // base
          'bg-transparent text-error-base ring-transparent',
          // hover
          'hover:bg-error-lighter',
          // focus
          'focus-visible:bg-bg-white-0 focus-visible:shadow-button-error-focus focus-visible:ring-error-base',
        ],
      },
    },
    //#endregion
>>>>
```

### 3.2 `order-form.tsx` (Table Delete Action & Mobile Remove Action Focus Rings)
**File**: `apps/web/components/orders/order-form.tsx`  
**Lines**: 340–354 (Desktop line item delete button) and Line 386 (Mobile remove button)

```tsx
<<<< BEFORE (lines 340-354)
                        <button
                          type="button"
                          className="grid size-9 place-items-center rounded-lg text-text-soft-400 transition hover:bg-error-lighter/50 hover:text-error-base disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1 || isSubmitting}
                          aria-label={`Remove item ${index + 1}`}
                          title={
                            fields.length <= 1
                              ? "An order requires at least one line item"
                              : "Remove item"
                          }
                        >
                          <RiDeleteBinLine className="size-4" />
                        </button>
==== AFTER
                        <button
                          type="button"
                          className="grid size-9 place-items-center rounded-lg text-text-soft-400 transition hover:bg-error-lighter/50 hover:text-error-base disabled:pointer-events-none disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-error-base"
                          onClick={() => remove(index)}
                          disabled={fields.length <= 1 || isSubmitting}
                          aria-label={`Remove item ${index + 1}`}
                          title={
                            fields.length <= 1
                              ? "An order requires at least one line item"
                              : "Remove item"
                          }
                        >
                          <RiDeleteBinLine className="size-4" />
                        </button>
>>>>
```

```tsx
<<<< BEFORE (lines 384-391)
                    <button
                      type="button"
                      className="text-paragraph-xs font-medium text-error-base disabled:opacity-30"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1 || isSubmitting}
                    >
                      Remove
                    </button>
==== AFTER
                    <button
                      type="button"
                      className="text-paragraph-xs font-medium text-error-base hover:underline outline-none focus-visible:ring-2 focus-visible:ring-error-base rounded-sm disabled:opacity-30"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1 || isSubmitting}
                    >
                      Remove
                    </button>
>>>>
```

### 3.3 `payment-dialog.tsx` ("Use remaining balance" Shortcut Focus Ring)
**File**: `apps/web/components/orders/payment-dialog.tsx`  
**Lines**: 252–258  

```tsx
<<<< BEFORE (lines 252-258)
                  <button
                    className="text-subheading-2xs font-semibold text-text-sub-600 underline-offset-2 hover:text-text-strong-950 hover:underline focus-visible:outline-none"
                    type="button"
                    onClick={handleUseRemaining}
                  >
                    Use remaining balance ({formatUsd(order.balanceDueCents)})
                  </button>
==== AFTER
                  <button
                    className="text-subheading-2xs font-semibold text-text-sub-600 underline-offset-2 hover:text-text-strong-950 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950 rounded-sm"
                    type="button"
                    onClick={handleUseRemaining}
                  >
                    Use remaining balance ({formatUsd(order.balanceDueCents)})
                  </button>
>>>>
```

### 3.4 `orders-toolbar.tsx` (Segmented Tabs & Search Clear Focus Rings)
**File**: `apps/web/components/orders/orders-toolbar.tsx`  
**Lines**: 111–117, 168–179  

```tsx
<<<< BEFORE (lines 111-117)
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-label-xs font-medium transition duration-200 ease-out outline-none",
                isActive
                  ? "bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold"
                  : "text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40",
              )}
==== AFTER
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-label-xs font-medium transition duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950 focus-visible:ring-offset-1",
                isActive
                  ? "bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold"
                  : "text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40",
              )}
>>>>
```

```tsx
<<<< BEFORE (lines 168-179)
                <button
                  className="grid size-5 place-items-center text-text-soft-400 hover:text-text-strong-950"
                  type="button"
                  aria-label="Clear customer search"
                  onClick={() => {
                    setSearchDraft("");
                    onSearchChange(null);
                  }}
                >
                  <RiCloseLine className="size-4" />
                </button>
==== AFTER
                <button
                  className="grid size-5 place-items-center rounded-sm text-text-soft-400 hover:text-text-strong-950 outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
                  type="button"
                  aria-label="Clear customer search"
                  onClick={() => {
                    setSearchDraft("");
                    onSearchChange(null);
                  }}
                >
                  <RiCloseLine className="size-4" />
                </button>
>>>>
```

### 3.5 `pagination.tsx` (Pagination Items & Nav Buttons Focus Rings)
**File**: `apps/web/components/ui/pagination.tsx`  
**Lines**: 19–21  

```tsx
<<<< BEFORE (lines 19-21)
    item: 'flex items-center justify-center text-center text-label-sm text-text-sub-600 transition duration-200 ease-out',
    navButton:
      'flex items-center justify-center text-text-sub-600 transition duration-200 ease-out',
==== AFTER
    item: 'flex items-center justify-center text-center text-label-sm text-text-sub-600 transition duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950',
    navButton:
      'flex items-center justify-center text-text-sub-600 transition duration-200 ease-out outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950',
>>>>
```

---

## 4. Known Bug Fixes in M1 Scope

### 4.1 Bug 1: `bg-primary-lighter` Defined in `tailwind.config.ts`
**File**: `apps/web/tailwind.config.ts`  
**Lines**: 342–349  

```ts
<<<< BEFORE (lines 342-349)
      primary: {
        dark: 'hsl(var(--primary-dark))',
        darker: 'hsl(var(--primary-darker))',
        base: 'hsl(var(--primary-base))',
        'alpha-24': 'hsl(var(--primary-alpha-24))',
        'alpha-16': 'hsl(var(--primary-alpha-16))',
        'alpha-10': 'hsl(var(--primary-alpha-10))',
      },
==== AFTER
      primary: {
        dark: 'hsl(var(--primary-dark))',
        darker: 'hsl(var(--primary-darker))',
        base: 'hsl(var(--primary-base))',
        lighter: 'hsl(var(--primary-alpha-10))',
        'alpha-24': 'hsl(var(--primary-alpha-24))',
        'alpha-16': 'hsl(var(--primary-alpha-16))',
        'alpha-10': 'hsl(var(--primary-alpha-10))',
      },
>>>>
```

### 4.2 Bug 2: Hardcoded `text-blue-500` Replaced in `status-badge.tsx`
**File**: `apps/web/components/orders/status-badge.tsx`  
**Lines**: 14–17  

```tsx
<<<< BEFORE (lines 14-17)
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-blue-500";
      break;
==== AFTER
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-information-base";
      break;
>>>>
```

### 4.3 Bug 3: `subheading-xs` Typography Standardization
Remove manual `tracking-wider` / `tracking-wide` overrides and standardize to config default `text-subheading-xs uppercase text-text-soft-400` across all files:

1. **`apps/web/components/layout/app-shell.tsx` (Line 114 & Line 181)**:
   ```tsx
   <<<< BEFORE (line 114)
             <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
   ==== AFTER
             <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400">
   >>>>
   ```
   ```tsx
   <<<< BEFORE (line 181)
               <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
   ==== AFTER
               <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400">
   >>>>
   ```

2. **`apps/web/components/layout/user-button.tsx` (Line 98)**:
   ```tsx
   <<<< BEFORE (line 98)
             <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider">
   ==== AFTER
             <p className="text-subheading-2xs uppercase text-text-soft-400">
   >>>>
   ```

3. **`apps/web/components/orders/edit-order-workspace.tsx` (Line 57)**:
   ```tsx
   <<<< BEFORE (line 57)
               <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
   ==== AFTER
               <p className="mt-4 text-subheading-xs uppercase text-text-soft-400">
   >>>>
   ```

4. **`apps/web/components/orders/order-detail-workspace.tsx` (Line 63)**:
   ```tsx
   <<<< BEFORE (line 63)
               <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
   ==== AFTER
               <p className="mt-4 text-subheading-xs uppercase text-text-soft-400">
   >>>>
   ```

5. **`apps/web/components/orders/orders-dashboard.tsx` (Line 417)**:
   ```tsx
   <<<< BEFORE (line 417)
           <span className="text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400">{label}</span>
   ==== AFTER
           <span className="text-subheading-xs uppercase text-text-soft-400">{label}</span>
   >>>>
   ```

---

## 5. Summary Matrix of M1 Target Files & Planned Modifications

| Target File | Scope / Purpose | Edits Summary |
|---|---|---|
| `apps/web/tailwind.config.ts` | Bug 1 Fix | Add `lighter: 'hsl(var(--primary-alpha-10))'` to `colors.primary`. |
| `apps/web/components/orders/status-badge.tsx` | Bug 2 Fix | Replace `text-blue-500` with `text-information-base`. |
| `apps/web/components/ui/button.tsx` | Bug 2 & Focus Polish | Replace `hover:bg-red-700` and `red-alpha-10` with `hover:bg-error-dark` and `error-lighter`. |
| `apps/web/components/orders/order-form.tsx` | Bug 4 & Focus Polish | Harmonize table headers to `text-paragraph-sm font-medium text-text-sub-600`; add focus rings to line item delete and mobile remove buttons. |
| `apps/web/components/orders/order-detail-workspace.tsx` | Bug 6 & Bug 3 Fix | Standardize header container margin to `mt-4 mb-6`; clean `subheading-xs` tracking in error state. |
| `apps/web/components/orders/edit-order-workspace.tsx` | Bug 3 Fix | Clean `subheading-xs` tracking in error state. |
| `apps/web/components/orders/orders-dashboard.tsx` | Bug 3 Fix | Clean `subheading-xs` tracking in `SummaryCard`. |
| `apps/web/components/layout/app-shell.tsx` | Bug 3 Fix | Clean `subheading-xs` tracking in desktop and mobile sidebar headings. |
| `apps/web/components/layout/user-button.tsx` | Bug 3 Fix | Clean `subheading-2xs` tracking in profile header. |
| `apps/web/components/orders/payment-dialog.tsx` | Focus Polish | Add visible focus ring to "Use remaining balance" shortcut button. |
| `apps/web/components/orders/orders-toolbar.tsx` | Focus Polish | Add visible focus ring to segmented filter tabs and search clear button. |
| `apps/web/components/ui/pagination.tsx` | Focus Polish | Add visible focus ring to pagination item and nav button primitives. |
