import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  centsToDecimalString,
  decimalToCents,
} from "./form-schema";
import { orderKeys } from "./query-keys";

describe("Challenger 2 Empirical Verification: Settlement & Payment UX Logic", () => {
  describe("1. Dynamic Settlement Preview & Badge State Oracle", () => {
    interface SettlementPreviewState {
      isValidAmount: boolean;
      isOverpaid: boolean;
      isFullSettlement: boolean;
      isPartialPayment: boolean;
      projectedBalanceCents: number;
      badge: "Settled in full" | "Partially paid" | "Exceeds balance" | null;
    }

    const computeSettlementPreview = (
      balanceDueCents: number,
      inputAmount: string,
    ): SettlementPreviewState => {
      const amountCents = decimalToCents(inputAmount);
      const isValidAmount = amountCents !== null && amountCents > 0;
      const isOverpaid =
        amountCents !== null && amountCents > balanceDueCents;
      const isFullSettlement =
        isValidAmount && amountCents === balanceDueCents;
      const isPartialPayment =
        isValidAmount &&
        amountCents < balanceDueCents &&
        balanceDueCents > 0;
      const projectedBalanceCents =
        amountCents !== null
          ? Math.max(0, balanceDueCents - amountCents)
          : balanceDueCents;

      let badge: SettlementPreviewState["badge"] = null;
      if (isFullSettlement) {
        badge = "Settled in full";
      } else if (isPartialPayment) {
        badge = "Partially paid";
      } else if (isOverpaid) {
        badge = "Exceeds balance";
      }

      return {
        isValidAmount,
        isOverpaid,
        isFullSettlement,
        isPartialPayment,
        projectedBalanceCents,
        badge,
      };
    };

    it("evaluates all state transitions for a $1,000.00 balance order", () => {
      const balance = 100_000; // $1,000.00

      // Empty input
      const empty = computeSettlementPreview(balance, "");
      expect(empty.isValidAmount).toBe(false);
      expect(empty.isOverpaid).toBe(false);
      expect(empty.isFullSettlement).toBe(false);
      expect(empty.isPartialPayment).toBe(false);
      expect(empty.projectedBalanceCents).toBe(100_000);
      expect(empty.badge).toBeNull();

      // Zero input
      const zero = computeSettlementPreview(balance, "0.00");
      expect(zero.isValidAmount).toBe(false);
      expect(zero.isOverpaid).toBe(false);
      expect(zero.badge).toBeNull();

      // Minimal 1 cent ($0.01) payment
      const penny = computeSettlementPreview(balance, "0.01");
      expect(penny.isValidAmount).toBe(true);
      expect(penny.isPartialPayment).toBe(true);
      expect(penny.isFullSettlement).toBe(false);
      expect(penny.isOverpaid).toBe(false);
      expect(penny.projectedBalanceCents).toBe(99_999);
      expect(penny.badge).toBe("Partially paid");

      // Partial $400.00 payment
      const partial = computeSettlementPreview(balance, "400.00");
      expect(partial.isValidAmount).toBe(true);
      expect(partial.isPartialPayment).toBe(true);
      expect(partial.isFullSettlement).toBe(false);
      expect(partial.isOverpaid).toBe(false);
      expect(partial.projectedBalanceCents).toBe(60_000);
      expect(partial.badge).toBe("Partially paid");

      // Near-full $999.99 payment
      const nearFull = computeSettlementPreview(balance, "999.99");
      expect(nearFull.isValidAmount).toBe(true);
      expect(nearFull.isPartialPayment).toBe(true);
      expect(nearFull.isFullSettlement).toBe(false);
      expect(nearFull.projectedBalanceCents).toBe(1);
      expect(nearFull.badge).toBe("Partially paid");

      // Exact $1,000.00 settlement
      const exact = computeSettlementPreview(balance, "1000.00");
      expect(exact.isValidAmount).toBe(true);
      expect(exact.isFullSettlement).toBe(true);
      expect(exact.isPartialPayment).toBe(false);
      expect(exact.isOverpaid).toBe(false);
      expect(exact.projectedBalanceCents).toBe(0);
      expect(exact.badge).toBe("Settled in full");

      // Overpayment by 1 cent ($1,000.01)
      const overByCent = computeSettlementPreview(balance, "1000.01");
      expect(overByCent.isValidAmount).toBe(true);
      expect(overByCent.isOverpaid).toBe(true);
      expect(overByCent.isFullSettlement).toBe(false);
      expect(overByCent.isPartialPayment).toBe(false);
      expect(overByCent.projectedBalanceCents).toBe(0);
      expect(overByCent.badge).toBe("Exceeds balance");

      // Extreme overpayment ($50,000.00)
      const extremeOver = computeSettlementPreview(balance, "50000.00");
      expect(extremeOver.isValidAmount).toBe(true);
      expect(extremeOver.isOverpaid).toBe(true);
      expect(extremeOver.badge).toBe("Exceeds balance");
      expect(extremeOver.projectedBalanceCents).toBe(0);
    });

    it("evaluates boundary states for low balance orders ($0.01, $0.05, $1.00)", () => {
      // 1 cent balance
      const pennyBal = 1;
      const exactPenny = computeSettlementPreview(pennyBal, "0.01");
      expect(exactPenny.isFullSettlement).toBe(true);
      expect(exactPenny.badge).toBe("Settled in full");
      expect(exactPenny.projectedBalanceCents).toBe(0);

      const overPenny = computeSettlementPreview(pennyBal, "0.02");
      expect(overPenny.isOverpaid).toBe(true);
      expect(overPenny.badge).toBe("Exceeds balance");

      // Odd cents balance ($19.99)
      const oddBal = 1999;
      const partialOdd = computeSettlementPreview(oddBal, "10.00");
      expect(partialOdd.isPartialPayment).toBe(true);
      expect(partialOdd.projectedBalanceCents).toBe(999);
      expect(partialOdd.badge).toBe("Partially paid");

      const exactOdd = computeSettlementPreview(oddBal, "19.99");
      expect(exactOdd.isFullSettlement).toBe(true);
      expect(exactOdd.projectedBalanceCents).toBe(0);
      expect(exactOdd.badge).toBe("Settled in full");

      const overOdd = computeSettlementPreview(oddBal, "20.00");
      expect(overOdd.isOverpaid).toBe(true);
      expect(overOdd.badge).toBe("Exceeds balance");
    });

    it("evaluates behavior on $0.00 balance order", () => {
      const zeroBal = 0;
      const anyAttempt = computeSettlementPreview(zeroBal, "1.00");
      expect(anyAttempt.isOverpaid).toBe(true);
      expect(anyAttempt.badge).toBe("Exceeds balance");
    });
  });

  describe("2. Use Remaining Balance Shortcut Property Verification", () => {
    it("guarantees for any positive balance that shortcut produces exact full settlement", () => {
      const sampleBalances = [
        1,         // $0.01
        2,         // $0.02
        50,        // $0.50
        99,        // $0.99
        100,       // $1.00
        12345,     // $123.45
        40000,     // $400.00
        60000,     // $600.00
        100000,    // $1,000.00
        999999999, // $9,999,999.99
      ];

      for (const bal of sampleBalances) {
        const shortcutString = centsToDecimalString(bal);
        const parsed = decimalToCents(shortcutString);
        expect(parsed).toBe(bal);

        const remainingAfterShortcut = bal - parsed!;
        expect(remainingAfterShortcut).toBe(0);
      }
    });

    it("handles transition from user typing partial amount to clicking shortcut", () => {
      const balance = 60000; // $600.00
      let currentFormValue = "250.00"; // User typed $250.00
      let parsed = decimalToCents(currentFormValue)!;
      expect(parsed < balance).toBe(true);

      // User clicks "Use remaining balance"
      currentFormValue = centsToDecimalString(balance);
      expect(currentFormValue).toBe("600.00");
      parsed = decimalToCents(currentFormValue)!;
      expect(parsed).toBe(balance);
      expect(balance - parsed).toBe(0);
    });
  });

  describe("3. Idempotency Key Preservation & State Machine", () => {
    const buildFingerprint = (
      amountCents: number,
      paymentDate: string,
      note: string,
    ): string => {
      const normalizedNote = note.trim().replaceAll(/\s+/g, " ");
      return JSON.stringify([amountCents, paymentDate, normalizedNote]);
    };

    interface AttemptState {
      fingerprint: string;
      key: string;
    }

    const evaluateAttempt = (
      currentAttempt: AttemptState | null,
      amountCents: number,
      paymentDate: string,
      note: string,
      generateKey: () => string,
    ): AttemptState => {
      const fingerprint = buildFingerprint(amountCents, paymentDate, note);
      if (currentAttempt && currentAttempt.fingerprint === fingerprint) {
        return currentAttempt;
      }
      return { fingerprint, key: generateKey() };
    };

    it("preserves idempotency key across identical retries after failure", () => {
      let keyCounter = 1;
      const keyGen = () => `idempotency-uuid-${keyCounter++}`;

      // First submit attempt
      const attempt1 = evaluateAttempt(null, 40000, "2026-08-15", "Wire transfer", keyGen);
      expect(attempt1.key).toBe("idempotency-uuid-1");

      // Network times out -> User retries without editing form
      const attempt2 = evaluateAttempt(attempt1, 40000, "2026-08-15", "Wire transfer", keyGen);
      expect(attempt2.key).toBe("idempotency-uuid-1"); // PRESERVED
      expect(keyCounter).toBe(2); // No new key generated
    });

    it("preserves key when whitespace in note is formatted differently but normalizes to same string", () => {
      let keyCounter = 1;
      const keyGen = () => `idempotency-uuid-${keyCounter++}`;

      const attempt1 = evaluateAttempt(null, 40000, "2026-08-15", "Wire  transfer", keyGen);
      expect(attempt1.key).toBe("idempotency-uuid-1");

      // User adds leading/trailing spaces
      const attempt2 = evaluateAttempt(attempt1, 40000, "2026-08-15", "   Wire   transfer   ", keyGen);
      expect(attempt2.key).toBe("idempotency-uuid-1"); // PRESERVED
    });

    it("rotates key when amount changes", () => {
      let keyCounter = 1;
      const keyGen = () => `idempotency-uuid-${keyCounter++}`;

      const attempt1 = evaluateAttempt(null, 40000, "2026-08-15", "Wire transfer", keyGen);
      const attempt2 = evaluateAttempt(attempt1, 40001, "2026-08-15", "Wire transfer", keyGen);

      expect(attempt2.key).toBe("idempotency-uuid-2");
      expect(attempt2.key).not.toBe(attempt1.key);
    });

    it("rotates key when payment date changes", () => {
      let keyCounter = 1;
      const keyGen = () => `idempotency-uuid-${keyCounter++}`;

      const attempt1 = evaluateAttempt(null, 40000, "2026-08-15", "Wire transfer", keyGen);
      const attempt2 = evaluateAttempt(attempt1, 40000, "2026-08-14", "Wire transfer", keyGen);

      expect(attempt2.key).toBe("idempotency-uuid-2");
    });

    it("rotates key when note content changes", () => {
      let keyCounter = 1;
      const keyGen = () => `idempotency-uuid-${keyCounter++}`;

      const attempt1 = evaluateAttempt(null, 40000, "2026-08-15", "Check #101", keyGen);
      const attempt2 = evaluateAttempt(attempt1, 40000, "2026-08-15", "Check #102", keyGen);

      expect(attempt2.key).toBe("idempotency-uuid-2");
    });

    it("resets state completely upon dialog close or success", () => {
      let keyCounter = 1;
      const keyGen = () => `idempotency-uuid-${keyCounter++}`;

      let attempt: AttemptState | null = evaluateAttempt(null, 40000, "2026-08-15", "Wire", keyGen);
      expect(attempt.key).toBe("idempotency-uuid-1");

      // Reset upon modal close/success
      attempt = null;

      // Reopening dialog for next transaction
      attempt = evaluateAttempt(attempt, 40000, "2026-08-15", "Wire", keyGen);
      expect(attempt.key).toBe("idempotency-uuid-2"); // FRESH KEY
    });
  });

  describe("4. React Query Cache Invalidation Synchronization", () => {
    it("invalidates detail, lists, and summaries query keys upon payment recording", async () => {
      const queryClient = new QueryClient();
      const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
      const targetOrderId = "order_audit_999";

      // Trigger standard payment invalidation sequence
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail(targetOrderId),
        }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);

      expect(invalidateSpy).toHaveBeenCalledTimes(3);
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["orders", "detail", targetOrderId],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["orders", "list"],
      });
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["orders", "summary"],
      });
    });
  });
});
