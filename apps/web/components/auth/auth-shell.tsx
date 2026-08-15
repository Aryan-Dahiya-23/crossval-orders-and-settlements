import { RiCheckLine, RiLock2Line, RiShieldCheckLine } from "@remixicon/react";
import type { ReactNode } from "react";

import { Brand } from "../layout/app-shell";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-bg-weak-50 lg:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)] xl:grid-cols-[560px_minmax(0,1fr)]">
      <section className="flex min-h-screen flex-col bg-bg-white-0 px-6 py-6 border-stroke-soft-200 sm:px-10 lg:border-r lg:px-14 lg:py-10">
        <Brand />
        <div className="my-auto mx-auto w-full max-w-[400px] py-10 sm:py-14">
          <p className="text-subheading-xs uppercase font-medium text-text-soft-400">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-title-h4 font-semibold text-text-strong-950 tracking-tight sm:text-title-h3">
            {title}
          </h1>
          <p className="mt-2 text-paragraph-sm leading-6 text-text-sub-600">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
        <div className="flex items-center justify-between pt-6 text-paragraph-xs text-text-soft-400">
          <p className="flex items-center gap-1.5">
            <RiLock2Line className="size-3.5 shrink-0" /> Secure, audit-ready finance operations
          </p>
          <span className="hidden sm:inline">© 2026 CrossVal</span>
        </div>
      </section>

      <aside
        className="relative hidden min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F6F8FF] p-10 lg:flex"
        aria-label="Product overview"
      >
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-primary-base/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 size-96 rounded-full bg-information-base/10 blur-3xl" />

        <div className="relative w-full max-w-[520px] rounded-20 bg-bg-white-0 p-5 shadow-regular-md ring-1 ring-inset ring-stroke-soft-200">
          <div className="flex items-center justify-between border-b border-stroke-soft-200 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-primary-alpha-10 text-primary-base ring-1 ring-inset ring-primary-base/20">
                <RiShieldCheckLine className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-label-sm font-semibold text-text-strong-950">Receivables &amp; Settlements</p>
                <p className="text-paragraph-xs text-text-sub-600">CrossVal Financial Operations</p>
              </div>
            </div>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-success-lighter px-2.5 text-label-xs font-medium text-success-dark">
              <span className="size-1.5 rounded-full bg-success-base" />
              Audit Active
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-12 bg-bg-weak-50 p-3">
              <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium">Committed</p>
              <p className="mt-1 text-label-sm font-semibold tabular-nums text-text-strong-950">$24,500.00</p>
            </div>
            <div className="rounded-12 bg-bg-weak-50 p-3">
              <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium">Settled</p>
              <p className="mt-1 text-label-sm font-semibold tabular-nums text-success-dark">$18,200.00</p>
            </div>
            <div className="rounded-12 bg-bg-weak-50 p-3">
              <p className="text-subheading-2xs uppercase text-text-soft-400 font-medium">Balance</p>
              <p className="mt-1 text-label-sm font-semibold tabular-nums text-text-strong-950">$6,300.00</p>
            </div>
          </div>

          <div className="mt-4 space-y-2 rounded-12 border border-stroke-soft-200 p-3.5">
            <div className="flex items-center justify-between text-paragraph-xs">
              <span className="font-medium text-text-strong-950">Latest settlement update</span>
              <span className="text-text-soft-400">Atomic write</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-bg-weak-50 p-2.5 text-paragraph-xs">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-success-base" />
                <span className="font-medium text-text-strong-950">ORD-1048 · Acme Corp</span>
              </div>
              <span className="font-semibold text-text-strong-950 tabular-nums">+$3,400.00</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-alpha-10 px-2.5 py-1 text-label-xs font-medium text-primary-base">
              <RiCheckLine className="size-3.5" /> Integer-cents precision
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-alpha-10 px-2.5 py-1 text-label-xs font-medium text-primary-base">
              <RiCheckLine className="size-3.5" /> Idempotent writes
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-bg-weak-50 px-2.5 py-1 text-label-xs font-medium text-text-sub-600">
              Zero race conditions
            </span>
          </div>
        </div>

        <div className="relative mt-10 max-w-md text-center">
          <h2 className="text-title-h5 font-semibold text-text-strong-950 tracking-tight">
            Precise receivables &amp; settlements
          </h2>
          <p className="mt-2 text-paragraph-sm leading-relaxed text-text-sub-600">
            Track every order from draft to paid, with payment writes protected against duplicates, overpayment, and race conditions.
          </p>
        </div>
      </aside>
    </main>
  );
}
