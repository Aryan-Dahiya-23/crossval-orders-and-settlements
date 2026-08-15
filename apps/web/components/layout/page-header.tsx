import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-stroke-soft-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-2 text-subheading-xs uppercase font-medium text-text-soft-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-title-h5 font-semibold text-text-strong-950 sm:text-title-h4">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl text-paragraph-sm text-text-sub-600">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
