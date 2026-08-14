import type { OrderStatus } from "@crossval/contracts";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
};

export const formatUsd = (cents: number): string =>
  usdFormatter.format(cents / 100);

export const formatDateOnly = (date: string): string => {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)));
};

export const formatInstant = (instant: string): string =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(instant));

export const statusLabel = (status: OrderStatus): string =>
  statusLabels[status];
