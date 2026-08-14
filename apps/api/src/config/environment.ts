import { z } from "zod";

const databaseNameSchema = z
  .string()
  .trim()
  .min(1, "must not be empty")
  .regex(/^[^/\\. "$*<>:|?]+$/, "contains a character MongoDB does not allow")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 38, {
    message: "must contain at most 38 UTF-8 bytes for Atlas compatibility",
  });

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  MONGODB_URI: z
    .string()
    .trim()
    .regex(/^mongodb(?:\+srv)?:\/\//, "must be a MongoDB connection URI"),
  MONGODB_DATABASE: databaseNameSchema,
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  MONGODB_WAIT_QUEUE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(5_000),
  MONGODB_SERVER_SELECTION_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(60_000)
    .default(10_000),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_-]+$/, "must be a safe cookie name")
    .default("crossval_session"),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(3_600)
    .max(2_592_000)
    .default(604_800),
  REGISTRATION_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});

export type Environment = Readonly<{
  nodeEnvironment: "development" | "test" | "production";
  apiPort: number;
  appOrigin: string;
  registrationEnabled: boolean;
  trustProxyHops: number;
  session: Readonly<{
    cookieName: string;
    ttlSeconds: number;
    secure: boolean;
  }>;
  mongodb: Readonly<{
    uri: string;
    databaseName: string;
    maxPoolSize: number;
    waitQueueTimeoutMs: number;
    serverSelectionTimeoutMs: number;
  }>;
}>;

export class EnvironmentConfigurationError extends Error {
  public constructor(issues: readonly string[]) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvironmentConfigurationError";
  }
}

export const readEnvironment = (
  source: NodeJS.ProcessEnv = process.env,
): Environment => {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const key = issue.path.join(".") || "environment";
      return `${key}: ${issue.message}`;
    });
    throw new EnvironmentConfigurationError(issues);
  }

  return {
    nodeEnvironment: result.data.NODE_ENV,
    apiPort: result.data.API_PORT,
    appOrigin: result.data.APP_ORIGIN,
    registrationEnabled: result.data.REGISTRATION_ENABLED,
    trustProxyHops: result.data.TRUST_PROXY_HOPS,
    session: {
      cookieName: result.data.SESSION_COOKIE_NAME,
      ttlSeconds: result.data.SESSION_TTL_SECONDS,
      secure: result.data.NODE_ENV === "production",
    },
    mongodb: {
      uri: result.data.MONGODB_URI,
      databaseName: result.data.MONGODB_DATABASE,
      maxPoolSize: result.data.MONGODB_MAX_POOL_SIZE,
      waitQueueTimeoutMs: result.data.MONGODB_WAIT_QUEUE_TIMEOUT_MS,
      serverSelectionTimeoutMs: result.data.MONGODB_SERVER_SELECTION_TIMEOUT_MS,
    },
  };
};
