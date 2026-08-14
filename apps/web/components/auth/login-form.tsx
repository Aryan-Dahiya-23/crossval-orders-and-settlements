"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginRequestSchema, type LoginRequest } from "@crossval/contracts";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";

import { useLogin } from "../../features/auth/queries";
import { ApiError } from "../../lib/api-client";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/input";

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
    <form className="grid gap-4" onSubmit={submit} noValidate>
      <Field
        label="Email address"
        htmlFor="email"
        error={errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={errors.email !== undefined}
          {...register("email")}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          aria-invalid={errors.password !== undefined}
          {...register("password")}
        />
      </Field>
      {errors.root?.message ? <Alert>{errors.root.message}</Alert> : null}
      <Button className="mt-1 w-full" disabled={login.isPending} type="submit">
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        New to the workspace?{" "}
        <Link
          className="font-semibold text-slate-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          href="/register"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
