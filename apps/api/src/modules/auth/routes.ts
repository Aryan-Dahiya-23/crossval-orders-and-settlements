import {
  loginRequestSchema,
  signupRequestSchema,
  type DataResponse,
  type Viewer,
} from "@crossval/contracts";
import { Router } from "express";
import type { Db } from "mongodb";

import { AppError } from "../../errors/app-error.js";
import {
  loginRateLimit,
  signupRateLimit,
} from "../../middleware/rate-limit.js";
import {
  createRequireAuthentication,
  requireAuthenticationContext,
} from "./middleware.js";
import { AuthService } from "./service.js";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "./session.js";
import type { SessionCookieConfiguration } from "./types.js";
import { parseAuthBody } from "./validation.js";

interface AuthRouterOptions {
  database: Db;
  registrationEnabled: boolean;
  session: SessionCookieConfiguration;
}

export const createAuthRouter = (options: AuthRouterOptions): Router => {
  const router = Router();
  const service = new AuthService(options.database, options.session);
  const requireAuthentication = createRequireAuthentication(
    service,
    options.session,
  );

  router.post("/signup", signupRateLimit, async (request, response) => {
    if (!options.registrationEnabled) {
      throw new AppError({
        status: 403,
        code: "REGISTRATION_DISABLED",
        message: "Registration is currently disabled.",
      });
    }

    const input = parseAuthBody(signupRequestSchema, request.body);
    const result = await service.signup(input);
    setSessionCookie(response, result.token, result.expiresAt, options.session);
    const body: DataResponse<Viewer> = { data: result.viewer };
    response.status(201).json(body);
  });

  router.post("/login", loginRateLimit, async (request, response) => {
    const input = parseAuthBody(loginRequestSchema, request.body);
    const currentToken = readSessionToken(request, options.session);
    const result = await service.login(input, currentToken);
    setSessionCookie(response, result.token, result.expiresAt, options.session);
    const body: DataResponse<Viewer> = { data: result.viewer };
    response.status(200).json(body);
  });

  router.post("/logout", async (request, response) => {
    await service.logout(readSessionToken(request, options.session));
    clearSessionCookie(response, options.session);
    response.status(204).send();
  });

  router.get("/me", requireAuthentication, (request, response) => {
    const body: DataResponse<Viewer> = {
      data: requireAuthenticationContext(request).viewer,
    };
    response.status(200).json(body);
  });

  return router;
};
