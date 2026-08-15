# Milestone 1 Code Replacement Plans: Core Tokens, Typography & Bug Fixes

**Target Package**: `apps/web`  
**Explorer Agent**: `explorer_m1_2`  
**Milestone**: M1 (Core Tokens, Typography & Bug Fixes)  
**Status**: Ready for Worker Implementation  

---

## 1. Executive Summary & Scope

This document provides exact, actionable code replacement recipes for **Milestone 1**. The worker agent can execute these replacements directly to resolve:
1. **BUG-01**: Missing `bg-primary-lighter` token in `apps/web/tailwind.config.ts`.
2. **BUG-02**: Hardcoded Tailwind colors in `status-badge.tsx` (`text-blue-500`) and `button.tsx` (`hover:bg-red-700`).
3. **BUG-03**: `subheading-xs` and `subheading-2xs` manual `tracking-*` and `font-*` overrides across 6 component files.
4. **BUG-04**: Table header style mismatch between `order-form.tsx` line-items editor and view data tables (`Table.Head`).
5. **BUG-05**: Label font weight standardization across forms (`text-label-sm font-medium text-text-strong-950` for input labels) and section titles (`font-semibold text-text-strong-950`).
6. **BUG-06**: Back-link to page header container spacing rhythm across subpages (`mt-4 mb-6`).

All proposed changes strictly preserve business logic, form schemas, tests, and API interactions.

---

## 2. Token & Typography Foundations

### 2.1 Align UI Typography Scale Specifications

From `apps/web/tailwind.config.ts`:
- **`subheading-xs`**: `fontSize: .75rem (12px)`, `lineHeight: 1rem (16px)`, `letterSpacing: 0.04em`, `fontWeight: 500`.
- **`subheading-2xs`**: `fontSize: .6875rem (11px)`, `lineHeight: .75rem (12px)`, `letterSpacing: 0.02em`, `fontWeight: 500`.
- **`label-sm`**: `fontSize: .875rem (14px)`, `lineHeight: 1.25rem (20px)`, `letterSpacing: -0.006em`, `fontWeight: 500`.
- **`label-md`**: `fontSize: 1rem (16px)`, `lineHeight: 1.5rem (24px)`, `letterSpacing: -0.011em`, `fontWeight: 500`.

### 2.2 Standard Conventions Established

1. **Subheadings / Eyebrows / Section Labels**:
   - Eyebrows & uppercase group labels: `text-subheading-xs uppercase font-medium text-text-soft-400`
   - Micro metadata & uppercase tags: `text-subheading-2xs uppercase text-text-soft-400 font-medium`
   - **Zero manual letter-spacing classes** (`tracking-wider`, `tracking-wide` must be eliminated so the token default `0.04em` / `0.02em` applies cleanly).
   - Standard weight: `font-medium` (token default; eliminate accidental `font-semibold` in error/loading state subheadings).

2. **Labels & Headings Hierarchy**:
   - **Form Field Labels**: `text-label-sm font-medium text-text-strong-950` (via `Field` primitive / `Label.Root`).
   - **Section / Card Titles**: `text-label-md font-semibold text-text-strong-950` (e.g., Customer & Terms, Line Items, Summary Cards) or `text-label-sm font-semibold text-text-strong-950` (compact panels, modal titles, brand).
   - **Page Titles**: `text-title-h5 font-semibold text-text-strong-950 sm:text-title-h4`.

3. **Table Headers**:
   - View mode & Form edit mode data tables: `text-paragraph-sm font-medium text-text-sub-600` (or `font-normal`), `bg-bg-weak-50`, `px-3 py-2.5`, `border-b border-stroke-soft-200`.

4. **Subpage Back-Link Spacing**:
   - Top back link followed by `mt-4 mb-6` header container across `/orders/new`, `/orders/[id]`, and `/orders/[id]/edit`.

---

## 3. Worker Implementation Tasks & Exact Code Replacements

### Task 1: Add `primary.lighter` in `apps/web/tailwind.config.ts`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/tailwind.config.ts`
- **Lines**: 342–349
- **Description**: Add `lighter: 'hsl(var(--primary-alpha-10))'` to the `primary` color token group so `bg-primary-lighter` resolves correctly across user avatar and loading components.

#### Before (lines 342–349):
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

#### After:
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

### Task 2: Replace Hardcoded `text-blue-500` in `status-badge.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/orders/status-badge.tsx`
- **Lines**: 14–17
- **Description**: Replace hardcoded `text-blue-500` with the Align UI semantic token `text-information-base` for `partially_paid` status.

#### Before (lines 14–17):
```tsx
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-blue-500";
      break;
```

#### After:
```tsx
    case "partially_paid":
      statusVariant = "pending";
      dotColorClass = "text-information-base";
      break;
```

---

### Task 3: Replace Hardcoded `hover:bg-red-700` in `button.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/ui/button.tsx`
- **Lines**: 188–199
- **Description**: Replace hardcoded `hover:bg-red-700` with `hover:bg-error-dark` under `variant: 'error'`, `mode: 'filled'`.

#### Before (lines 188–199):
```ts
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
```

#### After:
```ts
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
```

---

### Task 4: Standardize `subheading-xs` in `app-shell.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/layout/app-shell.tsx`
- **Lines**: 113–117 & 180–184
- **Description**: Remove manual `tracking-wider` overrides on sidebar workspace section headers.

#### Location 1 (lines 113–117):
##### Before:
```tsx
        {!collapsed && (
          <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
            Workspace
          </p>
        )}
```
##### After:
```tsx
        {!collapsed && (
          <p className="mb-3 px-3 text-subheading-xs uppercase font-medium text-text-soft-400">
            Workspace
          </p>
        )}
```

#### Location 2 (lines 180–184):
##### Before:
```tsx
            <p className="mb-3 px-3 text-subheading-xs uppercase text-text-soft-400 font-medium tracking-wider">
              Workspace
            </p>
```
##### After:
```tsx
            <p className="mb-3 px-3 text-subheading-xs uppercase font-medium text-text-soft-400">
              Workspace
            </p>
```

---

### Task 5: Standardize `subheading-2xs` in `user-button.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/layout/user-button.tsx`
- **Lines**: 97–100
- **Description**: Remove manual `tracking-wider` override on dropdown user header label.

#### Before (lines 97–100):
```tsx
        <div className="px-2.5 py-1.5">
          <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium tracking-wider">
            Signed in as
          </p>
```

#### After:
```tsx
        <div className="px-2.5 py-1.5">
          <p className="text-subheading-2xs uppercase font-medium text-text-soft-400">
            Signed in as
          </p>
```

---

### Task 6: Standardize `subheading-xs` in `orders-dashboard.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/orders/orders-dashboard.tsx`
- **Lines**: 414–418
- **Description**: Remove manual `tracking-wide` override from KPI SummaryCard labels.

#### Before (lines 414–418):
```tsx
  return (
    <article className="relative flex flex-col rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
      <div className="flex items-center justify-between gap-3">
        <span className="text-subheading-xs uppercase font-medium tracking-wide text-text-soft-400">{label}</span>
```

#### After:
```tsx
  return (
    <article className="relative flex flex-col rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
      <div className="flex items-center justify-between gap-3">
        <span className="text-subheading-xs uppercase font-medium text-text-soft-400">{label}</span>
```

---

### Task 7: Standardize `subheading-xs` in `order-detail-workspace.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/orders/order-detail-workspace.tsx`
- **Lines**: 60–66
- **Description**: Remove manual `tracking-wider` and normalize `font-semibold` to `font-medium` in error screen subheading.

#### Before (lines 60–66):
```tsx
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-lighter/50 text-error-base ring-1 ring-inset ring-error-light">
              <RiMoneyDollarCircleLine className="size-6" />
            </span>
            <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
```

#### After:
```tsx
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-lighter/50 text-error-base ring-1 ring-inset ring-error-light">
              <RiMoneyDollarCircleLine className="size-6" />
            </span>
            <p className="mt-4 text-subheading-xs uppercase font-medium text-text-soft-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
```

---

### Task 8: Standardize `subheading-xs` in `edit-order-workspace.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/orders/edit-order-workspace.tsx`
- **Lines**: 54–60
- **Description**: Remove manual `tracking-wider` and normalize `font-semibold` to `font-medium` in error screen subheading.

#### Before (lines 54–60):
```tsx
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-lighter/50 text-error-base ring-1 ring-inset ring-error-light">
              <RiMoneyDollarCircleLine className="size-6" />
            </span>
            <p className="mt-4 text-subheading-xs font-semibold uppercase tracking-wider text-text-soft-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
```

#### After:
```tsx
            <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-error-lighter/50 text-error-base ring-1 ring-inset ring-error-light">
              <RiMoneyDollarCircleLine className="size-6" />
            </span>
            <p className="mt-4 text-subheading-xs uppercase font-medium text-text-soft-400">
              {notFound ? "Not found" : "Connection problem"}
            </p>
```

---

### Task 9: Harmonize Table Header in `order-form.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/orders/order-form.tsx`
- **Lines**: 242–256
- **Description**: Harmonize line-items editor table header typography from raw `text-subheading-2xs uppercase text-text-soft-400 font-medium` to `text-paragraph-sm text-text-sub-600 font-medium` (matching data tables).

#### Before (lines 242–256):
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

#### After:
```tsx
              <thead>
                <tr className="border-b border-stroke-soft-200 bg-bg-weak-50 text-paragraph-sm text-text-sub-600 font-medium">
                  <th className="w-10 px-3 py-2.5 text-center font-medium">#</th>
                  <th className="px-3 py-2.5 font-medium">Description</th>
                  <th className="w-28 px-3 py-2.5 text-center font-medium">Quantity</th>
                  <th className="w-36 px-3 py-2.5 text-right font-medium">
                    Unit price ($)
                  </th>
                  <th className="w-36 px-3 py-2.5 text-right font-medium">Line total</th>
                  <th
                    className="w-12 px-2 py-2.5 text-center font-medium"
                    aria-label="Actions"
                  />
                </tr>
              </thead>
```

---

### Task 10: Standardize Back-Link & Header Spacing in `order-detail-workspace.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/orders/order-detail-workspace.tsx`
- **Lines**: 88–98
- **Description**: Standardize top header container spacing from `mt-5 ... pb-6` to `mt-4 mb-6 ... pb-6` to match `/orders/new` and `/orders/[orderId]/edit`.

#### Before (lines 88–98):
```tsx
    <AppShell viewer={viewer}>
      <Link
        className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
        href="/orders"
      >
        <RiArrowLeftLine className="size-4" />
        All orders
      </Link>

      <header className="mt-5 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
```

#### After:
```tsx
    <AppShell viewer={viewer}>
      <Link
        className="inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 outline-none transition hover:text-text-strong-950 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
        href="/orders"
      >
        <RiArrowLeftLine className="size-4" />
        All orders
      </Link>

      <header className="mt-4 mb-6 flex flex-col gap-5 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
```

---

### Task 11: Standardize `ModalTitle` Font Weight in `components/ui/modal.tsx`

- **File**: `/Users/aryandahiya/Desktop/Programming/crossval/apps/web/components/ui/modal.tsx`
- **Lines**: 131–138
- **Description**: Ensure `ModalTitle` defaults to `font-semibold` matching section and dialog titles across the system.

#### Before (lines 131–138):
```tsx
const ModalTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Title
      ref={forwardedRef}
      className={cnExt('text-label-sm text-text-strong-950', className)}
      {...rest}
    />
  );
});
```

#### After:
```tsx
const ModalTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...rest }, forwardedRef) => {
  return (
    <DialogPrimitive.Title
      ref={forwardedRef}
      className={cnExt('text-label-sm font-semibold text-text-strong-950', className)}
      {...rest}
    />
  );
});
```

---

## 4. Verification Method

Once the worker executes the replacements above, run the following commands in sequence:

```bash
# 1. Typecheck: Verify 0 type errors across all packages
pnpm typecheck

# 2. Lint: Verify 0 ESLint errors and 0 warnings
pnpm lint

# 3. Build: Verify Next.js build succeeds cleanly
pnpm build

# 4. Web Test Suite: Verify all 127 tests pass
pnpm --filter @crossval/web test
```

### Forensic Checks:
- **Grep for raw tracking on subheadings**:
  `git grep "text-subheading-xs.*tracking-" apps/web` -> Must return 0 results.
  `git grep "text-subheading-2xs.*tracking-" apps/web` -> Must return 0 results.
- **Grep for raw blue/red color tokens**:
  `git grep "text-blue-500" apps/web` -> Must return 0 results.
  `git grep "hover:bg-red-700" apps/web` -> Must return 0 results.
- **Verify `bg-primary-lighter` resolution**:
  Check that `primary.lighter` is defined in `apps/web/tailwind.config.ts`.
