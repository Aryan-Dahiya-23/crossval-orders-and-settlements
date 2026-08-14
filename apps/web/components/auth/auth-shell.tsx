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
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(420px,.9fr)_minmax(520px,1.1fr)]">
      <section className="flex flex-col bg-white px-6 py-6 sm:px-10 lg:px-14 lg:py-10">
        <Brand />
        <div className="my-auto mx-auto w-full max-w-[400px] py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.04em] text-slate-950">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <RiLock2Line className="size-3.5" /> Secure, audit-ready finance
          operations
        </p>
      </section>

      <aside
        className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between"
        aria-label="Product overview"
      >
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative">
          <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-slate-300">
            Orders &amp; settlements
          </span>
        </div>
        <div className="relative max-w-xl">
          <blockquote className="text-3xl font-medium leading-[1.25] tracking-[-0.035em]">
            Financial operations need a clear state, a reliable audit trail, and
            no ambiguity around money.
          </blockquote>
          <p className="mt-5 max-w-lg text-sm leading-6 text-slate-400">
            Track every order from pending to paid, with payment writes
            protected against duplicates and overpayment.
          </p>
        </div>
        <div className="relative grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6 text-xs text-slate-400">
          <span>Integer-cents money</span>
          <span className="pl-5">Idempotent writes</span>
          <span className="pl-5">Auditable history</span>
        </div>
      </aside>
    </main>
  );
}
