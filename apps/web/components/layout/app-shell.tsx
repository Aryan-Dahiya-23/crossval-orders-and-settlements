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
      className="inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
      href="/orders"
      aria-label="CrossVal orders"
    >
      <span className="flex size-8 items-center justify-center rounded-10 bg-primary-base text-static-white shadow-regular-xs">
        <span className="flex h-3.5 items-end gap-0.5" aria-hidden="true">
          <i className="block h-2 w-1 rounded-xs bg-static-white/70" />
          <i className="block h-3.5 w-1 rounded-xs bg-static-white" />
          <i className="block h-2.5 w-1 rounded-xs bg-static-white/80" />
        </span>
      </span>
      <span className="text-label-md font-semibold tracking-tight text-text-strong-950">
        CrossVal
      </span>
    </Link>
  );
}

function Navigation() {
  return (
    <nav aria-label="Workspace navigation">
      <p className="mb-2 px-3 text-subheading-xs uppercase font-medium text-text-soft-400">
        Workspace
      </p>
      <div className="relative">
        <Link
          href="/orders"
          aria-current="page"
          className="group relative flex h-10 items-center gap-3 rounded-10 bg-bg-weak-50 px-3 text-label-sm font-semibold text-text-strong-950 outline-none transition duration-200 ease-out hover:bg-bg-soft-200/50 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
        >
          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-base" />
          <RiFileList3Line className="size-[18px] text-text-strong-950" />
          Orders &amp; settlements
        </Link>
      </div>
    </nav>
  );
}

function Account({ viewer }: { viewer: Viewer }) {
  return (
    <div className="border-t border-stroke-soft-200 pt-4">
      <div className="mb-3 flex items-center gap-3 px-1">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-weak-50 text-label-xs font-semibold uppercase text-text-sub-600 ring-1 ring-inset ring-stroke-soft-200">
          {viewer.email.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-xs font-medium text-text-strong-950">
            {viewer.email}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-subheading-2xs text-text-soft-400">
            <RiShieldCheckLine className="size-3.5 text-success-base" /> Secure workspace
          </p>
        </div>
      </div>
      <LogoutButton />
    </div>
  );
}

function SidebarContent({ viewer }: { viewer: Viewer }) {
  return (
    <div className="flex h-full flex-col bg-bg-white-0">
      <div className="flex h-[68px] items-center border-b border-stroke-soft-200 px-6">
        <Brand />
      </div>
      <div className="flex-1 px-4 py-6">
        <Navigation />
      </div>
      <div className="px-4 pb-5">
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
    <div className="min-h-screen bg-bg-weak-50 text-text-strong-950">
      <a
        className="fixed left-4 top-3 z-[70] -translate-y-20 rounded-lg bg-primary-base px-3 py-2 text-label-sm font-semibold text-static-white transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] border-r border-stroke-soft-200 bg-bg-white-0 lg:block">
        <SidebarContent viewer={viewer} />
      </aside>

      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-stroke-soft-200 bg-bg-white-0/95 px-4 backdrop-blur-[10px] lg:hidden">
        <Brand />
        <button
          className="flex size-9 items-center justify-center rounded-lg bg-bg-white-0 text-text-sub-600 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200 outline-none hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
          type="button"
          aria-label="Open navigation"
          onClick={() => setMenuOpen(true)}
        >
          <RiMenuLine className="size-5" />
        </button>
      </header>

      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-overlay backdrop-blur-[10px] lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(86vw,300px)] bg-bg-white-0 shadow-regular-md outline-none lg:hidden">
            <Dialog.Title className="sr-only">
              Workspace navigation
            </Dialog.Title>
            <SidebarContent viewer={viewer} />
            <Dialog.Close asChild>
              <button
                className="absolute right-3 top-[17px] flex size-8 items-center justify-center rounded-lg text-text-soft-400 hover:bg-bg-weak-50 focus-visible:ring-2 focus-visible:ring-stroke-strong-950"
                type="button"
                aria-label="Close navigation"
              >
                <RiCloseLine className="size-5" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="lg:pl-[272px]">
        <main
          id="main-content"
          className="mx-auto min-h-screen w-full max-w-[1360px] p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
