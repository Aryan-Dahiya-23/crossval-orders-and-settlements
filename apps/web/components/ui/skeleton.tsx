import { cn } from "../../lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse rounded-lg bg-slate-200", className)}
    />
  );
}
