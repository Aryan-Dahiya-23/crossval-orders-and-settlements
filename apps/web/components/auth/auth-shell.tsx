import { RiLock2Line } from "@remixicon/react";
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
    <main className="grid min-h-screen bg-bg-weak-50 lg:grid-cols-[minmax(420px,.9fr)_minmax(520px,1.1fr)]">
      <section className="flex flex-col bg-bg-white-0 px-6 py-6 border-r border-stroke-soft-200 sm:px-10 lg:px-14 lg:py-10">
        <Brand />
        <div className="my-auto mx-auto w-full max-w-[400px] py-14">
          <p className="text-subheading-xs uppercase font-medium text-text-soft-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-title-h4 font-semibold text-text-strong-950">
            {title}
          </h1>
          <p className="mt-2 text-paragraph-sm leading-6 text-text-sub-600">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="flex items-center gap-1.5 text-paragraph-xs text-text-soft-400">
          <RiLock2Line className="size-3.5" /> Secure, audit-ready finance
          operations
        </p>
      </section>

      <aside
        className="relative hidden overflow-hidden bg-primary-base p-12 text-static-white lg:flex lg:flex-col lg:justify-between"
        aria-label="Product overview"
      >
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-static-white/15 bg-static-white/10 px-3 py-1 text-label-xs text-static-white">
            Orders &amp; settlements
          </span>
        </div>
        <div className="relative max-w-xl">
          <blockquote className="text-title-h4 font-medium leading-[1.3] text-static-white">
            Financial operations need a clear state, a reliable audit trail, and
            no ambiguity around money.
          </blockquote>
          <p className="mt-5 max-w-lg text-paragraph-sm leading-6 text-static-white/70">
            Track every order from pending to paid, with payment writes
            protected against duplicates and overpayment.
          </p>
        </div>
        <div className="relative grid grid-cols-3 divide-x divide-static-white/10 border-t border-static-white/10 pt-6 text-paragraph-xs text-static-white/70">
          <span>Integer-cents money</span>
          <span className="pl-5">Idempotent writes</span>
          <span className="pl-5">Auditable history</span>
        </div>
      </aside>
    </main>
  );
}
