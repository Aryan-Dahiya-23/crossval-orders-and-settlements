"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signupRequestSchema, type SignupRequest } from "@crossval/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { useSignup } from "../../features/auth/queries";
import { ApiError } from "../../lib/api-client";
import { Alert } from "../ui/alert";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/input";

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
      if (error instanceof ApiError && error.details?.fields?.email?.[0]) {
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
        hint="Use at least 12 characters."
        error={errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a secure password"
          aria-invalid={errors.password !== undefined}
          {...register("password")}
        />
      </Field>
      {errors.root?.message ? <Alert>{errors.root.message}</Alert> : null}
      <Button className="mt-1 w-full" disabled={signup.isPending} type="submit">
        {signup.isPending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          className="font-semibold text-slate-950 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
          href="/login"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
