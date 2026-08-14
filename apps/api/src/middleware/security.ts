import type { RequestHandler } from "express";

import { AppError } from "../errors/app-error.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);
const jsonMethods = new Set(["POST", "PUT", "PATCH"]);

export const createOriginValidationMiddleware = (
  appOrigin: string,
): RequestHandler => {
  const allowedOrigin = new URL(appOrigin).origin;

  return (request, _response, next) => {
    if (safeMethods.has(request.method)) {
      next();
      return;
    }

    const origin = request.header("origin");
    if (origin !== allowedOrigin) {
      next(
        new AppError({
          status: 403,
          code: "ORIGIN_NOT_ALLOWED",
          message: "This request origin is not allowed.",
        }),
      );
      return;
    }

    next();
  };
};

export const requireJsonContentType: RequestHandler = (
  request,
  _response,
  next,
) => {
  const contentLength = request.header("content-length");
  const hasBody =
    (contentLength !== undefined && contentLength !== "0") ||
    request.header("transfer-encoding") !== undefined;

  if (
    jsonMethods.has(request.method) &&
    hasBody &&
    !request.is("application/json")
  ) {
    next(
      new AppError({
        status: 415,
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Request body must use application/json.",
      }),
    );
    return;
  }

  next();
};

export const privateApiCacheControl: RequestHandler = (
  request,
  response,
  next,
) => {
  if (request.path.startsWith("/v1")) {
    response.setHeader("Cache-Control", "private, no-store");
  }
  next();
};
