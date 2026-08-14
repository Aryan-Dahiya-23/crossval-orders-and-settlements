import { z } from "zod";

export * from "./orders.js";

/** The infrastructure-level response exposed by the API liveness endpoint. */
export type HealthResponse = {
  status: "ok";
};

export const authEmailSchema = z
  .email("Enter a valid email address.")
  .max(254, "Email must contain at most 254 characters.");

export const signupRequestSchema = z.strictObject({
  email: authEmailSchema,
  password: z
    .string()
    .min(12, "Password must contain at least 12 characters.")
    .max(128, "Password must contain at most 128 characters."),
});

export const loginRequestSchema = z.strictObject({
  email: authEmailSchema,
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password must contain at most 128 characters."),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export interface Viewer {
  id: string;
  email: string;
  createdAt: string;
}

export interface DataResponse<T> {
  data: T;
}

export const apiErrorCodes = [
  "AUTHENTICATION_REQUIRED",
  "EMAIL_ALREADY_REGISTERED",
  "INTERNAL_SERVER_ERROR",
  "INVALID_CREDENTIALS",
  "INVALID_RESOURCE_ID",
  "MALFORMED_JSON",
  "ORIGIN_NOT_ALLOWED",
  "ORDER_LOCKED_AFTER_PAYMENT",
  "ORDER_NOT_FOUND",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "REGISTRATION_DISABLED",
  "ROUTE_NOT_FOUND",
  "UNSUPPORTED_MEDIA_TYPE",
  "VALIDATION_FAILED",
] as const;

export type ApiErrorCode = (typeof apiErrorCodes)[number];

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: {
      fields?: Record<string, string[]>;
      retryAfterSeconds?: number;
    };
    requestId: string;
  };
}
