import type { HealthResponse } from "@crossval/contracts";
import express, { type Express } from "express";
import helmet from "helmet";
import type { Db } from "mongodb";

import type { Environment } from "./config/environment.js";
import {
  notFoundHandler,
  unexpectedErrorHandler,
} from "./middleware/error-handler.js";
import { generalApiRateLimit } from "./middleware/rate-limit.js";
import { requestIdMiddleware } from "./middleware/request-context.js";
import {
  createOriginValidationMiddleware,
  privateApiCacheControl,
  requireJsonContentType,
} from "./middleware/security.js";
import { createAuthRouter } from "./modules/auth/routes.js";
import { createOrdersRouter } from "./modules/orders/routes.js";

interface AppOptions {
  database?: Db;
  environment?: Environment;
}

export const createApp = (options: AppOptions = {}): Express => {
  const app = express();
  const appOrigin = options.environment?.appOrigin ?? "http://localhost:3000";

  app.disable("x-powered-by");
  if ((options.environment?.trustProxyHops ?? 0) > 0) {
    app.set("trust proxy", options.environment?.trustProxyHops);
  }

  app.use(requestIdMiddleware);
  app.use(
    helmet(
      options.environment?.nodeEnvironment === "production"
        ? {}
        : { hsts: false },
    ),
  );
  app.use(privateApiCacheControl);
  app.use("/v1", generalApiRateLimit);
  app.use(createOriginValidationMiddleware(appOrigin));
  app.use(requireJsonContentType);
  app.use(express.json({ limit: "32kb" }));

  app.get("/health", (_request, response) => {
    const payload: HealthResponse = { status: "ok" };
    response.status(200).json(payload);
  });

  if (options.database !== undefined && options.environment !== undefined) {
    app.use(
      "/v1/auth",
      createAuthRouter({
        database: options.database,
        registrationEnabled: options.environment.registrationEnabled,
        session: {
          name: options.environment.session.cookieName,
          ttlSeconds: options.environment.session.ttlSeconds,
          secure: options.environment.session.secure,
        },
      }),
    );
    app.use(
      "/v1/orders",
      createOrdersRouter({
        database: options.database,
        session: {
          name: options.environment.session.cookieName,
          ttlSeconds: options.environment.session.ttlSeconds,
          secure: options.environment.session.secure,
        },
      }),
    );
  }

  app.use(notFoundHandler);
  app.use(unexpectedErrorHandler);

  return app;
};
