"use client";

import { ProtectedRoute } from "./auth-boundary";
import { LogoutButton } from "./logout-button";

export function AuthenticatedWorkspace() {
  return (
    <ProtectedRoute>
      {(viewer) => (
        <main className="workspace-shell">
          <header className="workspace-header">
            <div>
              <p className="eyebrow">Authenticated workspace</p>
              <h1>Orders &amp; Settlements</h1>
            </div>
            <div className="viewer-block">
              <span>{viewer.email}</span>
              <LogoutButton />
            </div>
          </header>

          <section className="phase-card" aria-labelledby="phase-title">
            <p className="eyebrow">Phase 3 complete</p>
            <h2 id="phase-title">Your account boundary is ready.</h2>
            <p>
              Authentication, session rotation, and private route handling are
              active. Order workflows begin in Phase 4.
            </p>
          </section>
        </main>
      )}
    </ProtectedRoute>
  );
}
