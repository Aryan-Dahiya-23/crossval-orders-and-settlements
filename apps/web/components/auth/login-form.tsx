"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema, type LoginRequest } from "@crossval/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { useLogin } from "../../features/auth/queries";
import { ApiError } from "../../lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { email: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
      const next = searchParams.get("next");
      router.replace(next?.startsWith("/") ? next : "/orders");
    } catch (error: unknown) {
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "Sign in failed. Please try again.",
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
          autoComplete="current-password"
          aria-invalid={errors.password !== undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
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
        disabled={login.isPending}
        type="submit"
      >
        {login.isPending ? "Signing in…" : "Sign in"}
      </button>

      <p className="auth-switch">
        New to the workspace? <Link href="/register">Create an account</Link>
      </p>
    </form>
  );
}
