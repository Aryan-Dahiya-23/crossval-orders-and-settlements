import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicOnlyRoute } from "../../components/auth/auth-boundary";
import { AuthShell } from "../../components/auth/auth-shell";
import { LoginForm } from "../../components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your CrossVal financial operations workspace.",
};

export default function LoginPage() {
  return (
    <PublicOnlyRoute>
      <AuthShell
        eyebrow="CrossVal workspace"
        title="Welcome back"
        description="Sign in to manage orders, balances, and settlements."
      >
        <Suspense
          fallback={
            <p className="text-paragraph-xs text-text-soft-400">Preparing sign in…</p>
          }
        >
          <LoginForm />
        </Suspense>
      </AuthShell>
    </PublicOnlyRoute>
  );
}
