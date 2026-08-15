## 2026-08-14T21:01:31Z

You are an Explorer designing the Order Actions, Delete Dialog, and Lock Banner for Milestone 1 (Order Lifecycle UI/UX - Phase 8).
Your working directory is /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_actions_1.

1. Read /Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md, PROJECT.md, and AGENTS.md.
2. Inspect apps/web/src/app/(dashboard)/orders/[orderId]/page.tsx, existing UI components (Dialog, Button, Badge, Card, etc.), and styles.
3. Design the exact architecture and implementation plan for:
   - apps/web/src/components/orders/order-action-bar.tsx (or integration into order detail header):
     - "Edit Order" button (navigates to /orders/[orderId]/edit when editable, disabled with explanation when locked).
     - "Delete Order" button (opens delete dialog when editable, disabled with explanation when locked).
     - "Record Payment" button (triggers existing PaymentDialog).
   - apps/web/src/components/orders/order-delete-dialog.tsx:
     - Accessible modal dialog for confirming unpaid order deletion.
     - Shows order ID/customer, warnings that deletion is permanent, Cancel and Confirm Delete buttons.
     - Loading state during deletion mutation.
     - On successful deletion, redirects to /orders (dashboard list).
   - Contextual Lock Banner / Explanation:
     - Clear, restrained B2B finance explanation when order has recorded payments: "This order has recorded payments and is locked against edits or deletion per financial accounting rules."
4. Save your detailed plan and blueprints to /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_actions_1/plan.md and write /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_actions_1/handoff.md.
5. Send a completion message to parent when done.
