// AlignUI Textarea v0.0.0

import * as React from 'react';

import { cnExt } from '@/utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean | undefined;
  wrapperClassName?: string | undefined;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, wrapperClassName, hasError, disabled, rows = 3, ...rest }, forwardedRef) => {
    return (
      <div
        className={cnExt(
          'group/textarea relative flex w-full flex-col rounded-xl bg-bg-white-0 p-3 shadow-regular-xs',
          'ring-1 ring-inset ring-stroke-soft-200 transition duration-200 ease-out',
          'hover:[&:not(:focus-within)]:bg-bg-weak-50',
          !hasError && [
            'hover:[&:not(:focus-within)]:ring-transparent',
            'focus-within:shadow-button-important-focus focus-within:ring-stroke-strong-950',
          ],
          hasError && [
            'ring-error-base',
            'focus-within:shadow-button-error-focus focus-within:ring-error-base',
          ],
          disabled && 'bg-bg-weak-50 ring-transparent pointer-events-none',
          wrapperClassName,
        )}
      >
        <textarea
          ref={forwardedRef}
          rows={rows}
          disabled={disabled}
          className={cnExt(
            'block w-full resize-none bg-transparent text-paragraph-sm text-text-strong-950 outline-none',
            'placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out',
            'group-hover/textarea:placeholder:text-text-sub-600',
            'focus:outline-none focus:placeholder:text-text-sub-600',
            disabled && 'text-text-disabled-300 placeholder:text-text-disabled-300',
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

function CharCounter({
  current,
  max,
  className,
}: {
  current?: number;
  max?: number;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  if (current === undefined || max === undefined) return null;

  const isError = current > max;

  return (
    <span
      className={cnExt(
        'text-subheading-2xs text-text-soft-400',
        'group-has-[[disabled]]/textarea:text-text-disabled-300',
        {
          'text-error-base': isError,
        },
        className,
      )}
    >
      {current}/{max}
    </span>
  );
}
CharCounter.displayName = 'TextareaCounter';

export { Textarea, Textarea as Root, CharCounter };
