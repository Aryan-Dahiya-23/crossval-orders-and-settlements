import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicOnlyRoute } from "../../components/auth/auth-boundary";
import { LoginForm } from "../../components/auth/login-form";

export const metadata: Metadata = { title: "Sign in | CrossVal" };

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <main className="auth-shell">
        <section className="auth-card" aria-labelledby="login-title">
          <div className="brand-mark" aria-hidden="true">
            CV
          </div>
          <p className="eyebrow">CrossVal workspace</p>
          <h1 id="login-title">Welcome back</h1>
          <p className="auth-intro">
            Sign in to manage orders, balances, and settlements.
          </p>
          <Suspense fallback={<p className="field-help">Preparing sign in…</p>}>
            <LoginForm />
          </Suspense>
        </section>
      </main>
    </PublicOnlyRoute>
  );
}
