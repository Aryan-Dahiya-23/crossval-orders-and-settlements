import { randomUUID } from "node:crypto";

import type { Request, RequestHandler } from "express";

import type { AuthenticationContext } from "../modules/auth/types.js";

const requestIds = new WeakMap<Request, string>();
const authenticationContexts = new WeakMap<Request, AuthenticationContext>();
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requestIdMiddleware: RequestHandler = (
  request,
  response,
  next,
) => {
  const candidate = request.header("x-request-id");
  const requestId =
    candidate !== undefined && uuidPattern.test(candidate)
      ? candidate.toLowerCase()
      : randomUUID();

  requestIds.set(request, requestId);
  response.setHeader("X-Request-Id", requestId);
  next();
};

export const getRequestId = (request: Request): string =>
  requestIds.get(request) ?? "unknown";

export const setAuthenticationContext = (
  request: Request,
  context: AuthenticationContext,
): void => {
  authenticationContexts.set(request, context);
};

export const getAuthenticationContext = (
  request: Request,
): AuthenticationContext | undefined => authenticationContexts.get(request);
