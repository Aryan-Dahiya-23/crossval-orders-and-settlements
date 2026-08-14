"use client";

import type { Viewer } from "@crossval/contracts";
import * as Dialog from "@radix-ui/react-dialog";
import {
  RiCloseLine,
  RiFileList3Line,
  RiMenuLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { LogoutButton } from "../auth/logout-button";

export function Brand() {
  return (
    <Link
      className="inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
      href="/orders"
      aria-label="CrossVal orders"
    >
      <span className="grid size-8 place-items-center rounded-[10px] bg-slate-950 text-white shadow-sm">
        <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
          <i className="block h-2 w-1 rounded-sm bg-white/70" />
          <i className="block h-3.5 w-1 rounded-sm bg-white" />
          <i className="block h-2.5 w-1 rounded-sm bg-white/80" />
        </span>
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
        CrossVal
      </span>
    </Link>
  );
}

function Navigation() {
  return (
    <nav aria-label="Workspace navigation">
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        Workspace
      </p>
      <Link
        href="/orders"
        aria-current="page"
        className="flex h-10 items-center gap-3 rounded-[10px] bg-slate-100 px-3 text-sm font-semibold text-slate-950 outline-none transition hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-slate-950"
      >
        <RiFileList3Line className="size-[18px]" />
        Orders &amp; settlements
      </Link>
    </nav>
  );
}

function Account({ viewer }: { viewer: Viewer }) {
  return (
    <div className="border-t border-slate-200 pt-4">
      <div className="mb-3 flex items-center gap-2.5 px-1">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold uppercase text-slate-700">
          {viewer.email.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-800">
            {viewer.email}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
            <RiShieldCheckLine className="size-3.5" /> Secure workspace
          </p>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

function SidebarContent({ viewer }: { viewer: Viewer }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[68px] items-center border-b border-slate-200 px-5">
        <Brand />
      </div>
      <div className="flex-1 px-4 py-5">
        <Navigation />
      </div>
      <div className="px-4 pb-4">
        <Account viewer={viewer} />
      </div>
    </div>
  );
}

export function AppShell({
  viewer,
  children,
}: {
  viewer: Viewer;
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <a
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-slate-200 bg-white lg:block">
        <SidebarContent viewer={viewer} />
      </aside>

      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 shadow-sm outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-950"
          type="button"
          aria-label="Open navigation"
          onClick={() => setMenuOpen(true)}
        >
          <RiMenuLine className="size-5" />
        </button>
      </header>

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(86vw,300px)] bg-white shadow-2xl outline-none lg:hidden">
            <Dialog.Title className="sr-only">
              Workspace navigation
            </Dialog.Title>
            <SidebarContent viewer={viewer} />
            <Dialog.Close asChild>
              <button
                className="absolute right-3 top-[17px] grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-950"
                type="button"
                aria-label="Close navigation"
              >
                <RiCloseLine className="size-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:pl-[248px]">
        <main
          id="main-content"
          className="mx-auto min-h-screen w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
