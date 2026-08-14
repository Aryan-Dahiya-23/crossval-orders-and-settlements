import type { Metadata } from "next";

import { PublicOnlyRoute } from "../../components/auth/auth-boundary";
import { SignupForm } from "../../components/auth/signup-form";

export const metadata: Metadata = { title: "Create account | CrossVal" };

export default function RegisterPage() {
  return (
    <PublicOnlyRoute>
      <main className="auth-shell">
        <section className="auth-card" aria-labelledby="register-title">
          <div className="brand-mark" aria-hidden="true">
            CV
          </div>
          <p className="eyebrow">CrossVal workspace</p>
          <h1 id="register-title">Create your account</h1>
          <p className="auth-intro">
            Set up a private workspace for receivables operations.
          </p>
          <SignupForm />
        </section>
      </main>
    </PublicOnlyRoute>
  );
}
