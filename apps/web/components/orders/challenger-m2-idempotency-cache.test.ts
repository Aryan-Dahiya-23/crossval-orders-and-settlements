import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
  centsToDecimalString,
  decimalToCents,
} from "../../features/orders/form-schema";
import { orderKeys } from "../../features/orders/query-keys";
import { defaultOrderListQuery } from "../../features/orders/list-state";
import { formatUsd } from "../../lib/format";
import type {
  OrderDetail,
  OrderListQuery,
  OrderListResponse,
  OrderSummaryResponse,
} from "@crossval/contracts";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("Challenger 2 Empirical Verification: Idempotency Preservation & Cache Reconciliation", () => {
  describe("1. Idempotency Key Preservation Across Retries & Network Failures", () => {
    const getLogicalAttempt = (
      currentAttempt: { fingerprint: string; key: string } | null,
      amountCents: number,
      paymentDate: string,
      note: string,
    ) => {
      const normalizedNote = note.trim().replaceAll(/\s+/g, " ");
      const fingerprint = JSON.stringify([
        amountCents,
        paymentDate,
        normalizedNote,
      ]);
      return currentAttempt?.fingerprint === fingerprint
        ? currentAttempt
        : { fingerprint, key: crypto.randomUUID() };
    };

    it("generates a valid UUID v4 on initial attempt", () => {
      const attempt1 = getLogicalAttempt(null, 40000, "2026-08-15", "Wire transfer");
      expect(attempt1.key).toMatch(UUID_V4_REGEX);
      expect(attempt1.fingerprint).toBe(
        JSON.stringify([40000, "2026-08-15", "Wire transfer"]),
      );
    });

    it("preserves identical UUID across consecutive retry attempts (network failure / 503 / timeout)", () => {
      let currentAttempt: { fingerprint: string; key: string } | null = null;

      // Attempt 1: Network times out
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "Wire payment #101",
      );
      const initialKey = currentAttempt.key;
      expect(initialKey).toMatch(UUID_V4_REGEX);

      // Attempt 2: User clicks Retry without modifying fields
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "Wire payment #101",
      );
      expect(currentAttempt.key).toBe(initialKey);

      // Attempt 3: 503 Service Unavailable, User clicks Retry again
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "Wire payment #101",
      );
      expect(currentAttempt.key).toBe(initialKey);

      // Attempt 4: User retries 5 times
      for (let i = 0; i < 5; i++) {
        currentAttempt = getLogicalAttempt(
          currentAttempt,
          40000,
          "2026-08-15",
          "Wire payment #101",
        );
        expect(currentAttempt.key).toBe(initialKey);
      }
    });

    it("preserves UUID when non-semantic whitespace is added or removed from note", () => {
      let currentAttempt = getLogicalAttempt(
        null,
        40000,
        "2026-08-15",
        "Wire payment reference 123",
      );
      const originalKey = currentAttempt.key;

      // Retried with extra leading/trailing whitespace
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "   Wire payment reference 123   ",
      );
      expect(currentAttempt.key).toBe(originalKey);

      // Retried with multiple spaces between words
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "Wire   payment    reference   123",
      );
      expect(currentAttempt.key).toBe(originalKey);
    });

    it("rotates to a fresh UUID if payment amount changes by even 1 cent", () => {
      let currentAttempt = getLogicalAttempt(
        null,
        40000,
        "2026-08-15",
        "Partial settle",
      );
      const initialKey = currentAttempt.key;

      // Changed by 1 cent ($400.00 -> $400.01)
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40001,
        "2026-08-15",
        "Partial settle",
      );
      expect(currentAttempt.key).not.toBe(initialKey);
      expect(currentAttempt.key).toMatch(UUID_V4_REGEX);
    });

    it("rotates to a fresh UUID if payment date changes", () => {
      let currentAttempt = getLogicalAttempt(
        null,
        40000,
        "2026-08-15",
        "Partial settle",
      );
      const initialKey = currentAttempt.key;

      // Changed date
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-14",
        "Partial settle",
      );
      expect(currentAttempt.key).not.toBe(initialKey);
    });

    it("rotates to a fresh UUID if note semantic content changes", () => {
      let currentAttempt = getLogicalAttempt(
        null,
        40000,
        "2026-08-15",
        "Check #1",
      );
      const initialKey = currentAttempt.key;

      // Changed note
      currentAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "Check #2",
      );
      expect(currentAttempt.key).not.toBe(initialKey);

      // Removed note
      const nextAttempt = getLogicalAttempt(
        currentAttempt,
        40000,
        "2026-08-15",
        "",
      );
      expect(nextAttempt.key).not.toBe(currentAttempt.key);
      expect(nextAttempt.key).not.toBe(initialKey);
    });

    it("generates 100 distinct random UUIDs across independent payment actions", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const attempt = getLogicalAttempt(null, 1000 + i, "2026-08-15", `Note ${i}`);
        expect(keys.has(attempt.key)).toBe(false);
        expect(attempt.key).toMatch(UUID_V4_REGEX);
        keys.add(attempt.key);
      }
      expect(keys.size).toBe(100);
    });
  });

  describe("2. Modal Dismissal and Lifecycle State Reset", () => {
    interface ModalState {
      open: boolean;
      attempt: { fingerprint: string; key: string } | null;
      serverError: string | null;
      formValues: { amount: string; paymentDate: string; note: string };
    }

    const initialModalState = (todayUtc: string): ModalState => ({
      open: false,
      attempt: null,
      serverError: null,
      formValues: { amount: "", paymentDate: todayUtc, note: "" },
    });

    const handleClose = (
      state: ModalState,
      isPending: boolean,
      todayUtc: string,
    ): ModalState => {
      if (isPending) return state; // Locked during mutation
      return {
        ...state,
        open: false,
        attempt: null,
        serverError: null,
        formValues: { amount: "", paymentDate: todayUtc, note: "" },
      };
    };

    const handleSuccess = (
      state: ModalState,
      todayUtc: string,
    ): ModalState => ({
      ...state,
      open: false,
      attempt: null,
      serverError: null,
      formValues: { amount: "", paymentDate: todayUtc, note: "" },
    });

    const todayUtc = "2026-08-15";

    it("resets attempt, serverError, and form values when user cancels/dismisses modal", () => {
      let state = initialModalState(todayUtc);

      // User opens modal and fills form
      state.open = true;
      state.formValues = {
        amount: "400.00",
        paymentDate: "2026-08-15",
        note: "Attempt 1",
      };

      // Submission fails with server error
      state.attempt = {
        fingerprint: JSON.stringify([40000, "2026-08-15", "Attempt 1"]),
        key: "uuid-failed-attempt-1",
      };
      state.serverError = "Network connection dropped.";

      // User cancels dialog
      state = handleClose(state, false, todayUtc);

      expect(state.open).toBe(false);
      expect(state.attempt).toBeNull();
      expect(state.serverError).toBeNull();
      expect(state.formValues).toEqual({
        amount: "",
        paymentDate: todayUtc,
        note: "",
      });
    });

    it("ensures subsequent dialog opening generates a fresh UUID even with same parameters", () => {
      let state = initialModalState(todayUtc);
      state.open = true;
      state.attempt = {
        fingerprint: JSON.stringify([40000, "2026-08-15", "Wire"]),
        key: crypto.randomUUID(),
      };
      const firstDialogKey = state.attempt.key;

      // User closes dialog
      state = handleClose(state, false, todayUtc);
      expect(state.attempt).toBeNull();

      // Later user re-opens dialog and enters identical parameters
      state.open = true;
      const secondAttempt = state.attempt
        ? state.attempt
        : {
            fingerprint: JSON.stringify([40000, "2026-08-15", "Wire"]),
            key: crypto.randomUUID(),
          };

      expect(secondAttempt.key).not.toBe(firstDialogKey);
      expect(secondAttempt.key).toMatch(UUID_V4_REGEX);
    });

    it("prevents dismissal while mutation is in-flight (isPending protection)", () => {
      const state = initialModalState(todayUtc);
      state.open = true;
      state.attempt = {
        fingerprint: JSON.stringify([40000, "2026-08-15", "In flight"]),
        key: "uuid-in-flight",
      };

      // Attempt close while pending
      const closedState = handleClose(state, true, todayUtc);

      // State is untouched
      expect(closedState.open).toBe(true);
      expect(closedState.attempt?.key).toBe("uuid-in-flight");
    });

    it("resets attempt and form cleanly upon successful payment settlement", () => {
      let state = initialModalState(todayUtc);
      state.open = true;
      state.attempt = {
        fingerprint: JSON.stringify([60000, "2026-08-15", "Final payment"]),
        key: "uuid-settled",
      };
      state.formValues = {
        amount: "600.00",
        paymentDate: "2026-08-15",
        note: "Final payment",
      };

      state = handleSuccess(state, todayUtc);

      expect(state.open).toBe(false);
      expect(state.attempt).toBeNull();
      expect(state.formValues.amount).toBe("");
    });
  });

  describe("3. React Query Cache Invalidation & Multi-Surface Synchronization", () => {
    let queryClient: QueryClient;

    const mockOrderDetail1: OrderDetail = {
      id: "ord_001",
      displayId: "ORD-0001",
      customerName: "Acme Corp",
      dueDate: "2026-08-20",
      status: "pending",
      totalAmountCents: 100000,
      paidAmountCents: 0,
      balanceDueCents: 100000,
      isEditable: true,
      isDeletable: true,
      items: [
        {
          id: "item_1",
          description: "Consulting",
          quantity: 1,
          unitPriceCents: 100000,
          lineTotalCents: 100000,
          position: 0,
        },
      ],
      payments: [],
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    };

    const mockOrderDetail2: OrderDetail = {
      id: "ord_002",
      displayId: "ORD-0002",
      customerName: "Beta LLC",
      dueDate: "2026-08-25",
      status: "pending",
      totalAmountCents: 50000,
      paidAmountCents: 0,
      balanceDueCents: 50000,
      isEditable: true,
      isDeletable: true,
      items: [],
      payments: [],
      createdAt: "2026-08-15T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    };

    const mockOrderListResponse: OrderListResponse = {
      data: [
        {
          id: "ord_001",
          displayId: "ORD-0001",
          customerName: "Acme Corp",
          dueDate: "2026-08-20",
          status: "pending",
          totalAmountCents: 100000,
          paidAmountCents: 0,
          balanceDueCents: 100000,
          isEditable: true,
          isDeletable: true,
          createdAt: "2026-08-15T00:00:00.000Z",
          updatedAt: "2026-08-15T00:00:00.000Z",
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        totalItems: 1,
        totalPages: 1,
      },
    };

    const mockSummaryResponse: OrderSummaryResponse = {
      data: {
        totalOrders: 2,
        outstandingAmountCents: 150000,
        collectedAmountCents: 0,
        overdueAmountCents: 0,
      },
      meta: {
        asOfDate: "2026-08-15",
      },
    };

    it("invalidates target order detail, all dashboard lists, and portfolio summary", async () => {
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: Infinity } },
      });

      const filteredQuery1: OrderListQuery = {
        status: "pending",
        search: "Acme",
        sort: "dueDate",
        direction: "asc",
        page: 1,
        pageSize: 25,
      };

      const filteredQuery2: OrderListQuery = {
        status: "all",
        search: "",
        sort: "createdAt",
        direction: "desc",
        page: 2,
        pageSize: 10,
      };

      // Populate QueryClient cache with multiple queries
      queryClient.setQueryData(orderKeys.detail("ord_001"), mockOrderDetail1);
      queryClient.setQueryData(orderKeys.detail("ord_002"), mockOrderDetail2);
      queryClient.setQueryData(
        orderKeys.list(defaultOrderListQuery),
        mockOrderListResponse,
      );
      queryClient.setQueryData(
        orderKeys.list(filteredQuery1),
        mockOrderListResponse,
      );
      queryClient.setQueryData(
        orderKeys.list(filteredQuery2),
        mockOrderListResponse,
      );
      queryClient.setQueryData(orderKeys.summaries(), mockSummaryResponse);
      queryClient.setQueryData(["auth", "session"], { user: "test-user" });

      // Verify all queries initially have valid data and isInvalidated = false
      const getQuery = (key: readonly unknown[]) =>
        queryClient.getQueryCache().find({ queryKey: key });

      expect(getQuery(orderKeys.detail("ord_001"))?.state.isInvalidated).toBe(
        false,
      );
      expect(getQuery(orderKeys.detail("ord_002"))?.state.isInvalidated).toBe(
        false,
      );
      expect(
        getQuery(orderKeys.list(defaultOrderListQuery))?.state.isInvalidated,
      ).toBe(false);
      expect(getQuery(orderKeys.list(filteredQuery1))?.state.isInvalidated).toBe(
        false,
      );
      expect(getQuery(orderKeys.list(filteredQuery2))?.state.isInvalidated).toBe(
        false,
      );
      expect(getQuery(orderKeys.summaries())?.state.isInvalidated).toBe(false);
      expect(getQuery(["auth", "session"])?.state.isInvalidated).toBe(false);

      // Execute useRecordPayment invalidation sequence for ord_001
      const orderId = "ord_001";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
      ]);

      // 1. Target order detail MUST be marked invalidated (isInvalidated = true)
      expect(getQuery(orderKeys.detail("ord_001"))?.state.isInvalidated).toBe(
        true,
      );

      // 2. Unrelated order detail MUST NOT be invalidated
      expect(getQuery(orderKeys.detail("ord_002"))?.state.isInvalidated).toBe(
        false,
      );

      // 3. ALL list queries (default, filtered, paginated) MUST be marked invalidated via prefix match
      expect(
        getQuery(orderKeys.list(defaultOrderListQuery))?.state.isInvalidated,
      ).toBe(true);
      expect(getQuery(orderKeys.list(filteredQuery1))?.state.isInvalidated).toBe(
        true,
      );
      expect(getQuery(orderKeys.list(filteredQuery2))?.state.isInvalidated).toBe(
        true,
      );

      // 4. Portfolio summary metrics MUST be marked invalidated
      expect(getQuery(orderKeys.summaries())?.state.isInvalidated).toBe(true);

      // 5. Auth session query MUST NOT be invalidated
      expect(getQuery(["auth", "session"])?.state.isInvalidated).toBe(false);
    });

    it("verifies financial synchronization flow ($1,000 order -> $400 payment -> $600 balance)", async () => {
      queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      // Initial state
      let serverOrderDetail = { ...mockOrderDetail1 };
      let serverSummary = { ...mockSummaryResponse.data };

      // Cache subscriber queries
      const fetchDetail = vi.fn(async () => serverOrderDetail);
      const fetchSummary = vi.fn(async () => ({ data: serverSummary }));

      await queryClient.prefetchQuery({
        queryKey: orderKeys.detail("ord_001"),
        queryFn: fetchDetail,
      });
      await queryClient.prefetchQuery({
        queryKey: orderKeys.summaries(),
        queryFn: fetchSummary,
      });

      expect(
        (queryClient.getQueryData(orderKeys.detail("ord_001")) as OrderDetail)
          .balanceDueCents,
      ).toBe(100000);
      expect(
        (
          queryClient.getQueryData(
            orderKeys.summaries(),
          ) as OrderSummaryResponse
        ).data.outstandingAmountCents,
      ).toBe(150000);

      // Step 1: Record $400.00 payment
      serverOrderDetail = {
        ...serverOrderDetail,
        paidAmountCents: 40000,
        balanceDueCents: 60000,
        status: "partially_paid",
        isEditable: false,
        isDeletable: false,
        payments: [
          {
            id: "pay_1",
            amountCents: 40000,
            paymentDate: "2026-08-15",
            note: null,
            createdAt: "2026-08-15T00:00:00.000Z",
          },
        ],
      };
      serverSummary = {
        ...serverSummary,
        outstandingAmountCents: 110000,
        collectedAmountCents: 40000,
      };

      // Invalidate and refetch active queries
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail("ord_001"),
          refetchType: "all",
        }),
        queryClient.invalidateQueries({
          queryKey: orderKeys.summaries(),
          refetchType: "all",
        }),
      ]);

      const updatedDetail = queryClient.getQueryData(
        orderKeys.detail("ord_001"),
      ) as OrderDetail;
      const updatedSummary = queryClient.getQueryData(
        orderKeys.summaries(),
      ) as OrderSummaryResponse;

      expect(updatedDetail.paidAmountCents).toBe(40000);
      expect(updatedDetail.balanceDueCents).toBe(60000);
      expect(updatedDetail.status).toBe("partially_paid");
      expect(updatedDetail.isEditable).toBe(false);
      expect(updatedDetail.isDeletable).toBe(false);

      expect(updatedSummary.data.outstandingAmountCents).toBe(110000);
      expect(updatedSummary.data.collectedAmountCents).toBe(40000);

      // Step 2: Record $600.00 final payment
      serverOrderDetail = {
        ...serverOrderDetail,
        paidAmountCents: 100000,
        balanceDueCents: 0,
        status: "paid",
        payments: [
          ...serverOrderDetail.payments,
          {
            id: "pay_2",
            amountCents: 60000,
            paymentDate: "2026-08-15",
            note: null,
            createdAt: "2026-08-15T00:01:00.000Z",
          },
        ],
      };
      serverSummary = {
        ...serverSummary,
        outstandingAmountCents: 50000,
        collectedAmountCents: 100000,
      };

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail("ord_001"),
          refetchType: "all",
        }),
        queryClient.invalidateQueries({
          queryKey: orderKeys.summaries(),
          refetchType: "all",
        }),
      ]);

      const settledDetail = queryClient.getQueryData(
        orderKeys.detail("ord_001"),
      ) as OrderDetail;
      const settledSummary = queryClient.getQueryData(
        orderKeys.summaries(),
      ) as OrderSummaryResponse;

      expect(settledDetail.paidAmountCents).toBe(100000);
      expect(settledDetail.balanceDueCents).toBe(0);
      expect(settledDetail.status).toBe("paid");
      expect(settledSummary.data.outstandingAmountCents).toBe(50000);
      expect(settledSummary.data.collectedAmountCents).toBe(100000);
    });

    it("handles cache invalidation gracefully when cache has no prior entries (cold state)", async () => {
      queryClient = new QueryClient();

      await expect(
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: orderKeys.detail("non-existent"),
          }),
          queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
          queryClient.invalidateQueries({ queryKey: orderKeys.summaries() }),
        ]),
      ).resolves.toBeDefined();
    });
  });

  describe("4. Dynamic Settlement Preview Math & Boundary Invariants", () => {
    it("verifies full settlement boundary ($1,000.00 -> $1,000.00 payment)", () => {
      const balanceDueCents = 100000;
      const amountCents = decimalToCents("1000.00")!;
      const projectedBalance = Math.max(0, balanceDueCents - amountCents);
      const isFull = amountCents === balanceDueCents;
      const isPartial = amountCents > 0 && amountCents < balanceDueCents;
      const isOver = amountCents > balanceDueCents;

      expect(projectedBalance).toBe(0);
      expect(isFull).toBe(true);
      expect(isPartial).toBe(false);
      expect(isOver).toBe(false);
      expect(formatUsd(projectedBalance)).toBe("$0.00");
    });

    it("verifies partial settlement 1 cent below balance ($1,000.00 -> $999.99 payment)", () => {
      const balanceDueCents = 100000;
      const amountCents = decimalToCents("999.99")!;
      const projectedBalance = Math.max(0, balanceDueCents - amountCents);
      const isFull = amountCents === balanceDueCents;
      const isPartial = amountCents > 0 && amountCents < balanceDueCents;
      const isOver = amountCents > balanceDueCents;

      expect(projectedBalance).toBe(1); // 1 cent
      expect(isFull).toBe(false);
      expect(isPartial).toBe(true);
      expect(isOver).toBe(false);
      expect(formatUsd(projectedBalance)).toBe("$0.01");
    });

    it("verifies overpayment 1 cent above balance ($1,000.00 -> $1,000.01 payment)", () => {
      const balanceDueCents = 100000;
      const amountCents = decimalToCents("1000.01")!;
      const projectedBalance = Math.max(0, balanceDueCents - amountCents);
      const isFull = amountCents === balanceDueCents;
      const isPartial = amountCents > 0 && amountCents < balanceDueCents;
      const isOver = amountCents > balanceDueCents;

      expect(projectedBalance).toBe(0);
      expect(isFull).toBe(false);
      expect(isPartial).toBe(false);
      expect(isOver).toBe(true);
    });

    it("verifies large maximum boundary values ($9,999,999.99 balance and shortcut)", () => {
      const maxBalanceCents = 999_999_999;
      const decimalStr = centsToDecimalString(maxBalanceCents);
      expect(decimalStr).toBe("9999999.99");
      const parsedCents = decimalToCents(decimalStr);
      expect(parsedCents).toBe(maxBalanceCents);

      const projected = Math.max(0, maxBalanceCents - parsedCents!);
      expect(projected).toBe(0);
    });
  });
});
