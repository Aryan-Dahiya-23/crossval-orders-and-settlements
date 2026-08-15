import {
  orderDirectionValues,
  orderPageSizeValues,
  orderSortValues,
  orderStatusValues,
  type OrderListQuery,
  type PaginationMeta,
} from "@crossval/contracts";

type SearchParamsReader = Pick<URLSearchParams, "getAll">;

export const defaultOrderListQuery: OrderListQuery = {
  status: "all",
  sort: "createdAt",
  direction: "desc",
  page: 1,
  pageSize: 10,
};

const statusValues = new Set<string>(["all", ...orderStatusValues]);
const sortValues = new Set<string>(orderSortValues);
const directionValues = new Set<string>(orderDirectionValues);
const pageSizeValues = new Set<number>(orderPageSizeValues);

const getUnique = (
  searchParams: SearchParamsReader,
  name: string,
): string | null => {
  const values = searchParams.getAll(name);
  return values.length === 1 ? (values[0] ?? null) : null;
};

const parsePositiveInteger = (value: string | null): number | null => {
  if (value === null || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const normalizeOrderSearch = (value: string): string =>
  value.trim().replaceAll(/\s+/g, " ").slice(0, 200);

export const parseOrderListState = (
  searchParams: SearchParamsReader,
): OrderListQuery => {
  const rawStatus = getUnique(searchParams, "status");
  const rawSearch = getUnique(searchParams, "search");
  const rawSort = getUnique(searchParams, "sort");
  const rawDirection = getUnique(searchParams, "direction");
  const rawPage = parsePositiveInteger(getUnique(searchParams, "page"));
  const rawPageSize = parsePositiveInteger(getUnique(searchParams, "pageSize"));
  const search = normalizeOrderSearch(rawSearch ?? "");

  return {
    status: statusValues.has(rawStatus ?? "")
      ? (rawStatus as OrderListQuery["status"])
      : defaultOrderListQuery.status,
    ...(search.length > 0 && { search }),
    sort: sortValues.has(rawSort ?? "")
      ? (rawSort as OrderListQuery["sort"])
      : defaultOrderListQuery.sort,
    direction: directionValues.has(rawDirection ?? "")
      ? (rawDirection as OrderListQuery["direction"])
      : defaultOrderListQuery.direction,
    page: rawPage ?? defaultOrderListQuery.page,
    pageSize:
      rawPageSize !== null && pageSizeValues.has(rawPageSize)
        ? (rawPageSize as OrderListQuery["pageSize"])
        : defaultOrderListQuery.pageSize,
  };
};

export const serializeOrderListState = (
  state: OrderListQuery,
): URLSearchParams => {
  const searchParams = new URLSearchParams();
  if (state.status !== defaultOrderListQuery.status) {
    searchParams.set("status", state.status);
  }
  const search = normalizeOrderSearch(state.search ?? "");
  if (search.length > 0) searchParams.set("search", search);
  if (state.sort !== defaultOrderListQuery.sort) {
    searchParams.set("sort", state.sort);
  }
  if (state.direction !== defaultOrderListQuery.direction) {
    searchParams.set("direction", state.direction);
  }
  if (state.page !== defaultOrderListQuery.page) {
    searchParams.set("page", String(state.page));
  }
  if (state.pageSize !== defaultOrderListQuery.pageSize) {
    searchParams.set("pageSize", String(state.pageSize));
  }
  return searchParams;
};

export const orderListHref = (state: OrderListQuery): string => {
  const query = serializeOrderListState(state).toString();
  return query.length > 0 ? `/orders?${query}` : "/orders";
};

type OrderListStatePatch = Partial<Omit<OrderListQuery, "search">> & {
  search?: string | null;
};

export const patchOrderListState = (
  state: OrderListQuery,
  patch: OrderListStatePatch,
  options: { resetPage?: boolean } = {},
): OrderListQuery => {
  const { search: patchedSearch, ...rest } = patch;
  const next: OrderListQuery = { ...state, ...rest };
  if (Object.hasOwn(patch, "search")) {
    const search = normalizeOrderSearch(patchedSearch ?? "");
    if (search.length > 0) next.search = search;
    else delete next.search;
  }
  if (options.resetPage ?? true) next.page = 1;
  return next;
};

export const getOrderResultRange = (
  meta: PaginationMeta,
): { start: number; end: number } => {
  if (meta.totalItems === 0) return { start: 0, end: 0 };
  const start = (meta.page - 1) * meta.pageSize + 1;
  if (start > meta.totalItems) return { start: 0, end: 0 };
  return {
    start,
    end: Math.min(meta.page * meta.pageSize, meta.totalItems),
  };
};

export const shouldCorrectOrderPage = (meta: PaginationMeta): boolean =>
  meta.totalPages > 0 && meta.page > meta.totalPages;
