# Frontend Architecture Survey Report: CrossVal Orders & Settlements

**Survey Date**: 2026-08-14 / 2026-08-15  
**Surveyor**: Frontend Codebase Explorer (`explorer_frontend_survey_1`)  
**Target Repository**: CrossVal Orders & Settlements (`apps/web`, `packages/contracts`, `apps/api`)  
**Status**: Phases 1–7 Complete; Phase 8 (Order Lifecycle) & Phase 9 (Settlement UX Polish) Surveyed  

---

## 1. Executive Summary & Readiness Scorecard

A thorough investigation of the `apps/web` application, its `@crossval/contracts` package dependencies, and the underlying `@crossval/api` endpoints was conducted. 

### Architecture Readiness Matrix

| Functional Area | Current Status | Backend API Readiness | Contracts Readiness | Frontend Gaps / Work Remaining |
| :--- | :--- | :--- | :--- | :--- |
| **`/orders/new` (Order Creation)** | ❌ **Not Implemented** | ✅ Complete (`POST /orders`, 201) | ✅ Complete (`createOrderRequestSchema`) | Missing route, order form component, `useFieldArray` line items, dynamic live subtotal preview, `useCreateOrder` mutation, dashboard navigation link. |
| **`/orders/[orderId]/edit` (Order Edit)** | ❌ **Not Implemented** | ✅ Complete (`PATCH /orders/:orderId`, 200, guarded `paymentCount: 0`) | ✅ Complete (`replaceOrderRequestSchema`) | Missing route, form prefilling, unpaid guard logic (`isEditable` / `payments.length === 0`), `useReplaceOrder` mutation, 409 conflict handling. |
| **Order Detail View & Actions** | 🟡 **Partially Implemented** | ✅ Complete (`GET /orders/:id`, `DELETE /orders/:id`) | ✅ Complete (`OrderDetail`, `isEditable`, `isDeletable`) | Detail view exists with line items and payments. Missing: Action bar (Edit/Delete buttons), Delete confirmation modal, `useDeleteOrder` mutation, explicit contextual banners/tooltips explaining locked status when `paymentCount > 0`. |
| **Payment Modal UX & Settlement** | 🟢 **Substantially Implemented** | ✅ Complete (`POST /orders/:id/payments`, idempotent) | ✅ Complete (`recordPaymentRequestSchema`) | Already features: "Use remaining" shortcut, balance feedback, dynamic button copy, client-side idempotency preservation across retries, `PAYMENT_EXCEEDS_BALANCE` error adaptation. Minor polish on accessibility and reset states. |
| **React Query Cache Invalidation** | 🟡 **Partially Implemented** | N/A | ✅ Complete (`orderKeys`) | `useRecordPayment` already invalidates `detail`, `lists()`, and `summaries()`. Need to implement mutations and invalidation for `useCreateOrder`, `useReplaceOrder`, and `useDeleteOrder`. |

---

## 2. Route Architecture & App Router Survey

### 2.1 Route Tree in `apps/web/app`

```text
apps/web/app/
├── globals.css                       # Tailwind CSS v4 setup and base styles
├── layout.tsx                        # Root layout wrapping QueryProvider
├── page.tsx                          # Root '/' redirect to '/orders'
├── login/
│   └── page.tsx                      # Sign in page (PublicOnlyRoute)
├── register/
│   └── page.tsx                      # Sign up page (PublicOnlyRoute)
└── orders/
    ├── page.tsx                      # Dashboard (AuthenticatedWorkspace -> OrdersDashboard)
    ├── [orderId]/
    │   └── page.tsx                  # Order Detail (OrderDetailWorkspace)
    ├── new/                          # ❌ MISSING - To be implemented in Phase 8
    │   └── page.tsx
    └── [orderId]/edit/               # ❌ MISSING - To be implemented in Phase 8
        └── page.tsx
```

### 2.2 Route Protection & Boundaries (`components/auth/auth-boundary.tsx`)
- **`ProtectedRoute`**: Uses `useSession()` (`GET /api/v1/auth/me`). While pending or `data === null`, renders `SessionLoading` skeleton and redirects unauthenticated users to `/login?next=...`. On connection error, displays a structured error view with `retry` button.
- **`PublicOnlyRoute`**: Redirects authenticated sessions directly to `/orders`.
- **`AppShell`** (`components/layout/app-shell.tsx`): Houses desktop 248px sidebar, mobile drawer, brand logo, workspace navigation (`/orders`), user account identity badge, and `LogoutButton`.

---

## 3. Component Hierarchy & Align UI Foundation

### 3.1 Design System & Primitives (`components/ui/`)
The web application uses an internal, local set of Align UI-inspired primitives built on Radix UI and Tailwind Variants:

- **`Button`** (`components/ui/button.tsx`): Supports `primary`, `secondary`, `ghost`, `danger` variants, `medium`, `small`, `icon` sizes, and `asChild` delegation via `@radix-ui/react-slot`.
- **`Modal`** (`components/ui/modal.tsx`): Built on `@radix-ui/react-dialog`. Handles title, description, body, and footer with backdrop blur and animated entrance.
- **`Field`, `Input`, `Textarea`** (`components/ui/input.tsx`): Form control wrappers with accessible `label`, `htmlFor`, optional indicator, inline `error` (`role="alert"`), and helper `hint`.
- **`Select`** (`components/ui/select.tsx`): Accessible custom styled select control with chevron icon.
- **`Alert`** (`components/ui/alert.tsx`): Tone-based alert box (`danger` or `success`).
- **`Skeleton`** (`components/ui/skeleton.tsx`): Geometry-preserving animated placeholder.
- **`StatusBadge`** (`components/ui/status-badge.tsx` & `components/orders/status-badge.tsx`): Semantic dot-and-text badges for `pending` (neutral), `partially_paid` (info), `paid` (success), `overdue` (danger).

---

## 4. In-Depth Status of Key Workflows

### 4.1 `/orders/new` (Order Creation Page)
- **Status**: **Missing**.
- **Backend API**: `POST /orders` accepting `CreateOrderRequest` (`customerName: string`, `dueDate: string`, `items: Array<{ description: string, quantity: number, unitPriceCents: number }>`).
- **Requirements**:
  1. **Dynamic Line Items**: Manage line items with `useFieldArray` from `react-hook-form`. Minimum 1 item, maximum 100.
  2. **Add/Remove Controls**: "Add line item" button; "Remove item" button per row (disabled or hidden when `fields.length === 1`).
  3. **Live Subtotal Preview**: Calculate line totals (`quantity * unitPriceCents`) and overall order total preview in real-time as the user types, formatted cleanly in USD.
  4. **Integer Cent Conversion**: Transform dollar-and-cent decimal strings (e.g. `"45.50"`) to integer cents (`4550`) before submitting to the API.
  5. **Validation**: Client-side validation for non-empty customer name (max 200), valid `dueDate` (YYYY-MM-DD), valid item descriptions (1-500 chars), quantity (integer 1-1,000,000), unit price (>= $0.01).
  6. **Redirect & Invalidation**: On 201 response, invalidate `orderKeys.lists()` and `orderKeys.summaries()`, then navigate to `/orders/${data.id}` with a success toast/state.
  7. **Header Action**: Add "Create order" button to `PageHeader` in `apps/web/components/orders/orders-dashboard.tsx` and in the empty state.

### 4.2 `/orders/[orderId]/edit` (Order Edit Page)
- **Status**: **Missing**.
- **Backend API**: `PATCH /orders/:orderId` accepting `ReplaceOrderRequest` (same structure as create).
- **Backend Invariant**: Guarded by `paymentCount === 0`. If `paymentCount > 0`, backend returns HTTP 409 `ORDER_LOCKED_AFTER_PAYMENT`.
- **Requirements**:
  1. **Prefilling**: Load existing order with `useOrderDetail(orderId)` and populate form values (`customerName`, `dueDate`, `items` with unit price converted to decimal strings).
  2. **Unpaid Guard**: If `order.payments.length > 0` or `!order.isEditable`, do NOT render the editable form. Instead render a locked state notice with a link back to the detail view.
  3. **Save Replacement**: Submit replacement payload to `PATCH /orders/:orderId`.
  4. **Concurrency / Race Handling**: If another user/tab recorded a payment while the edit page was open, the API will reject with 409 `ORDER_LOCKED_AFTER_PAYMENT`. The frontend must catch `ApiError` 409, display an explicit alert explaining that the order was locked by a recent payment, and offer navigation back to detail.
  5. **Cache Invalidation**: Invalidate `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()`, then redirect back to `/orders/${orderId}`.

### 4.3 Order Detail View (`components/orders/order-detail-workspace.tsx`)
- **Status**: **Partially Implemented**.
- **Currently Present**:
  - Breadcrumbs to `/orders`.
  - Display ID, StatusBadge, customer name, due date.
  - "Record payment" button (when `balanceDueCents > 0`) or "Paid in full" badge.
  - Financial metric cards (`totalAmountCents`, `paidAmountCents`, `balanceDueCents`).
  - Line items table (description, quantity, unit price, line total).
  - Payment history list with amounts, dates, notes, and recorded timestamps.
  - `PaymentDialog` modal integration.
- **Missing Elements**:
  1. **Action Bar (Edit & Delete Buttons)**:
     - Header currently only has the "Record payment" button.
     - Needs an action group:
       - **Edit Order Button / Link**: Enabled if `detail.isEditable` (`detail.payments.length === 0`), linking to `/orders/${detail.id}/edit`. If locked, either disabled with a tooltip/title or omitted with a lock notice.
       - **Delete Order Button**: Enabled if `detail.isDeletable` (`detail.payments.length === 0`). Triggers delete confirmation modal.
  2. **Delete Confirmation Dialog**:
     - Modal asking: *"Are you sure you want to delete order [displayId]?"*
     - Clear description that this action is irreversible and only allowed because no settlements have been recorded.
     - "Delete order" (danger button) and "Cancel" button.
     - On confirmation, calls `useDeleteOrder(orderId).mutateAsync()`.
     - On success, navigates back to `/orders` and shows success message.
  3. **Contextual Explanations for Locked Orders**:
     - When `detail.payments.length > 0`, render a subtle, reassuring info banner or locked indicator: *"This order is locked because payments have been recorded. Line items and customer details can no longer be modified or deleted."*

### 4.4 Payment Modal UX (`components/orders/payment-dialog.tsx`)
- **Status**: **Substantially Implemented (Phase 5/6/7 Foundation)**.
- **Detailed Inspection**:
  - **"Use remaining" shortcut**: Implemented in lines 180-195 via:
    ```tsx
    onClick={() => form.setValue("amount", (order.balanceDueCents / 100).toFixed(2), { shouldValidate: true })}
    ```
  - **Balance feedback**:
    - Summary banner shows "Current balance: [formatted USD]".
    - Hint shows "Maximum [formatted USD]".
    - Submit button shows dynamic label: `"Record $X.XX"` or `"Record payment"`.
    - Server error `PAYMENT_EXCEEDS_BALANCE` extracts `remainingAmountCents` and updates field validation with `"The balance changed. The current maximum is [formatted USD]."`.
  - **Idempotency preservation across retries**:
    - Calculates fingerprint `JSON.stringify([submittedAmountCents, values.paymentDate, normalizedNote])`.
    - Preserves logical attempt key `{ fingerprint, key: crypto.randomUUID() }` in state.
    - If user encounters a network glitch and clicks retry without changing the form inputs, the exact same UUID idempotency key is transmitted.
    - If user edits any input, a fresh UUID key is generated.
    - Form resets and attempt clears on successful commit.

### 4.5 React Query State Management & Cache Invalidation

#### Query Key Factory (`features/orders/query-keys.ts`)
```ts
export const orderKeys = {
  all: ["orders"] as const,
  lists: () => ["orders", "list"] as const,
  list: (params: OrderListQuery) =>
    [
      "orders",
      "list",
      params.status,
      params.search ?? "",
      params.sort,
      params.direction,
      params.page,
      params.pageSize,
    ] as const,
  summaries: () => ["orders", "summary"] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
};
```

#### Mutation Invalidation Matrix

| Mutation | Key Invalidation Policy | QueryClient Operations |
| :--- | :--- | :--- |
| **`useCreateOrder`** | New order changes list pagination/sorting and account summary totals. | `queryClient.invalidateQueries({ queryKey: orderKeys.lists() })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.summaries() })` |
| **`useReplaceOrder`** | Order edit changes order detail, list totals, and summary totals. | `queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.lists() })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.summaries() })` |
| **`useDeleteOrder`** | Deletion removes order from system, decreases summary totals and list counts. | `queryClient.removeQueries({ queryKey: orderKeys.detail(orderId) })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.lists() })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.summaries() })` |
| **`useRecordPayment`** | *(Implemented)* Decrements balance, updates status, appends ledger, alters collected/outstanding summary. | `queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.lists() })`<br/>`queryClient.invalidateQueries({ queryKey: orderKeys.summaries() })` |

---

## 5. Form Handling & Money Calculation Architecture

### 5.1 The Integer-Cents Invariant in Forms
- Domain rule: authoritatively, money is always stored, transported, and verified as integer cents.
- Floating-point numbers are never used for money math.
- In forms, users input amounts as human decimal strings (e.g. `"1250.00"`).
- Conversion utility:
  ```ts
  export const decimalToCents = (value: string): number | null => {
    const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
    if (!match) return null;
    const whole = Number(match[1]);
    const fraction = (match[2] ?? "").padEnd(2, "0");
    const cents = whole * 100 + Number(fraction);
    return Number.isSafeInteger(cents) ? cents : null;
  };
  
  export const centsToDecimalString = (cents: number): string =>
    (cents / 100).toFixed(2);
  ```

### 5.2 Dynamic Line Items Form Schema
```ts
export const orderFormItemSchema = z.strictObject({
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(500, "Description must contain at most 500 characters."),
  quantity: z
    .string()
    .trim()
    .min(1, "Quantity is required.")
    .regex(/^[1-9]\d*$/, "Quantity must be a positive whole number.")
    .refine((val) => Number(val) <= 1_000_000, "Max quantity is 1,000,000."),
  unitPrice: z
    .string()
    .trim()
    .min(1, "Unit price is required.")
    .regex(/^\d+(?:\.\d{1,2})?$/, "Use a valid price with up to 2 decimals.")
    .refine((val) => {
      const cents = decimalToCents(val);
      return cents !== null && cents >= 1 && cents <= 999_999_999;
    }, "Price must be between $0.01 and $9,999,999.99."),
});

export const orderFormSchema = z.strictObject({
  customerName: z
    .string()
    .trim()
    .min(1, "Customer name is required.")
    .max(200, "Customer name must contain at most 200 characters."),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be in YYYY-MM-DD format."),
  items: z
    .array(orderFormItemSchema)
    .min(1, "At least one line item is required.")
    .max(100, "An order can contain at most 100 line items."),
});
```

---

## 6. Implementation Blueprint for Phase 8

When Phase 8 is approved by the user, the following files and modules should be created and updated:

### 1. `apps/web/features/orders/api.ts`
Add `createOrder`, `replaceOrder`, and `deleteOrder`:
```ts
export const createOrder = async (
  input: CreateOrderRequest,
  signal?: AbortSignal,
): Promise<OrderDetail> => {
  const response = await apiRequest<OrderDetailResponse>("/orders", {
    method: "POST",
    body: input,
    ...(signal !== undefined && { signal }),
  });
  return response.data;
};

export const replaceOrder = async (
  orderId: string,
  input: ReplaceOrderRequest,
  signal?: AbortSignal,
): Promise<OrderDetail> => {
  const response = await apiRequest<OrderDetailResponse>(`/orders/${orderId}`, {
    method: "PATCH",
    body: input,
    ...(signal !== undefined && { signal }),
  });
  return response.data;
};

export const deleteOrder = async (
  orderId: string,
  signal?: AbortSignal,
): Promise<void> => {
  await apiRequest<void>(`/orders/${orderId}`, {
    method: "DELETE",
    ...(signal !== undefined && { signal }),
  });
};
```

### 2. `apps/web/features/orders/queries.ts`
Add React Query mutation hooks:
- `useCreateOrder()`
- `useReplaceOrder(orderId: string)`
- `useDeleteOrder(orderId: string)`

### 3. `apps/web/components/orders/order-form.tsx`
Reusable component for `/orders/new` and `/orders/[orderId]/edit`:
- `mode: "create" | "edit"`
- `initialValues?: OrderDetail`
- React Hook Form `useFieldArray` for items
- Dynamic subtotal preview calculating line totals and order total in real-time
- Accessible field errors and server error banner
- Cancel and Submit buttons with loading states

### 4. `apps/web/components/orders/delete-order-dialog.tsx`
Confirmation dialog primitive wrapping `Modal` for safe order deletion.

### 5. `apps/web/app/orders/new/page.tsx` & `apps/web/app/orders/[orderId]/edit/page.tsx`
Next.js route pages wrapping the workspace in `ProtectedRoute` and `AppShell`.

### 6. `apps/web/components/orders/order-detail-workspace.tsx` & `apps/web/components/orders/orders-dashboard.tsx`
- Add "Create order" button to dashboard header and empty state.
- Add Edit and Delete action controls to order detail header.
- Add contextual locked explanations when `payments.length > 0`.

---

## 7. Verification & Testing Strategy

To ensure zero regressions and strict invariant enforcement, the following tests should be implemented alongside Phase 8:

1. **Unit & Hook Tests (`vitest`)**:
   - Money conversion: decimal string to integer cents and vice versa.
   - Form schema validation: validation rules for quantity, unit prices, description bounds, customer name, date formats.
   - Live subtotal preview calculation correctness.
   - Query key invalidation assertions.
2. **Component Integration Tests**:
   - Dynamic line item addition, deletion, and minimum constraint enforcement.
   - Order detail action bar rendering: Edit/Delete visible when unpaid, locked explanation when paid.
   - Delete confirmation dialog opening, closing, and mutation dispatch.
3. **End-to-End Test Journey**:
   - Create multi-item order at `/orders/new` -> verify subtotal preview -> submit -> verify redirect to `/orders/[id]`.
   - Edit order at `/orders/[id]/edit` -> change quantities/prices -> save -> verify updated totals.
   - Delete unpaid order -> verify return to `/orders` and removal from table.
   - Partial payment ($400 against $1,000) -> verify order becomes locked -> verify edit and delete buttons are disabled/hidden with contextual explanation.
