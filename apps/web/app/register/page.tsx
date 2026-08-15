import type { Metadata } from "next";

import { PublicOnlyRoute } from "../../components/auth/auth-boundary";
import { AuthShell } from "../../components/auth/auth-shell";
import { SignupForm } from "../../components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
  description:
    "Register a new CrossVal workspace for order and receivables management.",
};

export default function RegisterPage() {
  return (
    <PublicOnlyRoute>
      <AuthShell
        eyebrow="CrossVal workspace"
        title="Create your account"
        description="Set up a private workspace for receivables operations."
      >
        <SignupForm />
      </AuthShell>
    </PublicOnlyRoute>
  );
}
