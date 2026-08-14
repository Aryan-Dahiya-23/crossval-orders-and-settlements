"use client";

import type { Viewer } from "@crossval/contracts";
import { RiWifiOffLine } from "@remixicon/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "../../features/auth/queries";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";

interface ProtectedRouteProps {
  children: (viewer: Viewer) => ReactNode;
}

const SessionError = ({ retry }: { retry: () => void }) => (
  <main
    className="grid min-h-screen place-items-center bg-slate-50 p-6"
    role="alert"
  >
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-red-50 text-red-600">
        <RiWifiOffLine className="size-5" />
      </span>
      <h1 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">
        We couldn&apos;t verify your session
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Check the API connection and try again.
      </p>
      <Button className="mt-5" type="button" onClick={retry}>
        Try again
      </Button>
    </div>
  </main>
);

const SessionLoading = () => (
  <main
    className="grid min-h-screen place-items-center bg-slate-50 p-6"
    aria-busy="true"
    aria-live="polite"
  >
    <div className="w-full max-w-md space-y-3 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <Skeleton className="h-8 w-8" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-full" />
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
