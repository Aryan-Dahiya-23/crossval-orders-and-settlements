# Milestone 2: Settlement UX Polish & Payment Hardening — Handoff Report

## 1. Observation

1. **Payment Dialog Component**:
   - In `apps/web/components/orders/payment-dialog.tsx`:
     - Lines 53-56: `const [attempt, setAttempt] = useState<{ fingerprint: string; key: string; } | null>(null);`
     - Lines 60-63: `const form = useForm<PaymentFormValues>({ resolver: zodResolver(paymentFormSchema), defaultValues: { amount: "", paymentDate: todayUtc, note: "" }, });`
     - Lines 64-65: `const watchedAmount = useWatch({ control: form.control, name: "amount" }); const amountCents = decimalToCents(watchedAmount);`
     - Lines 88-91:
       ```ts
       const logicalAttempt =
         attempt?.fingerprint === fingerprint
           ? attempt
           : { fingerprint, key: crypto.randomUUID() };
       setAttempt(logicalAttempt);
       ```
     - Line 103: `setAttempt(null);` is executed only upon successful completion inside `try`.
     - Lines 160-165: Dialog renders static Current balance container:
       ```tsx
       <div className="mb-5 flex items-center justify-between rounded-[10px] bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
         <span className="text-sm text-slate-500">Current balance</span>
         <strong className="text-base font-semibold tabular-nums text-slate-950">
           {formatUsd(order.balanceDueCents)}
         </strong>
       </div>
       ```
     - Lines 180-195: "Use remaining" shortcut is rendered as inline text button:
       ```tsx
       <button
         className="font-medium text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
         type="button"
         onClick={() =>
           form.setValue(
             "amount",
             (order.balanceDueCents / 100).toFixed(2),
             {
               shouldValidate: true,
             },
           )
         }
       >
         Use remaining
       </button>
       ```

2. **React Query Invalidation Hook**:
   - In `apps/web/features/orders/queries.ts` (lines 112-124):
     ```ts
     export const useRecordPayment = (orderId: string) => {
       const queryClient = useQueryClient();
       return useMutation({
         mutationFn: recordPayment,
         onSuccess: async () => {
           await Promise.all([
             queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
             queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
             queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
           ]);
         },
       });
     };
     ```
   - In `apps/web/features/orders/query-keys.ts` (lines 3-19):
     ```ts
     export const orderKeys = {
       all: ["orders"] as const,
       lists: () => ["orders", "list"] as const,
       list: (params: OrderListQuery) => [...],
       summaries: () => ["orders", "summary"] as const,
       detail: (orderId: string) => ["orders", "detail", orderId] as const,
     };
     ```

3. **Current Test Coverage**:
   - In `apps/web/features/orders/queries.test.ts` (lines 23-128), test cases exist for `createOrder`, `replaceOrder`, and `deleteOrder`. There are zero test cases for `useRecordPayment` cache invalidation.
   - There is no unit test file for `payment-dialog.tsx` in `apps/web/components/orders/`.
   - In `apps/api/tests/orders/payments.integration.test.ts` (lines 1-394), comprehensive Atlas integration tests cover partial payment ($400), exact settlement ($600), overpayment rejection ($1), idempotency replay with header `Idempotency-Replayed: true`, and concurrent overpayment race prevention.

4. **Lint and Typecheck Run Output**:
   - Command `pnpm test` passed 8 test files in web and 5 test files in API (102 tests total).
   - Command `pnpm typecheck` passed cleanly across contracts, api, and web.
   - Command `pnpm lint` failed with:
     `apps/api/tests/orders/challenger-m1-immutability.integration.test.ts:10:15 error 'OrderDocument' is defined but never used @typescript-eslint/no-unused-vars`

---

## 2. Logic Chain

1. **Dynamic Balance Feedback (Observation 1)**:
   - Observation 1 shows that `PaymentDialog` computes `amountCents` dynamically via `useWatch`, but only displays static `Current balance` and the submit button label.
   - Therefore, adding a dynamic breakdown card displaying `Current balance`, `Payment applied (-$X.XX)`, and `Remaining balance ($Y.YY)` / `Settled in full` / `Exceeds balance` provides real-time financial clarity before submission.

2. **Idempotency Lifecycle & Modal Dismissal (Observation 1)**:
   - Observation 1 shows `attempt` is set during submit and only cleared on success (`setAttempt(null)`).
   - If a submission fails (e.g. server or network error), closing the modal does not clear `attempt`. If reopened, the stale key would be sent for new actions.
   - Therefore, introducing an effect on `!open` and in `handleClose` guarantees that UUIDs persist across retries of the same dialog session, but reset cleanly upon modal dismissal or cancellation, satisfying Requirement R2.

3. **Cache Reconciliation (Observation 2 & 3)**:
   - Observation 2 confirms `useRecordPayment` calls `invalidateQueries` on `orderKeys.detail(orderId)`, `orderKeys.lists()`, and `orderKeys.summaries()`.
   - Observation 3 shows that while the code is present, it lacks dedicated unit test coverage in `queries.test.ts`. Adding this test ensures regression protection.

4. **Lint Resolution (Observation 4)**:
   - Observation 4 indicates that removing the unused `OrderDocument` import from `apps/api/tests/orders/challenger-m1-immutability.integration.test.ts` will restore full lint passing across the workspace.

---

## 3. Caveats

1. **Read-Only Explorer Scope**: In accordance with the Explorer archetype and Teamwork protocol, this investigation made no modifications to project source code. All code enhancements and test additions are provided in `.agents/explorer_m2_1/plan.md`.
2. **MongoDB Atlas Integration Environment**: Integration tests require `MONGODB_TEST_URI` or `MONGODB_URI`. All pure unit tests pass without a live database.

---

## 4. Conclusion

Milestone 2 (Payment & Settlement UX Polish - Phase 9) has a solid foundation in both frontend hooks and backend conditional atomic handlers. To achieve complete compliance with `ORIGINAL_REQUEST.md` §R2 and ensure top-tier reviewer quality:
1. Enhance `apps/web/components/orders/payment-dialog.tsx` with dynamic balance feedback preview, touch-friendly "Use remaining" handling, and clean idempotency reset on modal dismissal.
2. Add `useRecordPayment` cache invalidation unit tests in `apps/web/features/orders/queries.test.ts`.
3. Add unit test suite in `apps/web/components/orders/payment-dialog.test.ts`.
4. Fix the unused import in `apps/api/tests/orders/challenger-m1-immutability.integration.test.ts`.

A complete, drop-in implementation plan is documented in `.agents/explorer_m2_1/plan.md`.

---

## 5. Verification Method

To verify these findings and future implementation:
1. **Unit & Query Tests**:
   ```bash
   pnpm --filter @crossval/web test
   ```
2. **Typecheck & Lint**:
   ```bash
   pnpm typecheck
   pnpm lint
   ```
3. **Full Build**:
   ```bash
   pnpm build
   ```
4. **Backend Payment Integration Tests** (with live MongoDB):
   ```bash
   pnpm --filter @crossval/api test:integration
   ```
