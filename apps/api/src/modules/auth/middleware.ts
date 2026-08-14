import type { Request, RequestHandler } from "express";

import { AppError } from "../../errors/app-error.js";
import {
  getAuthenticationContext,
  setAuthenticationContext,
} from "../../middleware/request-context.js";
import type { AuthService } from "./service.js";
import { readSessionToken } from "./session.js";
import type {
  AuthenticationContext,
  SessionCookieConfiguration,
} from "./types.js";

export const createRequireAuthentication =
  (
    service: AuthService,
    configuration: SessionCookieConfiguration,
  ): RequestHandler =>
  async (request, _response, next) => {
    const context = await service.authenticate(
      readSessionToken(request, configuration),
    );

    if (context === null) {
      next(
        new AppError({
          status: 401,
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required.",
        }),
      );
      return;
    }

    setAuthenticationContext(request, context);
    next();
  };

export const requireAuthenticationContext = (
  request: Request,
): AuthenticationContext => {
  const context = getAuthenticationContext(request);
  if (context === undefined) {
    throw new AppError({
      status: 401,
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication is required.",
    });
  }
  return context;
};
