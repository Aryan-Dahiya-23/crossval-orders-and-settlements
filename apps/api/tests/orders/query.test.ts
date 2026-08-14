import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  buildOrderListFilter,
  buildOrderSort,
} from "../../src/modules/orders/query.js";

const userId = new ObjectId("66bd00000000000000000001");

describe("order query builders", () => {
  it("builds an ownership-led escaped prefix filter", () => {
    const filter = buildOrderListFilter(
      userId,
      {
        status: "pending",
        search: "  A.*  ",
        sort: "createdAt",
        direction: "desc",
        page: 1,
        pageSize: 10,
      },
      "2026-08-14",
    );

    expect(filter).toEqual({
      userId,
      customerNameNormalized: { $regex: "^a\\.\\*" },
      balanceDueCents: { $gt: 0 },
      dueDate: { $gte: "2026-08-14" },
      paymentCount: 0,
    });
  });

  it("maps each status to stored facts and adds deterministic sort ties", () => {
    const base = {
      search: undefined,
      sort: "totalAmount" as const,
      direction: "asc" as const,
      page: 1,
      pageSize: 10 as const,
    };

    expect(
      buildOrderListFilter(userId, { ...base, status: "paid" }, "2026-08-14"),
    ).toEqual({ userId, balanceDueCents: 0 });
    expect(
      buildOrderListFilter(
        userId,
        { ...base, status: "overdue" },
        "2026-08-14",
      ),
    ).toEqual({
      userId,
      balanceDueCents: { $gt: 0 },
      dueDate: { $lt: "2026-08-14" },
    });
    expect(buildOrderSort({ ...base, status: "all" })).toEqual({
      totalAmountCents: 1,
      _id: 1,
    });
  });
});
