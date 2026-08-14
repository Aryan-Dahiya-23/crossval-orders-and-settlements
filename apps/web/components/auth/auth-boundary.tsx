"use client";

import type { Viewer } from "@crossval/contracts";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSession } from "../../features/auth/queries";

interface ProtectedRouteProps {
  children: (viewer: Viewer) => ReactNode;
}

const SessionError = ({ retry }: { retry: () => void }) => (
  <main className="route-state" role="alert">
    <div className="route-state-card">
      <p className="eyebrow">Connection problem</p>
      <h1>We couldn&apos;t verify your session.</h1>
      <p>Check the API connection and try again.</p>
      <button className="primary-button" type="button" onClick={retry}>
        Try again
      </button>
    </div>
  </main>
);

const SessionLoading = () => (
  <main className="route-state" aria-busy="true" aria-live="polite">
    <div className="route-state-card session-skeleton">
      <span />
      <span />
      <span />
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
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [pathname, router, session.data, session.isError, session.isPending]);

  if (session.isPending || session.data === null) {
    return <SessionLoading />;
  }
  if (session.isError) {
    return <SessionError retry={() => void session.refetch()} />;
  }
  return children(session.data);
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session.data !== null && session.data !== undefined) {
      router.replace("/orders");
    }
  }, [router, session.data]);

  if (session.isPending) {
    return <SessionLoading />;
  }
  if (session.isError) {
    return <SessionError retry={() => void session.refetch()} />;
  }
  if (session.data !== null) {
    return <SessionLoading />;
  }
  return children;
}
