# UI and UX Specification

## Product character

The interface should feel like a credible B2B finance operations product: calm, dense enough for work, visually restrained, and explicit about money and state. Polish comes from hierarchy, feedback, and edge-case handling—not decorative effects.

## Information architecture

```text
Orders & Settlements
├── Orders dashboard
│   ├── Financial summary
│   ├── Search and status filters
│   ├── Orders table
│   └── Create order action
└── Order detail
    ├── Identity and status
    ├── Total / paid / balance / due date
    ├── Line items
    ├── Payment history
    └── Contextual actions
```

The orders dashboard is the default authenticated view. It answers: What exists, what is due, and what needs attention? The detail view answers: What created this balance, what has been paid, and what action is valid now?

## Global shell

### Sidebar

- Product mark and name at the top.
- Orders as the primary active navigation item.
- A compact signed-in user area and logout action at the bottom.
- Desktop width remains stable to protect table alignment.
- On narrow screens it becomes a dismissible drawer.

### Application header

- Page title and short supporting context.
- Breadcrumbs only where they add orientation, primarily detail and edit pages.
- Primary action aligned consistently on the right.
- No global search until there is more than one searchable product area.

## Orders dashboard

### Summary cards

Show four core measures:

1. total order value;
2. amount collected;
3. outstanding balance;
4. overdue balance.

Each card includes a plain label, formatted amount, and optional small context such as order count. A card must not imply trend data unless the backend supplies a valid comparison period.

### Toolbar

- Search by customer name or order identifier.
- Status filter: All, Pending, Partially Paid, Paid, Overdue.
- Optional Clear Filters action when any filter is active.
- Create Order as the visually dominant action.
- Applied state appears in the URL and survives refresh.

### Orders table

Default columns:

| Column   | Behavior                                             |
| -------- | ---------------------------------------------------- |
| Order    | Human-readable order identifier, links to detail     |
| Customer | Primary customer name, optional email secondary text |
| Total    | Right-aligned currency                               |
| Paid     | Right-aligned currency                               |
| Balance  | Right-aligned currency, emphasized when non-zero     |
| Due date | Date-only display; overdue styling when applicable   |
| Status   | Text badge with semantic color                       |
| Actions  | Accessible overflow menu or clear row action         |

The entire row may be clickable only if keyboard behavior and nested controls remain correct. Otherwise, make the order identifier the primary link.

Desktop tables remain tables. On small screens, use a deliberately designed stacked row/card rather than forcing a very wide table into an unusable viewport.

### Sorting and pagination

- Default sort: newest created first.
- Clearly indicate the active sorted column and direction.
- Pagination remains server-backed.
- Preserve filters while paging.
- Display a useful result count such as “21–40 of 84.”

## Order detail

### Order header

Display order identifier, customer name, status badge, and due date. Valid actions depend on server state:

- Record Payment only when balance is greater than zero.
- Edit and Delete only when the order has no payments.
- Disabled controls should explain why; prefer hiding actions only when absence is unsurprising.

### Financial summary

Give equal visual structure to total, paid, and balance due. Balance due is the strongest figure while unpaid. Paid orders emphasize completion without hiding history.

### Line items

Columns: description, quantity, unit price, and line total. Totals are server-provided values. The order total appears in a footer or aligned summary.

### Payment history

Show newest payment first unless product testing shows chronological reading is clearer. Each row contains amount, effective payment date, recorded timestamp when useful, and optional note. If there are no payments, show a calm empty state rather than an empty table frame.

### Record payment dialog

The dialog contains:

- current balance due;
- payment amount;
- optional reference or note if included in the API;
- explicit Cancel and Record Payment buttons.

The confirmation button includes the amount when practical, such as “Record $250.00 payment.” Overpayment validation appears before submit for convenience, but the server remains authoritative. On a concurrency conflict, explain that the balance changed and show the refreshed balance.

## Create and edit order

The form is a full page rather than a small modal because line items need space.

Suggested order:

1. customer information;
2. due date;
3. line items;
4. computed preview;
5. actions.

Each line item supports description, quantity, unit price, and remove. At least one line item is required. “Add line item” is visually secondary but easy to find. The total preview updates immediately and is labeled as a preview until saved.

Edit uses the same core form with clear mode text. If a payment is recorded while an edit page is stale, the server rejects the update and the UI presents the now-locked state.

## Status language

Use exactly these user-facing labels:

| API value        | Label          | Visual meaning              |
| ---------------- | -------------- | --------------------------- |
| `pending`        | Pending        | Neutral outstanding balance |
| `partially_paid` | Partially paid | Progress, balance remains   |
| `paid`           | Paid           | Completed                   |
| `overdue`        | Overdue        | Attention required          |

Do not use “unpaid” as a fifth status. A pending order is overdue only when the server says so. Colors need text labels and AA contrast.

## State design

### Loading

- Skeletons match final geometry.
- Do not replace the whole page with a spinner.
- Background refresh does not blank existing content.

### Empty

- First-use empty state: brief explanation plus Create Order.
- Filtered empty state: summarize filters plus Clear Filters.
- No payment history: state that no payments have been recorded.

### Errors

- Validation errors live beside the relevant field.
- Mutation errors remain close to the action surface.
- Page query errors include Retry.
- Unexpected failures show a request ID when supplied.
- Never display stack traces, raw database errors, or internal codes as the primary message.

### Success

- Successful writes provide a concise toast and visibly updated canonical data.
- Creation navigates to the created order detail.
- Payment success keeps the user on the detail view and focuses the updated financial state.
- Deletion returns to the list with a confirmation toast.

## Confirmation policy

Confirmation is required for deletion because it is irreversible in the MVP. It is not required for normal order creation or payment submission beyond the clearly labeled primary button. The delete dialog names the order and explains that only unpaid orders can be deleted.

## Responsive behavior

| Breakpoint behavior   | Requirement                                                                          |
| --------------------- | ------------------------------------------------------------------------------------ |
| Wide desktop          | Fixed navigation and full table                                                      |
| Narrow desktop/tablet | Compact navigation and reduced secondary table detail                                |
| Mobile                | Drawer navigation, stacked summaries, card-like order rows, full-width forms/dialogs |

Mobile does not need parity with dense desktop throughput, but all core journeys must remain possible.

## Accessibility checklist

- Semantic page landmarks and heading order.
- Skip-to-content link.
- Visible keyboard focus.
- Minimum practical hit targets.
- Menu and dialog keyboard behavior.
- Labels for icon-only buttons.
- Table headers announced correctly.
- Live announcements for form and mutation outcomes where needed.
- No information encoded by color alone.
- Reduced motion support.

## Content style

- Prefer direct labels: “Record payment,” not “Submit.”
- Use sentence case.
- Format money consistently as USD with two decimal places.
- Use customer-friendly errors without blaming the user.
- Use precise destructive copy: “Delete order,” not “Remove.”
- Avoid financial promises or accounting language the product does not substantiate.

## Reference-project lessons

The product direction borrows patterns, not code:

- a restrained navigation shell and data-dense tables from the strongest dashboard references;
- clear list-to-detail navigation and status treatment from operations-oriented references;
- spacious, well-labeled forms and focused dialogs from the strongest form references.

The resulting interface must remain its own coherent product and comply with Align UI conventions.

## Phase 6 implementation note

The implemented foundation follows this specification with a stable 248 px desktop sidebar, a mobile header and dismissible navigation drawer, consistent page headers, compact summary cards, dense desktop tables, purpose-built mobile order cards, text-and-color status badges, and a Radix-backed payment modal. Align UI-style primitives live locally under `apps/web/components/ui`; none of the three reference repositories is imported or required at runtime. URL-backed filtering, sorting, result counts, and pagination remain Phase 7 scope.

## Out of scope

- data visualization added only for decoration;
- customizable dashboard layouts;
- themes beyond a polished default;
- bulk editing or bulk payment recording;
- invoice PDF generation;
- advanced notifications;
- motion-heavy transitions.
