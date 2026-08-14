"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signupRequestSchema, type SignupRequest } from "@crossval/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useSignup } from "../../features/auth/queries";
import { ApiError } from "../../lib/api-client";

export function SignupForm() {
  const router = useRouter();
  const signup = useSignup();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupRequest>({
    resolver: zodResolver(signupRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await signup.mutateAsync(values);
      router.replace("/orders");
    } catch (error: unknown) {
      if (
        error instanceof ApiError &&
        error.details?.fields?.email?.[0] !== undefined
      ) {
        setError("email", { message: error.details.fields.email[0] });
        return;
      }
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "Account creation failed. Please try again.",
      });
    }
  });

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="field-group">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email !== undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p className="field-error" id="email-error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password !== undefined}
          aria-describedby="password-help password-error"
          {...register("password")}
        />
        <p className="field-help" id="password-help">
          Use at least 12 characters.
        </p>
        {errors.password && (
          <p className="field-error" id="password-error">
            {errors.password.message}
          </p>
        )}
      </div>

      {errors.root && (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      )}

      <button
        className="primary-button"
        disabled={signup.isPending}
        type="submit"
      >
        {signup.isPending ? "Creating account…" : "Create account"}
      </button>

      <p className="auth-switch">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
