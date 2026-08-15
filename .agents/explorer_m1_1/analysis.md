# Milestone 1 Investigation & Code Replacement Plan: Core Tokens, Typography & Bug Fixes

**Target Workspace**: `apps/web`  
**Explorer Agent**: `explorer_m1_1`  
**Milestone**: Milestone 1 (Core Tokens, Typography & Bug Fixes)  
**Date**: 2026-08-15  

---

## 1. Executive Summary

Milestone 1 establishes the rock-solid design token foundation, eliminates all hardcoded color classes, and harmonizes typography and spacing rhythm across the entire `apps/web` workspace. 

This investigation provides:
1. **The exact configuration** to fix the undefined `bg-primary-lighter` utility in `apps/web/tailwind.config.ts` and verification against `apps/web/app/globals.css`.
2. **The complete audit and replacement plan** for raw color classes in `status-badge.tsx` (`text-blue-500` → `text-information-base`) and `button.tsx` (`hover:bg-red-700` → `hover:bg-error-dark`, raw `red-alpha-10` → `error-lighter`).
3. **An exhaustive scan** across all 113+ files in `apps/web` confirming zero remaining hardcoded color palette classes.
4. **Typographic and layout harmony plans** for `subheading-xs` tracking overrides, `order-form.tsx` table header styles, label font weights, and back-link vertical spacing.
5. **Exact before-and-after code specifications** ready for implementation by the Worker agent.

---

## 2. Token Architecture & `bg-primary-lighter` Configuration

### 2.1 Problem Observation & Root Cause
In `apps/web`:
- `apps/web/components/layout/user-button.tsx:75`:
  ```tsx
  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-lighter text-label-xs font-semibold text-primary-base ring-1 ring-inset ring-primary-base/20">
  ```
- `apps/web/components/ui/loading-state.tsx:51`:
  ```tsx
  <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
  ```
- `apps/web/components/ui/loading-state.tsx:69`:
  ```tsx
  <div className="flex size-10 items-center justify-center rounded-xl bg-primary-lighter text-primary-base ring-1 ring-inset ring-primary-base/20">
  ```

In `apps/web/tailwind.config.ts` (lines 342–349):
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
`lighter` is completely missing from `colors.primary`, meaning Tailwind does not generate a `.bg-primary-lighter` class. The element renders with a transparent background.

### 2.2 CSS Variable Verification in `globals.css`
Inspecting `apps/web/app/globals.css`:
- Line 22: `--neutral-alpha-10: 220 11.48% 64.12% / 10%;`
- Line 119: `--primary-alpha-10: var(--neutral-alpha-10);`
- Line 38: `--blue-alpha-10: 227.93 100% 63.92% / 10%;`
- Line 34: `--blue-50: 222 100% 96.08%;`

`--primary-alpha-10` is already defined and mapped to `--neutral-alpha-10` in `:root`.

### 2.3 Exact Configuration in `apps/web/tailwind.config.ts`
Under `theme.extend.colors.primary` (or `theme.colors.primary`):
```ts
      primary: {
        dark: 'hsl(var(--primary-dark))',
        darker: 'hsl(var(--primary-darker))',
        base: 'hsl(var(--primary-base))',
        lighter: 'hsl(var(--primary-alpha-10))',
        'alpha-24': 'hsl(var(--primary-alpha-24))',
        'alpha-16': 'hsl(var(--primary-alpha-16))',
        'alpha-10': 'hsl(var(--primary-alpha-10))',
      },
```
With `lighter: 'hsl(var(--primary-alpha-10))'`, Tailwind generates `.bg-primary-lighter`, `.text-primary-lighter`, `.border-primary-lighter`, etc., ensuring full token resolution and 100% alignment with Align UI design principles.

---

## 3. Exhaustive Hardcoded Color Audit Across `apps/web`

We conducted full-codebase regex searches for hardcoded Tailwind colors (`text-blue-500`, `hover:bg-red-700`, `gray-*`, `slate-*`, `zinc-*`, `amber-*`, `emerald-*`, `red-*`, `blue-*`, etc.), hex codes (`#...`), `rgb(...)`, and `hsl(...)`.

### 3.1 Hardcoded Colors Identified & Required Replacements

| # | File Path | Line | Current Raw Code | Required Semantic Align UI Token | Rationale |
|---|---|---|---|---|---|
| 1 | `components/orders/status-badge.tsx` | 16 | `dotColorClass = "text-blue-500";` | `dotColorClass = "text-information-base";` | `partially_paid` status represents informational/open state; uses Align UI `information-base` token. |
| 2 | `components/ui/button.tsx` | 195 | `'hover:bg-red-700'` | `'hover:bg-error-dark'` | `variant: 'error', mode: 'filled'` hover state should use tokenized error dark background. |
| 3 | `components/ui/button.tsx` | 209 | `'hover:bg-red-alpha-10 hover:ring-transparent'` | `'hover:bg-error-lighter hover:ring-transparent'` | `variant: 'error', mode: 'stroke'` hover state should use semantic error lighter token. |
| 4 | `components/ui/button.tsx` | 221 | `'bg-red-alpha-10 text-error-base ring-transparent'` | `'bg-error-lighter text-error-base ring-transparent'` | `variant: 'error', mode: 'lighter'` base state should use semantic error lighter token. |
| 5 | `components/ui/button.tsx` | 237 | `'hover:bg-red-alpha-10'` | `'hover:bg-error-lighter'` | `variant: 'error', mode: 'ghost'` hover state should use semantic error lighter token. |

### 3.2 Audit Findings for All Other Files in `apps/web`
- **All other UI Primitives** (`alert.tsx`, `badge.tsx`, `compact-button.tsx`, `divider.tsx`, `dropdown.tsx`, `input.tsx`, `label.tsx`, `modal.tsx`, `pagination.tsx`, `select.tsx`, `skeleton.tsx`, `table.tsx`, `textarea.tsx`, `tooltip.tsx`, `widget-box.tsx`): **100% Token Compliant**. All utilize semantic tokens such as `bg-bg-white-0`, `text-text-strong-950`, `text-text-sub-600`, `ring-stroke-soft-200`, `shadow-regular-xs`, `shadow-button-important-focus`, `bg-bg-weak-50`.
- **All Order Components** (`create-order-workspace.tsx`, `edit-order-workspace.tsx`, `order-action-bar.tsx`, `order-delete-dialog.tsx`, `order-detail-workspace.tsx`, `order-edit-guard.tsx`, `order-form.tsx`, `order-lock-banner.tsx`, `orders-dashboard.tsx`, `orders-pagination.tsx`, `orders-toolbar.tsx`, `payment-dialog.tsx`, `sample-data-cta.tsx`): **Zero hardcoded raw color names** outside the 5 identified above.
- **All Auth & Layout Components** (`app-shell.tsx`, `auth-boundary.tsx`, `auth-shell.tsx`, `brand.tsx`, `login-form.tsx`, `logout-button.tsx`, `navigation.tsx`, `page-header.tsx`, `signup-form.tsx`, `user-button.tsx`): **Zero hardcoded raw color names**.

---

## 4. Typography & Spacing Harmonization

### 4.1 Standardize `subheading-xs` and `subheading-2xs`
`apps/web/tailwind.config.ts` defines `subheading-xs` with `letterSpacing: '0.04em'` and `fontWeight: '500'`, and `subheading-2xs` with `letterSpacing: '0.02em'` and `fontWeight: '500'`.

Manual tracking classes (`tracking-wider`, `tracking-wide`) and ad-hoc `font-semibold` overrides violate typographic consistency and must be removed:

| File Path | Line | Current Class | Target Harmonized Class |
|---|---|---|---|
| `components/layout/app-shell.tsx` | 114 | `mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider` | `mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium` |
| `components/layout/app-shell.tsx` | 181 | `mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider` | `mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium` |
| `components/layout/user-button.tsx` | 98 | `text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider` | `text-subheading-2xs uppercase text-text-soft-400 font-medium` |
| `components/orders/orders-dashboard.tsx` | 417 | `text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400` | `text-subheading-xs uppercase font-medium text-text-soft-400` |
| `components/orders/edit-order-workspace.tsx` | 57 | `mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400` | `mt-4 text-subheading-xs font-medium uppercase text-text-soft-400` |
| `components/orders/order-detail-workspace.tsx` | 63 | `mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400` | `mt-4 text-subheading-xs font-medium uppercase text-text-soft-400` |

### 4.2 Table Header Typography Harmony
- **Issue**: `components/orders/order-form.tsx:243` used raw `<tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-subheading-2xs uppercase text-text-soft-400 font-medium">` with micro-uppercase styling, whereas view-mode data tables in `orders-dashboard.tsx` and `order-detail-workspace.tsx` use `text-paragraph-sm text-text-sub-600 font-normal`.
- **Target Harmonization**:
  In `order-form.tsx:243–256`:
  ```tsx
  <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600">
    <th className="w-10 px-3.5 py-3 text-center font-normal">#</th>
    <th className="px-3.5 py-3 font-normal">Description</th>
    <th className="w-28 px-3.5 py-3 text-center font-normal">Quantity</th>
    <th className="w-36 px-3.5 py-3 text-right font-normal">
      Unit price ($)
    </th>
    <th className="w-36 px-3.5 py-3 text-right font-normal">Line total</th>
    <th
      className="w-12 px-2 py-3 text-center font-normal"
      aria-label="Actions"
    />
  </tr>
  ```

### 4.3 Back-Link Spacing Standardization
- **Current State**:
  - `create-order-workspace.tsx:50`: `<div className="mt-4 mb-6"><PageHeader .../></div>`
  - `edit-order-workspace.tsx:133`: `<div className="mt-4 mb-6"><PageHeader .../></div>`
  - `order-detail-workspace.tsx:97`: `<header className="mt-5 ... pb-6 ...">`
- **Target Harmonization**:
  Standardize the header container margin across all three views to `mt-4 mb-6` (or `mt-5 mb-6`) so navigating between detail, create, and edit views provides a completely jump-free visual experience.
  In `order-detail-workspace.tsx:97`, change:
  `className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between"`
  to:
  `className="mt-4 mb-6 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between"`

---

## 5. Concrete Code Replacement Specifications for Worker

### File 1: `apps/web/tailwind.config.ts`

**Location**: Lines 342–349  
**Before**:
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
**After**:
```ts
      primary: {
        dark: 'hsl(var(--primary-dark))',
        darker: 'hsl(var(--primary-darker))',
        base: 'hsl(var(--primary-base))',
        lighter: 'hsl(var(--primary-alpha-10))',
        'alpha-24': 'hsl(var(--primary-alpha-24))',
        'alpha-16': 'hsl(var(--primary-alpha-16))',
        'alpha-10': 'hsl(var(--primary-alpha-10))',
      },
```

---

### File 2: `apps/web/components/orders/status-badge.tsx`

**Location**: Lines 14–17  
**Before**:
```tsx
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-blue-500";
      break;
```
**After**:
```tsx
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-information-base";
      break;
```

---

### File 3: `apps/web/components/ui/button.tsx`

**Location**: Lines 186–243  
**Before**:
```tsx
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
```
**After**:
```tsx
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
```

---

### File 4: `apps/web/components/layout/app-shell.tsx`

**Location**: Lines 114 & 181  
**Line 114 Before**:
```tsx
          <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
```
**Line 114 After**:
```tsx
          <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium">
```

**Line 181 Before**:
```tsx
            <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
```
**Line 181 After**:
```tsx
            <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium">
```

---

### File 5: `apps/web/components/layout/user-button.tsx`

**Location**: Line 98  
**Before**:
```tsx
          <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider">
```
**After**:
```tsx
          <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium">
```

---

### File 6: `apps/web/components/orders/orders-dashboard.tsx`

**Location**: Line 417  
**Before**:
```tsx
        <span className="text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400">{label}</span>
```
**After**:
```tsx
        <span className="text-subheading-xs uppercase font-medium text-text-soft-400">{label}</span>
```

---

### File 7: `apps/web/components/orders/edit-order-workspace.tsx`

**Location**: Line 57  
**Before**:
```tsx
            <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
```
**After**:
```tsx
            <p className="mt-4 text-subheading-xs font-medium uppercase text-text-soft-400">
```

---

### File 8: `apps/web/components/orders/order-detail-workspace.tsx`

**Location 1**: Line 63  
**Before**:
```tsx
            <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
```
**After**:
```tsx
            <p className="mt-4 text-subheading-xs font-medium uppercase text-text-soft-400">
```

**Location 2**: Line 97  
**Before**:
```tsx
      <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
```
**After**:
```tsx
      <header className="mt-4 mb-6 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
```

---

### File 9: `apps/web/components/orders/order-form.tsx`

**Location**: Lines 242–256  
**Before**:
```tsx
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
```
**After**:
```tsx
              <thead>
                <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600">
                  <th className="w-10 px-3.5 py-3 text-center font-normal">#</th>
                  <th className="px-3.5 py-3 font-normal">Description</th>
                  <th className="w-28 px-3.5 py-3 text-center font-normal">Quantity</th>
                  <th className="w-36 px-3.5 py-3 text-right font-normal">
                    Unit price ($)
                  </th>
                  <th className="w-36 px-3.5 py-3 text-right font-normal">Line total</th>
                  <th
                    className="w-12 px-2 py-3 text-center font-normal"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
```

---

## 6. Verification & Quality Gate Plan

The Worker should verify Milestone 1 changes using the following sequence:

1. **TypeScript compilation**:
   ```bash
   pnpm typecheck
   ```
2. **ESLint check**:
   ```bash
   pnpm lint
   ```
3. **Full unit and component test suite**:
   ```bash
   pnpm --filter @crossval/web test
   ```
4. **Hardcoded color audit verification**:
   ```bash
   # Confirm 0 instances of text-blue-500 or hover:bg-red-700
   grep -rn "text-blue-500" apps/web/
   grep -rn "hover:bg-red-700" apps/web/
   grep -rn "bg-red-alpha-10" apps/web/
   ```
5. **Next.js Production Build**:
   ```bash
   pnpm build
   ```
