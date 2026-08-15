// AlignUI Input v0.0.0

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import type { PolymorphicComponentProps } from '@/utils/polymorphic';
import { recursiveCloneChildren } from '@/utils/recursive-clone-children';
import { tv, type VariantProps } from '@/utils/tv';
import { cnExt } from '@/utils/cn';

const INPUT_ROOT_NAME = 'InputRoot';
const INPUT_WRAPPER_NAME = 'InputWrapper';
const INPUT_EL_NAME = 'InputEl';
const INPUT_ICON_NAME = 'InputIcon';
const INPUT_AFFIX_NAME = 'InputAffixButton';
const INPUT_INLINE_AFFIX_NAME = 'InputInlineAffixButton';

export const inputVariants = tv({
  slots: {
    root: [
      // base
      'group relative flex w-full overflow-hidden bg-bg-white-0 text-text-strong-950 shadow-regular-xs',
      'transition duration-200 ease-out',
      'divide-x divide-stroke-soft-200',
      // before
      'before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-stroke-soft-200',
      'before:pointer-events-none before:rounded-[inherit]',
      'before:transition before:duration-200 before:ease-out',
      // hover
      'hover:shadow-none',
      // focus
      'has-[input:focus]:shadow-button-important-focus has-[input:focus]:before:ring-stroke-strong-950',
      // disabled
      'has-[input:disabled]:shadow-none has-[input:disabled]:before:ring-transparent',
    ],
    wrapper: [
      // base
      'group/input-wrapper flex w-full cursor-text items-center bg-bg-white-0',
      'transition duration-200 ease-out',
      // hover
      'hover:[&:not(&:has(input:focus))]:bg-bg-weak-50',
      // disabled
      'has-[input:disabled]:pointer-events-none has-[input:disabled]:bg-bg-weak-50',
    ],
    input: [
      // base
      'w-full bg-transparent bg-none text-paragraph-sm text-text-strong-950 outline-none',
      'transition duration-200 ease-out',
      // placeholder
      'placeholder:select-none placeholder:text-text-soft-400 placeholder:transition placeholder:duration-200 placeholder:ease-out',
      // hover placeholder
      'group-hover/input-wrapper:placeholder:text-text-sub-600',
      // focus
      'focus:outline-none',
      // focus placeholder
      'group-has-[input:focus]:placeholder:text-text-sub-600',
      // disabled
      'disabled:text-text-disabled-300 disabled:placeholder:text-text-disabled-300',
    ],
    icon: [
      // base
      'flex size-5 shrink-0 select-none items-center justify-center',
      'transition duration-200 ease-out',
      // placeholder state
      'group-has-[:placeholder-shown]:text-text-soft-400',
      // filled state
      'text-text-sub-600',
      // hover
      'group-has-[:placeholder-shown]:group-hover/input-wrapper:text-text-sub-600',
      // focus
      'group-has-[:placeholder-shown]:group-has-[input:focus]/input-wrapper:text-text-sub-600',
      // disabled
      'group-has-[input:disabled]/input-wrapper:text-text-disabled-300',
    ],
    affix: [
      // base
      'shrink-0 bg-bg-white-0 text-paragraph-sm text-text-sub-600',
      'flex items-center justify-center truncate',
      'transition duration-200 ease-out',
      // placeholder state
      'group-has-[:placeholder-shown]:text-text-soft-400',
      // focus state
      'group-has-[:placeholder-shown]:group-has-[input:focus]:text-text-sub-600',
    ],
    inlineAffix: [
      // base
      'text-paragraph-sm text-text-sub-600',
      // placeholder state
      'group-has-[:placeholder-shown]:text-text-soft-400',
      // focus state
      'group-has-[:placeholder-shown]:group-has-[input:focus]:text-text-sub-600',
    ],
  },
  variants: {
    size: {
      medium: {
        root: 'rounded-10',
        wrapper: 'gap-2 px-3 h-10',
        input: 'h-full',
      },
      small: {
        root: 'rounded-lg',
        wrapper: 'gap-2 px-2.5 h-9',
        input: 'h-full',
      },
      xsmall: {
        root: 'rounded-lg',
        wrapper: 'gap-1.5 px-2 h-8',
        input: 'h-full',
      },
    },
    hasError: {
      true: {
        root: [
          // base
          'before:ring-error-base',
          // focus
          'has-[input:focus]:shadow-button-error-focus has-[input:focus]:before:ring-error-base',
        ],
      },
    },
  },
  defaultVariants: {
    size: 'medium',
  },
});

type InputSharedProps = VariantProps<typeof inputVariants>;

type InputRootProps = VariantProps<typeof inputVariants> &
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
  };

const InputRoot = React.forwardRef<HTMLDivElement, InputRootProps>(
  ({ asChild, size, hasError, children, className, ...rest }, forwardedRef) => {
    const uniqueId = React.useId();
    const Component = asChild ? Slot : 'div';
    const { root } = inputVariants({ size, hasError });

    const sharedProps: InputSharedProps = {
      size,
      hasError,
    };

    const extendedChildren = recursiveCloneChildren(
      children as React.ReactElement[],
      sharedProps,
      [
        INPUT_WRAPPER_NAME,
        INPUT_ICON_NAME,
        INPUT_AFFIX_NAME,
        INPUT_INLINE_AFFIX_NAME,
      ],
      uniqueId,
      asChild,
    );

    return (
      <Component
        ref={forwardedRef}
        className={root({ class: className })}
        {...rest}
      >
        {extendedChildren}
      </Component>
    );
  },
);
InputRoot.displayName = INPUT_ROOT_NAME;

type InputWrapperProps = React.HTMLAttributes<HTMLDivElement> &
  InputSharedProps & {
    asChild?: boolean;
  };

const InputWrapper = React.forwardRef<HTMLDivElement, InputWrapperProps>(
  ({ asChild, size, hasError, className, children, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'div';
    const { wrapper } = inputVariants({ size, hasError });

    return (
      <Component
        ref={forwardedRef}
        className={wrapper({ class: className })}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);
InputWrapper.displayName = INPUT_WRAPPER_NAME;

type InputElProps = InputSharedProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    asChild?: boolean;
  };

const InputEl = React.forwardRef<HTMLInputElement, InputElProps>(
  ({ asChild, size, hasError, type = 'text', className, ...rest }, forwardedRef) => {
    const Component = asChild ? Slot : 'input';

    const { input } = inputVariants({
      size,
      hasError,
    });

    return (
      <Component
        type={type}
        className={input({ class: className })}
        ref={forwardedRef}
        {...rest}
      />
    );
  },
);
InputEl.displayName = INPUT_EL_NAME;

export interface StandaloneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  size?: 'medium' | 'small' | 'xsmall' | undefined;
  hasError?: boolean | undefined;
  icon?: React.ElementType | undefined;
  prefix?: React.ReactNode | undefined;
  suffix?: React.ReactNode | undefined;
  wrapperClassName?: string | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, StandaloneInputProps>(
  ({ size = 'medium', hasError, icon: IconComponent, prefix, suffix, className, wrapperClassName, type = 'text', ...props }, ref) => {
    const { root, wrapper, input, icon } = inputVariants({ size, hasError });

    return (
      <div className={root({ class: wrapperClassName })}>
        <div className={wrapper()}>
          {IconComponent ? (
            <div className={icon()}>
              <IconComponent className="size-4 shrink-0" />
            </div>
          ) : null}
          {prefix ? (
            <span className="text-paragraph-sm font-medium text-text-sub-600 select-none shrink-0 pr-0.5">
              {prefix}
            </span>
          ) : null}
          <input
            ref={ref}
            type={type}
            className={input({ class: className })}
            {...props}
          />
          {suffix ? (
            <span className="text-paragraph-xs text-text-soft-400 select-none shrink-0 pl-1">
              {suffix}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);
Input.displayName = 'Input';

function InputIcon<T extends React.ElementType = 'div'>({
  size,
  hasError,
  as,
  className,
  ...rest
}: PolymorphicComponentProps<T, InputSharedProps>) {
  const Component = as || 'div';
  const { icon } = inputVariants({ size, hasError });

  return <Component className={icon({ class: className })} {...rest} />;
}
InputIcon.displayName = INPUT_ICON_NAME;

function InputAffix({
  className,
  children,
  size,
  hasError,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & InputSharedProps) {
  const { affix } = inputVariants({
    size,
    hasError,
  });

  return (
    <div className={affix({ class: className })} {...rest}>
      {children}
    </div>
  );
}
InputAffix.displayName = INPUT_AFFIX_NAME;

function InputInlineAffix({
  className,
  children,
  size,
  hasError,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & InputSharedProps) {
  const { inlineAffix } = inputVariants({
    size,
    hasError,
  });

  return (
    <span className={inlineAffix({ class: className })} {...rest}>
      {children}
    </span>
  );
}
InputInlineAffix.displayName = INPUT_INLINE_AFFIX_NAME;

import { Textarea } from './textarea';
import * as LabelPrimitive from './label';
import * as HintPrimitive from './hint';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string | undefined;
  error?: string | null | undefined;
  hint?: string | undefined;
  required?: boolean | undefined;
  optional?: boolean | undefined;
  htmlFor?: string | undefined;
}

export function Field({
  label,
  error,
  hint,
  required,
  optional,
  htmlFor,
  children,
  className,
  ...rest
}: FieldProps) {
  return (
    <div className={cnExt('flex flex-col gap-1.5', className)} {...rest}>
      {label ? (
        <div className="flex items-center justify-between">
          <LabelPrimitive.Root htmlFor={htmlFor} className="text-label-sm text-text-strong-950 font-medium flex items-center">
            {label}
            {required ? <span className="text-error-base ml-0.5">*</span> : null}
          </LabelPrimitive.Root>
          {optional ? (
            <span className="text-paragraph-xs text-text-soft-400">Optional</span>
          ) : null}
        </div>
      ) : null}
      {children}
      {error ? (
        <p className="text-paragraph-xs text-error-base font-medium" role="alert">
          {error}
        </p>
      ) : hint ? (
        <HintPrimitive.Root className="text-paragraph-xs text-text-soft-400">
          {hint}
        </HintPrimitive.Root>
      ) : null}
    </div>
  );
}

export {
  InputRoot as Root,
  InputWrapper as Wrapper,
  InputEl as InputSlot,
  InputIcon as Icon,
  InputAffix as Affix,
  InputInlineAffix as InlineAffix,
  Textarea,
};
