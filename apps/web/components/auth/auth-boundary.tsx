"use client";

import type { Viewer } from "@crossval/contracts";
import { RiBarChartGroupedFill, RiWifiOffLine } from "@remixicon/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "../../features/auth/queries";
import * as Button from "../ui/button";

interface ProtectedRouteProps {
  children: (viewer: Viewer) => ReactNode;
}

const SessionError = ({ retry }: { retry: () => void }) => (
  <main
    className="grid min-h-screen place-items-center bg-bg-weak-50 p-6"
    role="alert"
  >
    <div className="w-full max-w-md rounded-2xl bg-bg-white-0 p-8 text-center shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-error-lighter text-error-base">
        <RiWifiOffLine className="size-5" />
      </span>
      <h1 className="mt-4 text-title-h5 font-semibold text-text-strong-950">
        We couldn&apos;t verify your session
      </h1>
      <p className="mt-2 text-paragraph-sm leading-6 text-text-sub-600">
        Check the API connection and try again.
      </p>
      <Button.Root className="mt-5 w-full" variant="primary" size="medium" type="button" onClick={retry}>
        Try again
      </Button.Root>
    </div>
  </main>
);

const SessionLoading = () => (
  <main
    className="flex min-h-screen flex-col items-center justify-center bg-bg-weak-50 p-6 text-center"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="flex flex-col items-center gap-4">
      <div className="relative grid size-12 place-items-center rounded-2xl bg-bg-white-0 shadow-regular-sm ring-1 ring-inset ring-stroke-soft-200">
        <RiBarChartGroupedFill className="size-6 text-primary-base animate-pulse" />
      </div>
      <div className="space-y-1">
        <h3 className="text-label-sm font-semibold text-text-strong-950">CrossVal</h3>
        <p className="text-paragraph-xs text-text-sub-600">Verifying secure workspace…</p>
      </div>
    </div>
  </main>
);

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!session.isPending && !session.isError && session.data === null) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router, session.data, session.isError, session.isPending]);

  if (session.isPending || session.data === null) return <SessionLoading />;
  if (session.isError)
    return <SessionError retry={() => void session.refetch()} />;
  return children(session.data);
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.data !== null && session.data !== undefined)
      router.replace("/orders");
  }, [router, session.data]);

  if (session.isPending) return <SessionLoading />;
  if (session.isError)
    return <SessionError retry={() => void session.refetch()} />;
  if (session.data !== null) return <SessionLoading />;
  return children;
}
