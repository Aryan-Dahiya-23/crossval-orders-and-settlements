"use client";

import type { OrderListQuery } from "@crossval/contracts";
import { RiCloseLine, RiSearchLine } from "@remixicon/react";
import { useEffect, useState } from "react";

import { normalizeOrderSearch } from "../../features/orders/list-state";
import * as Input from "../ui/input";
import * as Select from "../ui/select";
import { cn } from "../../lib/cn";

const filters: Array<{
  value: OrderListQuery["status"];
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

type OrderSort = OrderListQuery["sort"];
type OrderDirection = OrderListQuery["direction"];

const sortOptions: Array<{
  value: `${OrderSort}:${OrderDirection}`;
  label: string;
  sort: OrderSort;
  direction: OrderDirection;
}> = [
  {
    value: "createdAt:desc",
    label: "Newest first",
    sort: "createdAt",
    direction: "desc",
  },
  {
    value: "createdAt:asc",
    label: "Oldest first",
    sort: "createdAt",
    direction: "asc",
  },
  {
    value: "dueDate:asc",
    label: "Due date: soonest",
    sort: "dueDate",
    direction: "asc",
  },
  {
    value: "dueDate:desc",
    label: "Due date: latest",
    sort: "dueDate",
    direction: "desc",
  },
  {
    value: "totalAmount:asc",
    label: "Total: low to high",
    sort: "totalAmount",
    direction: "asc",
  },
  {
    value: "totalAmount:desc",
    label: "Total: high to low",
    sort: "totalAmount",
    direction: "desc",
  },
];

export function OrdersToolbar({
  query,
  onStatusChange,
  onSearchChange,
  onSortChange,
}: {
  query: OrderListQuery;
  onStatusChange: (status: OrderListQuery["status"]) => void;
  onSearchChange: (search: string | null) => void;
  onSortChange: (sort: OrderSort, direction: OrderDirection) => void;
}) {
  const appliedSearch = query.search ?? "";
  const [searchDraft, setSearchDraft] = useState(appliedSearch);

  useEffect(() => {
    const normalized = normalizeOrderSearch(searchDraft);
    if (normalized === appliedSearch) return;
    const timeout = window.setTimeout(
      () => onSearchChange(normalized.length > 0 ? normalized : null),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [appliedSearch, onSearchChange, searchDraft]);

  const sortValue = `${query.sort}:${query.direction}`;

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      {/* Segmented status filter */}
      <div
        className="inline-flex rounded-10 bg-bg-weak-50 p-1 ring-1 ring-inset ring-stroke-soft-200 overflow-x-auto"
        role="group"
        aria-label="Filter orders by status"
      >
        {filters.map((filter) => {
          const isActive = query.status === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              className={cn(
                "h-8 shrink-0 rounded-lg px-3 text-label-xs font-medium transition duration-200 ease-out outline-none",
                isActive
                  ? "bg-bg-white-0 text-text-strong-950 shadow-regular-xs font-semibold"
                  : "text-text-sub-600 hover:text-text-strong-950 hover:bg-bg-soft-200/40",
              )}
              onClick={() => onStatusChange(filter.value)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-paragraph-xs text-text-sub-600">
          <span className="shrink-0 font-medium">Sort by</span>
          <Select.Select
            aria-label="Sort orders"
            value={sortValue}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
              const selected = sortOptions.find(
                (option) => option.value === event.target.value,
              );
              if (selected) onSortChange(selected.sort, selected.direction);
            }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select.Select>
        </label>

        <div className="relative block w-full sm:w-[260px]">
          <label className="sr-only" htmlFor="orders-customer-search">
            Search customers
          </label>
          <Input.Root size="small" className="w-full">
            <Input.Wrapper>
              <Input.Icon as={RiSearchLine} />
              <Input.InputSlot
                id="orders-customer-search"
                type="search"
                value={searchDraft}
                placeholder="Search customers"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchDraft(event.target.value)}
                onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                  if (event.key === "Escape" && searchDraft.length > 0) {
                    event.preventDefault();
                    setSearchDraft("");
                    onSearchChange(null);
                  }
                }}
              />
              {searchDraft.length > 0 ? (
                <button
                  className="grid size-5 place-items-center text-text-soft-400 hover:text-text-strong-950"
                  type="button"
                  aria-label="Clear customer search"
                  onClick={() => {
                    setSearchDraft("");
                    onSearchChange(null);
                  }}
                >
                  <RiCloseLine className="size-4" />
                </button>
              ) : null}
            </Input.Wrapper>
          </Input.Root>
        </div>
      </div>
    </div>
  );
}
