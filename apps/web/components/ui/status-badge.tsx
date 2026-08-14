import type { ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

import { cn } from "../../lib/cn";

const badge = tv({
  base: "inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium ring-1 ring-inset",
  variants: {
    tone: {
      neutral: "bg-slate-50 text-slate-600 ring-slate-200",
      info: "bg-blue-50 text-blue-700 ring-blue-200",
      success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      danger: "bg-red-50 text-red-700 ring-red-200",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function StatusBadge({
  tone,
  children,
  className,
}: VariantProps<typeof badge> & { children: ReactNode; className?: string }) {
  return (
    <span className={cn(badge({ tone }), className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
