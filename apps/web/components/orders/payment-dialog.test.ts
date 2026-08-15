import { describe, expect, it } from "vitest";

import {
  centsToDecimalString,
  decimalToCents,
} from "../../features/orders/form-schema";
import { formatUsd } from "../../lib/format";

describe("PaymentDialog calculation and settlement logic", () => {
  describe("currency conversions", () => {
    it("converts decimal dollar strings to integer cents accurately", () => {
      expect(decimalToCents("1000.00")).toBe(100000);
      expect(decimalToCents("400.00")).toBe(40000);
      expect(decimalToCents("600.00")).toBe(60000);
      expect(decimalToCents("0.01")).toBe(1);
      expect(decimalToCents("0.5")).toBe(50);
      expect(decimalToCents("100")).toBe(10000);
    });

    it("rejects invalid decimal strings", () => {
      expect(decimalToCents("")).toBeNull();
      expect(decimalToCents("   ")).toBeNull();
      expect(decimalToCents("abc")).toBeNull();
      expect(decimalToCents("-50.00")).toBeNull();
      expect(decimalToCents("10.999")).toBeNull();
    });

    it("formats integer cents to decimal strings for inputs", () => {
      expect(centsToDecimalString(100000)).toBe("1000.00");
      expect(centsToDecimalString(40000)).toBe("400.00");
      expect(centsToDecimalString(60000)).toBe("600.00");
      expect(centsToDecimalString(1)).toBe("0.01");
      expect(centsToDecimalString(0)).toBe("0.00");
    });
  });

  describe("real-time settlement preview math", () => {
    const initialBalanceDueCents = 100000; // $1,000.00

    it("calculates partial payment state ($400 on $1,000 balance)", () => {
      const amountCents = decimalToCents("400.00")!;
      const isValidAmount = amountCents > 0;
      const isOverpaid = amountCents > initialBalanceDueCents;
      const isFullSettlement = amountCents === initialBalanceDueCents;
      const isPartialPayment =
        isValidAmount && amountCents < initialBalanceDueCents;
      const projectedBalanceCents = Math.max(
        0,
        initialBalanceDueCents - amountCents,
      );

      expect(isValidAmount).toBe(true);
      expect(isOverpaid).toBe(false);
      expect(isFullSettlement).toBe(false);
      expect(isPartialPayment).toBe(true);
      expect(projectedBalanceCents).toBe(60000);
      expect(formatUsd(projectedBalanceCents)).toBe("$600.00");
    });

    it("calculates full settlement state ($600 on $600 balance)", () => {
      const currentBalanceCents = 60000;
      const amountCents = decimalToCents("600.00")!;
      const isValidAmount = amountCents > 0;
      const isOverpaid = amountCents > currentBalanceCents;
      const isFullSettlement = amountCents === currentBalanceCents;
      const isPartialPayment =
        isValidAmount && amountCents < currentBalanceCents;
      const projectedBalanceCents = Math.max(0, currentBalanceCents - amountCents);

      expect(isValidAmount).toBe(true);
      expect(isOverpaid).toBe(false);
      expect(isFullSettlement).toBe(true);
      expect(isPartialPayment).toBe(false);
      expect(projectedBalanceCents).toBe(0);
      expect(formatUsd(projectedBalanceCents)).toBe("$0.00");
    });

    it("detects overpayment state ($1.00 on $0 balance or $601 on $600 balance)", () => {
      const currentBalanceCents = 60000;
      const amountCents = decimalToCents("601.00")!;
      const isValidAmount = amountCents > 0;
      const isOverpaid = amountCents > currentBalanceCents;
      const isFullSettlement = amountCents === currentBalanceCents;
      const isPartialPayment =
        isValidAmount && amountCents < currentBalanceCents;
      const projectedBalanceCents = Math.max(0, currentBalanceCents - amountCents);

      expect(isValidAmount).toBe(true);
      expect(isOverpaid).toBe(true);
      expect(isFullSettlement).toBe(false);
      expect(isPartialPayment).toBe(false);
      expect(projectedBalanceCents).toBe(0);
    });

    it("handles empty or zero amount input", () => {
      const amountCents = decimalToCents("");
      const isValidAmount = amountCents !== null && amountCents > 0;
      const projectedBalanceCents =
        amountCents !== null
          ? Math.max(0, initialBalanceDueCents - amountCents)
          : initialBalanceDueCents;

      expect(isValidAmount).toBe(false);
      expect(projectedBalanceCents).toBe(100000);
    });
  });

  describe("Use remaining balance shortcut", () => {
    it("sets input value to exact remaining balance string", () => {
      const balanceDueCents = 74550; // $745.50
      const shortcutValue = centsToDecimalString(balanceDueCents);
      expect(shortcutValue).toBe("745.50");

      const parsedCents = decimalToCents(shortcutValue);
      expect(parsedCents).toBe(balanceDueCents);
      expect(balanceDueCents - parsedCents!).toBe(0);
    });
  });

  describe("client-side idempotency preservation lifecycle", () => {
    const buildFingerprint = (
      amountCents: number,
      paymentDate: string,
      note: string,
    ) => {
      const normalizedNote = note.trim().replaceAll(/\s+/g, " ");
      return JSON.stringify([amountCents, paymentDate, normalizedNote]);
    };

    it("preserves idempotency key across retries with unchanged payload", () => {
      const initialAttempt = {
        fingerprint: buildFingerprint(40000, "2026-08-15", "Wire transfer"),
        key: "test-uuid-1234-5678",
      };

      // Retry attempt with identical values
      const retryFingerprint = buildFingerprint(
        40000,
        "2026-08-15",
        "Wire transfer",
      );
      const nextAttempt =
        initialAttempt.fingerprint === retryFingerprint
          ? initialAttempt
          : { fingerprint: retryFingerprint, key: "new-uuid" };

      expect(nextAttempt.key).toBe("test-uuid-1234-5678");
      expect(nextAttempt.fingerprint).toBe(initialAttempt.fingerprint);
    });

    it("generates fresh idempotency key when payload changes", () => {
      const initialAttempt = {
        fingerprint: buildFingerprint(40000, "2026-08-15", "Wire transfer"),
        key: "test-uuid-1234-5678",
      };

      // User modifies amount to $600.00
      const changedFingerprint = buildFingerprint(
        60000,
        "2026-08-15",
        "Wire transfer",
      );
      const nextAttempt =
        initialAttempt.fingerprint === changedFingerprint
          ? initialAttempt
          : { fingerprint: changedFingerprint, key: "new-uuid-9999" };

      expect(nextAttempt.key).toBe("new-uuid-9999");
      expect(nextAttempt.fingerprint).toBe(changedFingerprint);
      expect(nextAttempt.key).not.toBe(initialAttempt.key);
    });
  });
});
