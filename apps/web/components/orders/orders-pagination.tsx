"use client";

import type { OrderListQuery, PaginationMeta } from "@crossval/contracts";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";

import { getOrderResultRange } from "../../features/orders/list-state";
import * as Select from "../ui/select";
import * as Pagination from "../ui/pagination";

export function OrdersPagination({
  meta,
  requestedPage,
  requestedPageSize,
  isPlaceholderData,
  onPageChange,
  onPageSizeChange,
}: {
  meta: PaginationMeta;
  requestedPage: number;
  requestedPageSize: OrderListQuery["pageSize"];
  isPlaceholderData: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: OrderListQuery["pageSize"]) => void;
}) {
  const range = getOrderResultRange(meta);
  const hasResults = meta.totalItems > 0;

  return (
    <footer className="flex flex-col gap-3 border-t border-stroke-soft-200 bg-bg-weak-50/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-paragraph-xs text-text-sub-600" aria-live="polite">
        {hasResults ? (
          <>
            Showing{" "}
            <strong className="font-semibold text-text-strong-950">
              {range.start}–{range.end}
            </strong>{" "}
            of{" "}
            <strong className="font-semibold text-text-strong-950">
              {meta.totalItems}
            </strong>{" "}
            orders
          </>
        ) : (
          "0 orders"
        )}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto flex items-center gap-2 text-paragraph-xs text-text-sub-600 sm:mr-2">
          <span className="font-medium text-text-sub-600">Rows</span>
          <div className="w-[78px]">
            <Select.Root
              size="xsmall"
              value={String(requestedPageSize)}
              onValueChange={(value) =>
                onPageSizeChange(
                  Number(value) as OrderListQuery["pageSize"],
                )
              }
            >
              <Select.Trigger aria-label="Orders per page" className="w-full">
                <Select.Value />
              </Select.Trigger>
              <Select.Content className="min-w-[80px]">
                <Select.Item value="10">10</Select.Item>
                <Select.Item value="25">25</Select.Item>
                <Select.Item value="50">50</Select.Item>
              </Select.Content>
            </Select.Root>
          </div>
        </div>
        <span className="min-w-20 text-center text-paragraph-xs font-medium tabular-nums text-text-sub-600">
          {isPlaceholderData
            ? `Page ${requestedPage} · Updating…`
            : meta.totalPages > 0
              ? `Page ${meta.page} of ${meta.totalPages}`
              : "Page 0 of 0"}
        </span>
        <Pagination.Root>
          <Pagination.NavButton
            aria-label="Previous page"
            disabled={meta.page <= 1 || isPlaceholderData}
            onClick={() => onPageChange(meta.page - 1)}
          >
            <Pagination.NavIcon as={RiArrowLeftSLine} />
          </Pagination.NavButton>
          <Pagination.NavButton
            aria-label="Next page"
            disabled={
              !hasResults || meta.page >= meta.totalPages || isPlaceholderData
            }
            onClick={() => onPageChange(meta.page + 1)}
          >
            <Pagination.NavIcon as={RiArrowRightSLine} />
          </Pagination.NavButton>
        </Pagination.Root>
      </div>
    </footer>
  );
}
