import type { ApiErrorResponse } from "@crossval/contracts";
import type { ErrorRequestHandler, RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";
import { getRequestId } from "./request-context.js";

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(
    new AppError({
      status: 404,
      code: "ROUTE_NOT_FOUND",
      message: `No route exists for ${request.method} ${request.path}.`,
    }),
  );
};

const isMalformedJsonError = (
  error: unknown,
): error is SyntaxError & { status: number } =>
  error instanceof SyntaxError &&
  "status" in error &&
  (error as { status?: unknown }).status === 400;

const isPayloadTooLargeError = (
  error: unknown,
): error is Error & { status: number; type: string } =>
  error instanceof Error &&
  "status" in error &&
  (error as { status?: unknown }).status === 413 &&
  "type" in error &&
  (error as { type?: unknown }).type === "entity.too.large";

export const unexpectedErrorHandler: ErrorRequestHandler = (
  error,
  request,
  response,
  _next,
) => {
  const appError = isMalformedJsonError(error)
    ? new AppError({
        status: 400,
        code: "MALFORMED_JSON",
        message: "Request body contains malformed JSON.",
      })
    : isPayloadTooLargeError(error)
      ? new AppError({
          status: 413,
          code: "PAYLOAD_TOO_LARGE",
          message: "Request body exceeds the allowed size.",
        })
      : error instanceof AppError
        ? error
        : new AppError({
            status: 500,
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred.",
          });

  if (
    !(error instanceof AppError) &&
    !isMalformedJsonError(error) &&
    !isPayloadTooLargeError(error)
  ) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "unexpected_api_error",
        requestId: getRequestId(request),
        method: request.method,
        path: request.path,
      }),
    );
  }

  const body: ApiErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details !== undefined && { details: appError.details }),
      requestId: getRequestId(request),
    },
  };

  response.status(appError.status).json(body);
};
