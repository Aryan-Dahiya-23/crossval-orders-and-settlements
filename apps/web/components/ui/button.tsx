// Align UI-inspired local primitive. Kept in-repo by design.
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { tv, type VariantProps } from "tailwind-variants";

import { cn } from "../../lib/cn";

const button = tv({
  base: "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-3.5 text-sm font-semibold outline-none transition duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2",
  variants: {
    variant: {
      primary: "bg-slate-950 text-white shadow-sm hover:bg-slate-800",
      secondary:
        "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
    },
    size: {
      medium: "h-10 px-3.5",
      small: "h-9 rounded-lg px-3",
      icon: "size-9 rounded-lg px-0",
    },
  },
  defaultVariants: { variant: "primary", size: "medium" },
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & {
    asChild?: boolean;
    children: ReactNode;
  };

export function Button({
  asChild = false,
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  );
}
