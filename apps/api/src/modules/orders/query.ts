import type { OrderListQuery } from "@crossval/contracts";
import type { Filter, Sort } from "mongodb";
import type { ObjectId } from "mongodb";

import type { OrderDocument } from "../../db/documents.js";
import { escapeRegularExpression, normalizeCustomerSearch } from "./domain.js";

export const orderListProjection = {
  lineItems: 0,
  payments: 0,
} as const;

export const buildOrderListFilter = (
  userId: ObjectId,
  query: OrderListQuery,
  todayUtc: string,
): Filter<OrderDocument> => {
  const filter: Filter<OrderDocument> = { userId };

  if (query.search !== undefined && query.search.length > 0) {
    filter.customerNameNormalized = {
      $regex: `^${escapeRegularExpression(normalizeCustomerSearch(query.search))}`,
    };
  }

  switch (query.status) {
    case "paid":
      filter.balanceDueCents = 0;
      break;
    case "overdue":
      filter.balanceDueCents = { $gt: 0 };
      filter.dueDate = { $lt: todayUtc };
      break;
    case "pending":
      filter.balanceDueCents = { $gt: 0 };
      filter.dueDate = { $gte: todayUtc };
      filter.paymentCount = 0;
      break;
    case "partially_paid":
      filter.balanceDueCents = { $gt: 0 };
      filter.dueDate = { $gte: todayUtc };
      filter.paymentCount = { $gt: 0 };
      break;
    case "all":
      break;
  }

  return filter;
};

export const buildOrderSort = (query: OrderListQuery): Sort => {
  const direction = query.direction === "asc" ? 1 : -1;
  const field = query.sort === "totalAmount" ? "totalAmountCents" : query.sort;
  return { [field]: direction, _id: direction };
};
