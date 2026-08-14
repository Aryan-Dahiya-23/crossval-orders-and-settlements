// Align UI modal anatomy backed by Radix Dialog.
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { RiCloseLine } from "@remixicon/react";
import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_160ms_ease-out]" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl outline-none",
            className,
          )}
        >
          <header className="relative border-b border-slate-200 px-5 py-4 pr-14">
            <Dialog.Title className="text-base font-semibold text-slate-950">
              {title}
            </Dialog.Title>
            {description ? (
              <Dialog.Description className="mt-1 text-sm leading-5 text-slate-500">
                {description}
              </Dialog.Description>
            ) : null}
            <Dialog.Close asChild>
              <button
                className="absolute right-4 top-4 grid size-8 place-items-center rounded-lg text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950"
                type="button"
                aria-label="Close dialog"
              >
                <RiCloseLine className="size-5" />
              </button>
            </Dialog.Close>
          </header>
          <div className="p-5">{children}</div>
          {footer ? (
            <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
              {footer}
            </footer>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
