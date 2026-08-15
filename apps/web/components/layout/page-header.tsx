import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export type PageHeaderProps = {
  title: string;
  description?: string | undefined;
  eyebrow?: string | undefined;
  action?: ReactNode | undefined;
  actions?: ReactNode | undefined;
  icon?: ReactNode | undefined;
  className?: string | undefined;
};

export function PageHeader({
  action,
  actions,
  description,
  eyebrow,
  icon,
  title,
  className,
}: PageHeaderProps) {
  const actionContent = action ?? actions;

  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <p className="text-subheading-xs uppercase font-medium text-text-soft-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-lighter/80 text-primary-base ring-1 ring-inset ring-primary-base/20">
              {icon}
            </div>
          ) : null}
          <h1 className="text-title-h4 font-semibold text-text-strong-950 tracking-tight sm:text-title-h3">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="max-w-2xl text-paragraph-sm text-text-sub-600">
            {description}
          </p>
        ) : null}
      </div>
      {actionContent ? (
        <div className="shrink-0 flex flex-wrap items-center gap-3">
          {actionContent}
        </div>
      ) : null}
    </header>
  );
}

export default PageHeader;
