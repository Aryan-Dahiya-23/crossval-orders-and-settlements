## 2026-08-14T21:01:31Z

You are an Explorer designing the Frontend API Client and React Query Mutations for Milestone 1 (Order Lifecycle UI/UX - Phase 8).
Your working directory is /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1.

1. Read /Users/aryandahiya/Desktop/Programming/crossval/.agents/ORIGINAL_REQUEST.md, PROJECT.md, and AGENTS.md.
2. Inspect apps/web/src/lib/api/orders.ts, apps/web/src/lib/hooks/use-orders.ts, apps/web/src/lib/query-keys.ts, and apps/api/src/modules/orders/routes.ts.
3. Design the exact architecture and implementation plan for:
   - apps/web/src/lib/api/orders.ts:
     - createOrder(input: CreateOrderInput): Promise<OrderResponse> (POST /orders)
     - replaceOrder(orderId: string, input: ReplaceOrderInput): Promise<OrderResponse> (PATCH /orders/:id)
     - deleteOrder(orderId: string): Promise<void> (DELETE /orders/:id)
   - apps/web/src/lib/hooks/use-orders.ts:
     - useCreateOrder mutation: invalidates orderKeys.lists() and orderKeys.summaries().
     - useReplaceOrder mutation: invalidates orderKeys.detail(orderId), orderKeys.lists(), and orderKeys.summaries().
     - useDeleteOrder mutation: invalidates orderKeys.lists() and orderKeys.summaries(), removes orderKeys.detail(orderId) from cache.
   - Comprehensive error handling: parsing API error envelopes, mapping 409 ORDER_LOCKED_AFTER_PAYMENT and 422 validation errors to user-friendly messages.
4. Save your detailed plan and blueprints to /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1/plan.md and write /Users/aryandahiya/Desktop/Programming/crossval/.agents/explorer_m1_hooks_1/handoff.md.
5. Send a completion message to parent when done.
