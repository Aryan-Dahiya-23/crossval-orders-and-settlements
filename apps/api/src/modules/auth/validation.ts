import type { ZodType } from "zod";

import { AppError } from "../../errors/app-error.js";

const normalizeEmailInput = (body: unknown): unknown => {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return body;
  }

  const record = body as Record<string, unknown>;
  return {
    ...record,
    ...(typeof record.email === "string" && {
      email: record.email.trim().toLowerCase(),
    }),
  };
};

export const parseAuthBody = <Output>(
  schema: ZodType<Output>,
  body: unknown,
): Output => {
  const result = schema.safeParse(normalizeEmailInput(body));

  if (result.success) {
    return result.data;
  }

  const fields: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "root";
    (fields[field] ??= []).push(issue.message);
  }

  throw new AppError({
    status: 422,
    code: "VALIDATION_FAILED",
    message: "Please correct the highlighted fields.",
    details: { fields },
  });
};
