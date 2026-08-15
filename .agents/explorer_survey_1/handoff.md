# Reference Survey & Design Playbook Handoff Report

**Investigator**: Explorer 1  
**Working Directory**: `/Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_survey_1/`  
**Reference Project**: `/Users/aryandahiya/Desktop/Programming/crossval-tracker`  
**Target Project**: `/Users/aryandahiya/Desktop/Programming/crossval` (`apps/web`)  
**Date**: 2026-08-16  

---

## 1. Observation

A line-by-line inspection of the reference project `/Users/aryandahiya/Desktop/Programming/crossval-tracker` and comparison against `/Users/aryandahiya/Desktop/Programming/crossval` revealed the following concrete architectural, token, and component design patterns.

### 1.1 Tailwind Configuration & Token System

#### Reference Project (`crossval-tracker/apps/web/tailwind.config.ts` lines 6–87, `src/theme/tokens.ts` lines 9–71, `app/styles.css` lines 5–83)
- **Token Modularization**: Tokens are extracted into a dedicated `tokens.ts` exporting `texts`, `borderRadii`, and `shadows`.
- **Dynamic HSL Alpha Function**:
  ```ts
  const hsl = (token: string) => `hsl(var(${token}) / <alpha-value>)`;
  ```
- **CSS Variable Definitions**: Defined as raw HSL channel triplets (without `hsl(...)` wrapper or hardcoded alpha inside the variable):
  ```css
  --bg-strong: 222 32% 8%;
  --bg-surface: 224 17% 16%;
  --bg-sub: 219 15% 82%;
  --bg-soft: 220 18% 90%;
  --bg-weak: 216 33% 97%;
  --bg-white: 0 0% 100%;

  --text-strong: 222 32% 8%;
  --text-sub: 222 11% 36%;
  --text-soft: 220 11% 64%;
  --text-disabled: 219 15% 82%;
  --text-white: 0 0% 100%;

  --stroke-strong: 222 32% 8%;
  --stroke-sub: 219 15% 82%;
  --stroke-soft: 220 18% 90%;

  --primary-darker: 228 71% 32%;
  --primary-base: 228 70% 24%;
  --primary-alpha: 228 100% 64% / 16%;
  --primary-lighter: 222 100% 96%;

  --success-dark: 148 73% 16%;
  --success-base: 148 72% 44%;
  --success-lighter: 148 72% 93%;
  --warning-dark: 24 70% 24%;
  --warning-base: 24 100% 64%;
  --warning-lighter: 24 100% 96%;
  --error-dark: 355 70% 24%;
  --error-base: 355 96% 60%;
  --error-lighter: 357 100% 96%;
  --information-dark: 228 70% 24%;
  --information-base: 228 100% 60%;
  --information-lighter: 222 100% 96%;
  --overlay: 209 84% 5% / 32%;
  ```
- **Dual Semantic & Numeric Key Mapping**: The config maps both semantic aliases and numeric variants to the same CSS variables:
  - `bg.strong` & `bg['strong-950']` → `hsl(var(--bg-strong) / <alpha-value>)`
  - `bg.white` & `bg['white-0']` → `hsl(var(--bg-white) / <alpha-value>)`
  - `stroke.soft` & `stroke['soft-200']` → `hsl(var(--stroke-soft) / <alpha-value>)`
  - `primary.lighter` → `hsl(var(--primary-lighter) / <alpha-value>)` (allows `bg-primary-lighter/60`, `ring-primary-base/20`, etc.)
- **Border Radii Tokens (`src/theme/tokens.ts` lines 51–56)**:
  - `'10'`: `'.625rem'` (10px) — standard for inputs, medium buttons, brand mark, segment pills
  - `'12'`: `'.75rem'` (12px) — standard for toast items, sub-cards, table wrappers
  - `'16'`: `'1rem'` (16px) — standard for auth preview cards, large containers
  - `'20'`: `'1.25rem'` (20px) — standard for modal dialogs, drawers, auth preview shell
- **Shadow Tokens (`src/theme/tokens.ts` lines 58–70)**:
  - `regular-xs`: `'0 1px 2px 0 #0a0d1408'`
  - `regular-sm`: `'0 2px 4px #1b1c1d0a'`
  - `regular-md`: `'0 16px 32px -12px #0e121b1a'`
  - `button-primary-focus`: `'0 0 0 2px hsl(var(--bg-white)), 0 0 0 4px hsl(var(--primary-alpha))'`
  - `button-important-focus`: `'0 0 0 2px hsl(var(--bg-white)), 0 0 0 4px hsl(var(--text-strong) / 16%)'`
  - `button-error-focus`: `'0 0 0 2px hsl(var(--bg-white)), 0 0 0 4px hsl(var(--error-base) / 16%)'`
  - `fancy-buttons-neutral`: `'0 1px 2px 0 #1b1c1d7a, 0 0 0 1px #242628'`
  - `fancy-buttons-primary`: `'0 1px 2px 0 #0e121b3d, 0 0 0 1px hsl(var(--primary-base))'`
  - `fancy-buttons-stroke`: `'0 1px 3px 0 #0e121b1f, 0 0 0 1px hsl(var(--stroke-soft))'`
  - `tooltip`: `'0 12px 24px 0 #0e121b0f, 0 1px 2px 0 #0e121b08'`

#### Target Project State (`crossval/apps/web/tailwind.config.ts`, `app/globals.css`)
- `tailwind.config.ts` currently defines colors without `/ <alpha-value>`, which causes syntax errors or transparency failures when using arbitrary opacity modifiers like `bg-primary-lighter/60`.
- In `crossval`, `primary.lighter` was configured as `hsl(var(--primary-alpha-10))`. In `globals.css`, `--primary-alpha-10` is defined as `var(--neutral-alpha-10)` which already contains `/ 10%`, breaking any additional opacity modifier.
- Missing border radii: `borderRadii` in `crossval` only defines `'10'` and `'20'`, missing `'12'` and `'16'`.
- Duplicate `cn` utilities:
  - `crossval/apps/web/utils/cn.ts` contains `customTwMerge` with `twMergeConfig`.
  - `crossval/apps/web/lib/cn.ts` contains raw `twMerge` without `twMergeConfig`, which was imported in `order-action-bar.tsx`, `order-lock-banner.tsx`, `orders-toolbar.tsx`, and `payment-dialog.tsx`.

---

### 1.2 Typography Hierarchy & Scale

#### 22-Token AlignUI Typography Scale (exact definitions from `tokens.ts`)
| Token | Font Size | Line Height | Letter Spacing | Font Weight | Typical Usage |
|---|---|---|---|---|---|
| `title-h1` | 3.5rem (56px) | 4rem (64px) | -0.01em | 500 / 600 | Marketing / splash headers |
| `title-h2` | 3rem (48px) | 3.5rem (56px) | -0.01em | 500 / 600 | Auth hero headers |
| `title-h3` | 2.5rem (40px) | 3rem (48px) | -0.01em | 500 / 600 | Large desktop KPI figures |
| `title-h4` | 2rem (32px) | 2.5rem (40px) | -0.005em | 500 / 600 | Page titles (`PageHeader`), modal titles, KPI values |
| `title-h5` | 1.5rem (24px) | 2rem (32px) | 0em | 500 / 600 | Section titles, subheadings, mobile page headers |
| `title-h6` | 1.25rem (20px) | 1.75rem (28px) | 0em | 500 / 600 | Card titles, widget headers |
| `label-xl` | 1.5rem (24px) | 2rem (32px) | -0.015em | 500 | Large interactive labels |
| `label-lg` | 1.125rem (18px) | 1.5rem (24px) | -0.015em | 500 | Drawer titles, navigation section titles |
| `label-md` | 1rem (16px) | 1.5rem (24px) | -0.011em | 500 | Modal titles, form section headings |
| `label-sm` | 0.875rem (14px) | 1.25rem (20px) | -0.006em | 500 | Button text, input labels, table cell links, nav items |
| `label-xs` | 0.75rem (12px) | 1rem (16px) | 0em | 500 | Badges, status pills, compact button labels, tags |
| `paragraph-xl` | 1.5rem (24px) | 2rem (32px) | -0.015em | 400 | Editorial lead text |
| `paragraph-lg` | 1.125rem (18px) | 1.5rem (24px) | -0.015em | 400 | Large body text, blockquotes |
| `paragraph-md` | 1rem (16px) | 1.5rem (24px) | -0.011em | 400 | Standard descriptive text |
| `paragraph-sm` | 0.875rem (14px) | 1.25rem (20px) | -0.006em | 400 | Table cell content, input values, body copy |
| `paragraph-xs` | 0.75rem (12px) | 1rem (16px) | 0em | 400 | Hints, timestamps, metadata, helper descriptions |
| `subheading-md` | 1rem (16px) | 1.5rem (24px) | 0.06em | 500 | Uppercase group header |
| `subheading-sm` | 0.875rem (14px) | 1.25rem (20px) | 0.06em | 500 | Uppercase section tag |
| `subheading-xs` | 0.75rem (12px) | 1rem (16px) | 0.04em | 500 | Eyebrows, sidebar group labels, KPI labels |
| `subheading-2xs` | 0.6875rem (11px) | 0.75rem (12px) | 0.02em | 500 | Micro tags, mobile metric keys, tiny badge dots |

#### Observed Typography Inconsistencies in `crossval`
1. `subheading-xs` has `letterSpacing: '0.04em'` built into the token, but is used with contradictory manual tracking classes:
   - `app-shell.tsx` & `user-button.tsx`: `text-subheading-xs uppercase font-medium tracking-wider`
   - `orders-dashboard.tsx`: `text-subheading-xs uppercase font-medium tracking-wide`
   - `auth-shell.tsx` & `page-header.tsx`: `text-subheading-xs uppercase font-medium` (no tracking)
   - `order-detail-workspace.tsx` (line 63): `text-subheading-xs font-semibold uppercase tracking-wider`
2. Form edit mode line-items header (`order-form.tsx` line 243) vs view mode table header (`table.tsx` line 36):
   - `order-form.tsx`: raw `th` with `text-paragraph-sm font-medium text-text-sub-600`
   - `table.tsx` in `crossval`: `TableHead` with `bg-bg-weak-50 px-3 py-2 text-left text-paragraph-sm text-text-sub-600 first:rounded-l-lg last:rounded-r-lg` (rounded floating head)
   - In `crossval-tracker`, both view mode and edit mode use clean border-bottom table headers: `bg-bg-weak-50 px-3.5 py-3 text-left text-paragraph-sm text-text-sub-600 font-semibold whitespace-nowrap`.
3. Mixed label font weights: `label-sm` defaults to `fontWeight: 500`, but some places add `font-semibold` while others use `font-medium`.

---

### 1.3 Component Anatomy & Styling Patterns in Reference Tracker

#### 1. Button Architecture (`button.tsx`, `fancy-button.tsx`, `compact-button.tsx`, `icon-button.tsx`)
- **`ButtonRoot`**:
  - `variant`: `primary` (bg-primary-base), `neutral` (bg-bg-strong-950), `error` (bg-error-base)
  - `mode`:
    - `filled`: solid background, white text (`text-text-white`)
    - `stroke`: white background (`bg-bg-white`), semantic text color, `ring-1 ring-inset ring-stroke-soft-200` (or semantic ring), `shadow-regular-xs`
    - `lighter`: tinted background (`bg-primary-lighter`, `bg-bg-weak-50`, `bg-error-lighter`), semantic text, hover to white with ring
    - `ghost`: transparent background, hover to weak background
  - `size`:
    - `medium`: `h-10 gap-2.5 rounded-10 px-3.5 text-label-sm`
    - `small`: `h-9 gap-2 rounded-lg px-3 text-label-sm`
    - `xsmall`: `h-8 gap-2 rounded-lg px-2.5 text-label-sm`
    - `xxsmall`: `h-7 gap-1.5 rounded-lg px-2 text-label-xs`
- **`FancyButton`**:
  - Adds luxurious top edge highlight via CSS mask:
    `before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:bg-gradient-to-b before:p-px before:from-white/20 before:to-transparent before:mask-exclude before:bg-origin-border`
  - Adds ambient top sheen: `after:bg-gradient-to-b after:from-white after:to-transparent after:opacity-10 hover:after:opacity-20`
  - Uses specific box-shadows: `shadow-fancy-buttons-primary`, `shadow-fancy-buttons-neutral`, `shadow-fancy-buttons-stroke`
- **`CompactButton`**:
  - `size-7` (large), `size-6` (medium), `size-5` (small)
  - Used for icon actions, modal closes, and sidebar collapse toggle.

#### 2. Status Badge & Badges (`status-badge.tsx`, `badge.tsx`)
- **`StatusBadge`**:
  - Container: `inline-flex h-6 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-label-xs font-medium`
  - Dot: `dot -mx-0.5 flex size-3.5 items-center justify-center before:size-1.5 before:rounded-full before:bg-current`
  - Status color pairings:
    - `favorable` / `paid` / `completed`: `bg-success-lighter text-success-dark`
    - `unfavorable` / `overdue` / `failed`: `bg-error-lighter text-error-dark`
    - `neutral` / `pending`: `bg-bg-weak-50 text-text-sub-600`
    - `open` / `partially_paid`: `bg-information-lighter text-information-dark`
    - `locked`: `bg-bg-weak-50 text-text-soft-400`
  - Stroke variant: `bg-bg-white text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200`

#### 3. Form Inputs & Selects (`input.tsx`, `select.tsx`, `segmented-control.tsx`)
- **`Input`**:
  - Multi-layer slot architecture: `Input.Root` (outer wrapper with inset ring pseudoelement `before:ring-1 before:ring-inset before:ring-stroke-soft-200`) -> `Input.Wrapper` -> `Input.Input` + `Input.Icon` / `Input.Affix`
  - Focus state: `has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong-950`
  - Error state: `before:ring-error-base has-[input:focus]:shadow-button-error-focus`
- **`Select`**:
  - Radix Trigger: `min-w-0 shrink-0 bg-bg-white shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 text-paragraph-sm text-text-strong hover:bg-bg-weak-50 focus:shadow-button-important-focus focus:ring-stroke-strong-950`
  - Content Popover: `rounded-2xl bg-bg-white shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 p-1.5`
- **`SegmentedControl`**:
  - Container: `inline-flex items-center gap-1 rounded-10 bg-bg-weak-50 p-1 ring-1 ring-inset ring-stroke-soft-200/50`
  - Tab trigger: `h-7 whitespace-nowrap rounded-md px-3 text-label-xs font-medium text-text-sub-600 hover:text-text-strong data-[state=active]:bg-bg-white data-[state=active]:text-text-strong data-[state=active]:shadow-regular-xs`

#### 4. Card & Widget Containers (`widget-box.tsx`, `kpi-cards.tsx`, `reviewer-guide.tsx`, `sample-data-cta.tsx`)
- **`WidgetBox`**:
  - `rounded-2xl bg-bg-white p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200`
  - KPI Card treatment:
    - Container: `WidgetBox.Root className="space-y-3 transition-shadow duration-200 hover:shadow-regular-sm"`
    - Header: `flex items-center justify-between` with eyebrow label `text-subheading-xs uppercase font-semibold tracking-wider text-text-sub-600` (or `text-text-soft-400 font-medium`) and semantic icon bubble.
    - Semantic icon bubble: `grid size-9 place-items-center rounded-xl ring-1 ring-inset`
      - Primary: `bg-primary-lighter text-primary-base ring-primary-base/20`
      - Amber/Warning: `bg-amber-50 text-amber-600 ring-amber-500/20` (or `bg-warning-lighter text-warning-base`)
      - Emerald/Success: `bg-emerald-50 text-emerald-600 ring-emerald-500/20`
      - Rose/Error: `bg-rose-50 text-rose-600 ring-rose-500/20`
    - Metric Value: `text-title-h4 font-semibold tabular-nums text-text-strong tracking-tight sm:text-title-h3`
    - Metric Subtitle: `text-paragraph-xs text-text-sub-600`
- **Sample Data CTA Card**:
  - `p-6 rounded-2xl border-dashed border-2 border-primary-base/30 bg-primary-lighter/10` with icon bubble `size-12 rounded-xl bg-primary-lighter text-primary-base`.

#### 5. Data Tables (`table.tsx`, `actuals-table.tsx`, `report-table.tsx`)
- **Table Container**: `overflow-hidden rounded-2xl bg-bg-white shadow-regular-xs border border-stroke-soft-200`
- **Header**: `border-b border-stroke-soft-200` with `TableHead`: `bg-bg-weak-50 px-3.5 py-3 text-left text-paragraph-sm text-text-sub-600 font-semibold whitespace-nowrap`
- **Body Rows**: `divide-y divide-stroke-soft-200`, `TableRow`: `group/row transition-colors hover:bg-bg-weak-50/50`
- **Cells**: `h-12 px-3.5 py-2.5 text-paragraph-sm text-text-strong`
- **Footer Summary Bar**: `flex items-center justify-between border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-3`

#### 6. Modal Dialogs & Drawers (`modal.tsx`, `drawer.tsx`)
- **`Modal`**:
  - Backdrop: `fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-overlay p-4 backdrop-blur-[10px]`
  - Dialog Frame: `relative w-full max-w-[420px] rounded-20 bg-bg-white shadow-regular-md ring-1 ring-inset ring-stroke-soft-200 focus:outline-none`
  - Header: `relative flex items-start gap-3.5 border-b border-stroke-soft-200 p-5 pr-12`
  - Title: `text-label-md font-medium text-text-strong`
  - Description: `text-paragraph-xs text-text-sub-600`
  - Body: `p-5`
  - Footer: `flex items-center justify-end gap-3 border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-4 rounded-b-20`
- **`Drawer`**:
  - Backdrop: `fixed inset-0 z-50 grid grid-cols-1 place-items-end overflow-hidden bg-overlay backdrop-blur-[2px]`
  - Content Frame: `size-full max-w-[420px] overflow-y-auto border-l border-stroke-soft-200 bg-bg-white shadow-regular-md`

#### 7. Layout Rhythm & Spacing
- **Sidebar**: Fixed 272px expanded / 82px collapsed, `border-r border-stroke-soft-200 bg-bg-white`, smooth `transition-all duration-300 ease-out`. Active navigation link highlighted with left pill `absolute -left-5 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-base`.
- **Page Container**: `mx-auto w-full max-w-[1220px] px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-8` (or `max-w-[1440px]`).
- **Section Spacing**: `space-y-6` between major sections (PageHeader → KPI Cards → Filters/Toolbar → Table).
- **Back Navigation Link**: `inline-flex items-center gap-1.5 rounded-lg text-paragraph-sm font-medium text-text-sub-600 hover:text-text-strong-950 mb-5`.

---

## 2. Logic Chain

1. **Premise 1 (Token Engine)**: The visual disparity between `crossval-tracker` and `crossval` begins with how Tailwind color tokens and alpha opacity modifiers are resolved.
   - *Observation*: `crossval-tracker` uses `hsl(var(--token) / <alpha-value>)` for all colors and pure HSL triplet CSS variables (`222 32% 8%`).
   - *Inference*: `crossval` fails on `bg-primary-lighter/60` and `bg-bg-weak-50/50` because `crossval/apps/web/tailwind.config.ts` wraps variables in fixed `hsl(var(...))` without the alpha-value placeholder, and `--primary-lighter` / `--primary-alpha-10` already contains `/ 10%`.
   - *Actionable Step*: Align `crossval/apps/web/tailwind.config.ts` and `app/globals.css` with tracker's clean HSL definitions and dual token alias mapping.

2. **Premise 2 (Typography Harmonization)**: AlignUI specifies exact tracking and weights inside token definitions.
   - *Observation*: `texts['subheading-xs']` has `letterSpacing: '0.04em'` and `fontWeight: '500'`.
   - *Inference*: Adding manual tracking classes like `tracking-wider` or `tracking-wide` creates conflicting letter-spacing across screens. Standardizing to `text-subheading-xs uppercase font-medium` (or simply `text-subheading-xs uppercase`) produces 100% visual consistency.

3. **Premise 3 (Table Architecture)**: Table rows in `crossval` currently use a custom card-row style with spacing `<tbody>` that diverges from standard SaaS financial tables and conflicts with the line items editor in `order-form.tsx`.
   - *Observation*: `crossval-tracker` encapsulates tables in `overflow-hidden rounded-2xl bg-bg-white shadow-regular-xs border border-stroke-soft-200` with `divide-y divide-stroke-soft-200` rows and subtle hover `group-hover/row:bg-bg-weak-50/50`.
   - *Inference*: Adopting tracker's table pattern harmonizes the main orders ledger, order detail line items, and order creation form into one unified aesthetic.

4. **Premise 4 (Card & Metric Elevation)**: The KPI scorecard in `orders-dashboard.tsx` uses plain rounded rectangles without hover depth or semantic icon treatments.
   - *Observation*: Tracker's `KPICards` uses `WidgetBox.Root` with `hover:shadow-regular-sm`, `size-9 rounded-xl ring-1 ring-inset` semantic icon bubbles (primary, amber, emerald, rose), and bold `title-h4`/`title-h3` tabular numerals.
   - *Inference*: Upgrading `orders-dashboard.tsx` `SummaryCard` and `order-detail-workspace.tsx` financial scorecards to this pattern delivers immediate visual elevation.

5. **Premise 5 (Modal & Dialog Polish)**: Modals in `crossval` lack inset rings, border-bottom headers, and shaded footers.
   - *Observation*: Tracker's `ModalContent` has `ring-1 ring-inset ring-stroke-soft-200`, `ModalHeader` has `border-b border-stroke-soft-200 p-5 pr-12`, and `ModalFooter` has `bg-bg-weak-50/50 border-t border-stroke-soft-200 rounded-b-20`.
   - *Inference*: Updating `modal.tsx` brings `PaymentDialog`, `OrderDeleteDialog`, and any future dialogs up to production standard.

6. **Premise 6 (Utility Consolidation)**: `crossval/apps/web/lib/cn.ts` lacks custom AlignUI twMerge configuration.
   - *Observation*: `apps/web/utils/cn.ts` properly configures `extendTailwindMerge` with `texts`, `shadows`, and `borderRadii`.
   - *Inference*: Having four components import `lib/cn.ts` creates potential class merge stripping bugs. `lib/cn.ts` should re-export or alias `utils/cn.ts`.

---

## 3. Caveats

1. **Visual-Only Scope**: All proposed design improvements must be strictly visual/CSS/layout enhancements. No backend API schemas, validation rules, integer-cents calculations, or contract interfaces may be modified.
2. **Component Library Invariance**: Do not install external component libraries (e.g. shadcn, radix-themes). All components must use the existing Align UI primitives in `apps/web/components/ui/`.
3. **Icons Constraint**: Only RemixIcon (`@remixicon/react`) should be used.
4. **Test Invariance**: All 127 existing vitest tests in `apps/web` must remain 100% passing.

---

## 4. Conclusion & Comprehensive Design Playbook

### 4.1 Token Mapping & Comparison Table

| Category | Align UI Semantic Token | Raw Value (Light Mode) | Tailwind Class | `crossval` Current State | Target State / Fix |
|---|---|---|---|---|---|
| **Background** | `bg-white` / `bg-white-0` | `hsl(0 0% 100%)` | `bg-bg-white-0` | `hsl(var(--bg-white-0))` | Support both `bg-bg-white` & `bg-bg-white-0` via `hsl(var(--bg-white) / <alpha-value>)` |
| | `bg-weak` / `bg-weak-50` | `hsl(216 33% 97%)` | `bg-bg-weak-50` | `hsl(var(--bg-weak-50))` | Standard page background & subtle table header bg |
| | `bg-soft` / `bg-soft-200` | `hsl(220 18% 90%)` | `bg-bg-soft-200` | `hsl(var(--bg-soft-200))` | Skeleton loaders & divider fills |
| | `bg-sub` / `bg-sub-300` | `hsl(219 15% 82%)` | `bg-bg-sub-300` | `hsl(var(--bg-sub-300))` | Darker subtle fills & scrollbars |
| | `bg-surface` / `bg-surface-800` | `hsl(224 17% 16%)` | `bg-bg-surface-800`| `hsl(var(--bg-surface-800))` | Dark surface overlays, tooltips |
| | `bg-strong` / `bg-strong-950` | `hsl(222 32% 8%)` | `bg-bg-strong-950` | `hsl(var(--bg-strong-950))` | Dark buttons & heavy headers |
| **Text** | `text-strong` / `text-strong-950` | `hsl(222 32% 8%)` | `text-text-strong-950` | `hsl(var(--text-strong-950))` | Primary headings, titles, active nav links, strong values |
| | `text-sub` / `text-sub-600` | `hsl(222 11% 36%)` | `text-text-sub-600` | `hsl(var(--text-sub-600))` | Secondary text, descriptions, table cell body |
| | `text-soft` / `text-soft-400` | `hsl(220 11% 64%)` | `text-text-soft-400` | `hsl(var(--text-soft-400))` | Placeholders, eyebrows, inactive icons, timestamps |
| | `text-disabled` / `disabled-300` | `hsl(219 15% 82%)` | `text-text-disabled-300`| `hsl(var(--text-disabled-300))`| Disabled form inputs and buttons |
| | `text-white` / `text-white-0` | `hsl(0 0% 100%)` | `text-text-white-0` | `hsl(var(--text-white-0))` | Text on dark buttons & primary badges |
| **Stroke** | `stroke-soft` / `soft-200` | `hsl(220 18% 90%)` | `ring-stroke-soft-200` | `hsl(var(--stroke-soft-200))` | Standard card borders, table dividers, input borders |
| | `stroke-sub` / `sub-300` | `hsl(219 15% 82%)` | `ring-stroke-sub-300` | `hsl(var(--stroke-sub-300))` | Hover border states |
| | `stroke-strong` / `strong-950` | `hsl(222 32% 8%)` | `ring-stroke-strong-950`| `hsl(var(--stroke-strong-950))`| Focus ring borders |
| **Primary** | `primary-base` | `hsl(228 70% 24%)` | `bg-primary-base` | `hsl(var(--primary-base))` | Primary buttons, active nav indicators |
| | `primary-darker` | `hsl(228 71% 32%)` | `hover:bg-primary-darker`| `hsl(var(--primary-darker))` | Primary button hover |
| | `primary-lighter` | `hsl(222 100% 96%)` | `bg-primary-lighter` | **UNDEFINED / BUG** | Define in `tailwind.config.ts` mapped to `hsl(var(--primary-lighter) / <alpha-value>)` |
| | `primary-alpha` | `hsl(228 100% 64% / 16%)` | `bg-primary-alpha` | `hsl(var(--primary-alpha-16))`| Focus rings, selections |
| **Semantic** | `success-base` | `hsl(148 72% 44%)` | `text-success-base` | `hsl(var(--success-base))` | Completed, paid, favorable |
| | `success-lighter` | `hsl(148 72% 93%)` | `bg-success-lighter` | `hsl(var(--success-lighter))` | Completed badge background |
| | `warning-base` | `hsl(24 100% 64%)` | `text-warning-base` | `hsl(var(--warning-base))` | Pending status, warning |
| | `warning-lighter` | `hsl(24 100% 96%)` | `bg-warning-lighter` | `hsl(var(--warning-lighter))` | Pending badge background |
| | `error-base` | `hsl(355 96% 60%)` | `text-error-base` | `hsl(var(--error-base))` | Overdue, failed, danger |
| | `error-lighter` | `hsl(357 100% 96%)` | `bg-error-lighter` | `hsl(var(--error-lighter))` | Overdue badge background |
| | `information-base` | `hsl(228 100% 60%)` | `text-information-base` | `text-blue-500` (**BUG**) | Replace `text-blue-500` with `text-information-base` |
| | `information-lighter`| `hsl(222 100% 96%)` | `bg-information-lighter` | `hsl(var(--information-lighter))`| Partially paid badge bg |
| **Border Radius**| `'10'` | `0.625rem` (10px) | `rounded-10` | Defined | Inputs, buttons, segmented controls |
| | `'12'` | `0.75rem` (12px) | `rounded-12` | **MISSING** | Add `'12': '.75rem'` to `tailwind.config.ts` |
| | `'16'` | `1rem` (16px) | `rounded-16` | **MISSING** | Add `'16': '1rem'` to `tailwind.config.ts` |
| | `'20'` | `1.25rem` (20px) | `rounded-20` | Defined | Modals, drawers, auth preview cards |

---

### 4.2 Actionable Implementation Playbook

#### Step 1: Token Engine & Tailwind Config Modernization
1. Update `apps/web/tailwind.config.ts`:
   - Add the dynamic `hsl` helper: `const hsl = (token: string) => \`hsl(var(\${token}) / <alpha-value>)\`;`
   - Map all color keys using the `hsl(...)` helper so opacity modifiers (`/60`, `/50`, `/20`) work universally.
   - Define `primary.lighter: hsl('--primary-lighter')` and alias `bg['white-0']`, `bg.white`, `text['strong-950']`, etc.
   - Add border radii: `'12': '.75rem'`, `'16': '1rem'`.
2. Update `apps/web/app/globals.css`:
   - Add pure HSL channel variables in `:root` and `.dark` (`--primary-lighter: 222 100% 96%`, `--overlay: 209 84% 5% / 32%`, etc.).
   - Add optical RemixIcon alignment: `.remixicon path { transform: scale(0.8996); transform-origin: center; }`.
   - Add tabular numerals utility: `.tabular-nums { font-variant-numeric: tabular-nums; }`.
3. Harmonize `cn`:
   - Point `apps/web/lib/cn.ts` to re-export `cn` and `cnExt` from `apps/web/utils/cn.ts` so all components benefit from `twMergeConfig`.

#### Step 2: Typography Standardizations
1. Audit and standardize all `subheading-xs` occurrences across `app-shell.tsx`, `user-button.tsx`, `orders-dashboard.tsx`, `auth-shell.tsx`, `page-header.tsx`, and `order-detail-workspace.tsx`:
   - Use `text-subheading-xs uppercase font-medium` consistently.
   - Remove manual `tracking-wider` and `tracking-wide` overrides.
2. Standardize `label-sm` font weight:
   - Base label font weight is `500` (`font-medium`). Only use `font-semibold` on primary titles/emphasis values.
3. Standardize Table Headers:
   - Use `bg-bg-weak-50 px-3.5 py-3 text-left text-paragraph-sm text-text-sub-600 font-semibold whitespace-nowrap` across both view mode data tables and form line items editor.

#### Step 3: Component Elevation
1. **Summary / KPI Cards** (`orders-dashboard.tsx`):
   - Wrap in `rounded-2xl bg-bg-white-0 p-5 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 hover:shadow-regular-sm transition-shadow duration-200`.
   - Upgrade icon bubbles to `grid size-9 place-items-center rounded-xl ring-1 ring-inset` with semantic color pairs (`primary-lighter/text-primary-base`, `warning-lighter/text-warning-base`, `success-lighter/text-success-base`, `error-lighter/text-error-base`).
   - Format metrics in `text-title-h4 font-semibold tabular-nums text-text-strong-950 tracking-tight sm:text-title-h3`.
2. **Data Tables** (`table.tsx`, `orders-dashboard.tsx`, `order-detail-workspace.tsx`, `order-form.tsx`):
   - Wrap table in `overflow-hidden rounded-2xl bg-bg-white-0 shadow-regular-xs border border-stroke-soft-200`.
   - Structure `TableHead` and `TableCell` with consistent row padding (`px-3.5 py-2.5 h-12`).
   - Row hover effect: `group-hover/row:bg-bg-weak-50/50`.
   - Add clean pagination/footer bar with `border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-3`.
3. **Modal Dialogs & Payment Dialog** (`modal.tsx`, `payment-dialog.tsx`, `order-delete-dialog.tsx`):
   - Ensure `ModalContent` has `ring-1 ring-inset ring-stroke-soft-200 rounded-20 bg-bg-white-0 shadow-regular-md`.
   - Header with `border-b border-stroke-soft-200 p-5 pr-12`, title `text-label-md font-medium text-text-strong-950`.
   - Footer with `border-t border-stroke-soft-200 bg-bg-weak-50/50 px-5 py-4 rounded-b-20 flex justify-end gap-3`.
4. **Status Badges** (`status-badge.tsx`):
   - Fix `partially_paid` to use `text-information-base` / `bg-information-lighter text-information-dark` instead of hardcoded `text-blue-500`.
5. **Loading States & Skeleton Loaders** (`loading-state.tsx`, `skeleton.tsx`):
   - Ensure `LoadingSpinner` bubble uses `rounded-2xl bg-primary-lighter/60 text-primary-base ring-1 ring-inset ring-primary-base/20`.
6. **Spacing & Back Links**:
   - Standardize back link margin to `mb-5` across `/orders/new`, `/orders/[orderId]/edit`, and `/orders/[orderId]`.
   - Standardize page section gap to `space-y-6`.

---

## 5. Verification Method

To independently verify the recommendations and changes:

1. **Automated Test Suite**:
   ```bash
   pnpm --filter @crossval/web test
   ```
   *Expected outcome*: All 127 existing unit/integration tests pass with 0 failures.

2. **Typecheck & Linting**:
   ```bash
   pnpm typecheck && pnpm lint
   ```
   *Expected outcome*: Zero TypeScript diagnostics and zero ESLint errors/warnings.

3. **Workspace Build**:
   ```bash
   pnpm build
   ```
   *Expected outcome*: Clean production build across all workspace packages (`@crossval/contracts`, `@crossval/api`, `@crossval/web`).

4. **Hardcoded Color Audit**:
   ```bash
   grep -rn "text-blue-500\|bg-gray-\|text-gray-\|bg-red-\|hover:bg-red-" apps/web/
   ```
   *Expected outcome*: Zero hardcoded Tailwind palette matches in application code; all colors use Align UI tokens.

5. **Token Resolution Audit**:
   Verify in generated CSS / DOM that `bg-primary-lighter`, `bg-bg-weak-50/50`, `ring-primary-base/20`, and `text-information-base` render valid computed HSL color values with correct alpha channels.

