import { describe, expect, it } from "vitest";

import {
  defaultOrderListQuery,
  getOrderResultRange,
  normalizeOrderSearch,
  orderListHref,
  parseOrderListState,
  patchOrderListState,
  serializeOrderListState,
  shouldCorrectOrderPage,
} from "./list-state";

describe("order list URL state", () => {
  it("uses exact defaults for an empty query", () => {
    expect(parseOrderListState(new URLSearchParams())).toEqual(
      defaultOrderListQuery,
    );
    expect(orderListHref(defaultOrderListQuery)).toBe("/orders");
  });

  it("parses and serializes every supported value deterministically", () => {
    const parsed = parseOrderListState(
      new URLSearchParams(
        "status=partially_paid&search=%20Acme%20%20MENA%20&sort=totalAmount&direction=asc&page=3&pageSize=25",
      ),
    );
    expect(parsed).toEqual({
      status: "partially_paid",
      search: "Acme MENA",
      sort: "totalAmount",
      direction: "asc",
      page: 3,
      pageSize: 25,
    });
    expect(serializeOrderListState(parsed).toString()).toBe(
      "status=partially_paid&search=Acme+MENA&sort=totalAmount&direction=asc&page=3&pageSize=25",
    );
    expect(parseOrderListState(serializeOrderListState(parsed))).toEqual(
      parsed,
    );
  });

  it("normalizes invalid and repeated known parameters to defaults", () => {
    const params = new URLSearchParams(
      "status=paid&status=overdue&sort=customer&direction=sideways&page=0&pageSize=20",
    );
    expect(parseOrderListState(params)).toEqual(defaultOrderListQuery);
  });

  it("normalizes and bounds search", () => {
    expect(normalizeOrderSearch("  Acme   MENA  ")).toBe("Acme MENA");
    expect(normalizeOrderSearch("x".repeat(250))).toHaveLength(200);
    expect(parseOrderListState(new URLSearchParams("search=%20%20"))).toEqual(
      defaultOrderListQuery,
    );
    expect(
      serializeOrderListState({
        ...defaultOrderListQuery,
        search: "   ",
      }).toString(),
    ).toBe("");
  });

  it("resets page for filter changes and preserves it for page changes", () => {
    const current = { ...defaultOrderListQuery, page: 4 };
    expect(patchOrderListState(current, { status: "overdue" })).toMatchObject({
      status: "overdue",
      page: 1,
    });
    expect(
      patchOrderListState(current, { page: 2 }, { resetPage: false }),
    ).toMatchObject({ page: 2 });
    expect(
      patchOrderListState({ ...current, search: "Acme" }, { search: null }),
    ).not.toHaveProperty("search");
  });
});

describe("order list pagination", () => {
  it("calculates zero, middle, and partial-final ranges", () => {
    expect(
      getOrderResultRange({
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      }),
    ).toEqual({ start: 0, end: 0 });
    expect(
      getOrderResultRange({
        page: 2,
        pageSize: 10,
        totalItems: 38,
        totalPages: 4,
      }),
    ).toEqual({ start: 11, end: 20 });
    expect(
      getOrderResultRange({
        page: 4,
        pageSize: 10,
        totalItems: 38,
        totalPages: 4,
      }),
    ).toEqual({ start: 31, end: 38 });
  });

  it("corrects only non-empty out-of-range pages", () => {
    expect(
      shouldCorrectOrderPage({
        page: 9,
        pageSize: 10,
        totalItems: 38,
        totalPages: 4,
      }),
    ).toBe(true);
    expect(
      shouldCorrectOrderPage({
        page: 9,
        pageSize: 10,
        totalItems: 0,
        totalPages: 0,
      }),
    ).toBe(false);
  });
});
