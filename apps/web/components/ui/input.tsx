// Align UI-inspired local form primitives.
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string | undefined;
  optional?: boolean;
  children: ReactNode;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional = false,
  children,
}: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-800" htmlFor={htmlFor}>
          {label}
        </label>
        {optional ? (
          <span className="text-xs text-slate-400">Optional</span>
        ) : null}
      </div>
      {children}
      {error ? (
        <p
          className="text-xs leading-5 text-red-600"
          id={`${htmlFor}-error`}
          role="alert"
        >
          {error}
        </p>
      ) : hint ? (
        <div className="text-xs leading-5 text-slate-500">{hint}</div>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-[10px] border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-y rounded-[10px] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10 aria-[invalid=true]:border-red-500",
        className,
      )}
      {...props}
    />
  );
}
