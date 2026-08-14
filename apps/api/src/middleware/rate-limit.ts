import type { Request, RequestHandler } from "express";
import {
  ipKeyGenerator,
  rateLimit,
  type RateLimitExceededEventHandler,
} from "express-rate-limit";

import { getRequestId } from "./request-context.js";

const rateLimitHandler: RateLimitExceededEventHandler = (
  request,
  response,
  _next,
  options,
) => {
  const retryAfter = response.getHeader("Retry-After");
  const retryAfterSeconds =
    typeof retryAfter === "string"
      ? Number.parseInt(retryAfter, 10)
      : undefined;

  response.status(options.statusCode).json({
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
      ...(Number.isInteger(retryAfterSeconds) && {
        details: { retryAfterSeconds },
      }),
      requestId: getRequestId(request),
    },
  });
};

const sharedOptions = {
  standardHeaders: "draft-8" as const,
  legacyHeaders: false,
  handler: rateLimitHandler,
};

export const generalApiRateLimit: RequestHandler = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60_000,
  limit: 300,
});

const credentialKey = (request: Request): string => {
  const body = request.body as { email?: unknown } | undefined;
  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "unknown";
  return `${ipKeyGenerator(request.ip ?? "")}:${email}`;
};

export const loginRateLimit: RequestHandler = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60_000,
  limit: 20,
  keyGenerator: credentialKey,
});

export const signupRateLimit: RequestHandler = rateLimit({
  ...sharedOptions,
  windowMs: 60 * 60_000,
  limit: 20,
  keyGenerator: (request) => ipKeyGenerator(request.ip ?? ""),
});
