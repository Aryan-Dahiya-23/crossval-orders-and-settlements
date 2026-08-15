import * as React from 'react';
import { cn } from '@/utils/cn';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-lg bg-bg-soft-200/70 ring-1 ring-inset ring-stroke-soft-200/40',
        className,
      )}
      {...props}
    />
  );
}
