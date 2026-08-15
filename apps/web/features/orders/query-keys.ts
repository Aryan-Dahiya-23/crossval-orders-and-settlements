import type { OrderListQuery } from "@crossval/contracts";

export const orderKeys = {
  all: ["orders"] as const,
  lists: () => ["orders", "list"] as const,
  list: (params: OrderListQuery) =>
    [
      "orders",
      "list",
      params.status,
      params.search ?? "",
      params.sort,
      params.direction,
      params.page,
      params.pageSize,
    ] as const,
  summaries: () => ["orders", "summary"] as const,
  detail: (orderId: string) => ["orders", "detail", orderId] as const,
};
