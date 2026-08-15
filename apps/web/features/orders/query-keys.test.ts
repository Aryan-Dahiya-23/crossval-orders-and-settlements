import type { OrderListQuery } from "@crossval/contracts";
import { describe, expect, it } from "vitest";

import { defaultOrderListQuery } from "./list-state";
import { orderKeys } from "./query-keys";

describe("order query keys", () => {
  it("contains every server-affecting list parameter as a stable primitive", () => {
    const query: OrderListQuery = {
      status: "overdue",
      search: "Acme",
      sort: "dueDate",
      direction: "asc",
      page: 2,
      pageSize: 25,
    };
    expect(orderKeys.list(query)).toEqual([
      "orders",
      "list",
      "overdue",
      "Acme",
      "dueDate",
      "asc",
      2,
      25,
    ]);
  });

  it("keeps all list keys under the invalidatable list prefix", () => {
    const prefix = orderKeys.lists();
    const key = orderKeys.list(defaultOrderListQuery);
    expect(key.slice(0, prefix.length)).toEqual(prefix);
    expect(orderKeys.summaries()).not.toEqual(prefix);
    expect(orderKeys.detail("order-id")).not.toEqual(prefix);
  });

  it("changes when any server parameter changes", () => {
    const base = orderKeys.list(defaultOrderListQuery);
    const variants: OrderListQuery[] = [
      { ...defaultOrderListQuery, status: "paid" },
      { ...defaultOrderListQuery, search: "Acme" },
      { ...defaultOrderListQuery, sort: "dueDate" },
      { ...defaultOrderListQuery, direction: "asc" },
      { ...defaultOrderListQuery, page: 2 },
      { ...defaultOrderListQuery, pageSize: 25 },
    ];
    for (const variant of variants) {
      expect(orderKeys.list(variant)).not.toEqual(base);
    }
  });
});
