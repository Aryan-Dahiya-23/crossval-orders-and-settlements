## 2026-08-14T21:01:31Z

You are an Explorer designing the Order Form and Routes for Milestone 1 (Order Lifecycle UI/UX - Phase 8).
Your working directory is /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_form_1.

1. Read /Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md, PROJECT.md, and AGENTS.md.
2. Inspect apps/web/src/app/(dashboard), existing components (Align UI components in apps/web/src/components/ui), and contracts in packages/contracts.
3. Design the exact architecture and implementation plan for:
   - apps/web/src/components/orders/order-form.tsx:
     - React Hook Form + Zod resolver using contracts schema.
     - Dynamic line items array (useFieldArray) with add/remove/update.
     - Real-time subtotal per item and total order amount preview in USD.
     - Integer-cent conversion (frontend displays decimal dollars, converts to integer cents for API).
     - Customer name, customer email, due date (YYYY-MM-DD), line items.
   - apps/web/src/app/(dashboard)/orders/new/page.tsx:
     - Create order page layout, page header, breadcrumbs, and form integration.
     - Redirection to /orders/[orderId] on successful creation.
   - apps/web/src/app/(dashboard)/orders/[orderId]/edit/page.tsx:
     - Edit order replacement page layout.
     - Prefills order data into the form.
     - Guard: if order has payments (paymentCount > 0 or payments.length > 0), prevent edit, show explanatory notice, and link back to order detail.
     - Redirection to /orders/[orderId] on successful save.
4. Save your detailed plan and code blueprints to /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_form_1/plan.md and write /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_form_1/handoff.md.
5. Send a completion message to parent when done.
