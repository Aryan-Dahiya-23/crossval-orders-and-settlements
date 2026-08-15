"use client";

import type { Viewer } from "@crossval/contracts";
import { RiWifiOffLine } from "@remixicon/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "../../features/auth/queries";
import * as Button from "../ui/button";
import { Skeleton } from "../ui/skeleton";

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
    className="grid min-h-screen place-items-center bg-bg-weak-50 p-6"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="w-full max-w-md space-y-4 rounded-2xl bg-bg-white-0 p-8 shadow-regular-xs ring-1 ring-inset ring-stroke-soft-200">
      <Skeleton className="h-10 w-10 rounded-full" />
      <Skeleton className="h-6 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-md" />
      <p className="sr-only">Checking your session…</p>
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
