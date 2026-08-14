import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  readEnvironment,
} from "../../src/config/environment.js";

describe("readEnvironment", () => {
  it("maps a valid MongoDB configuration", () => {
    const environment = readEnvironment({
      MONGODB_URI: "mongodb+srv://example.invalid",
      MONGODB_DATABASE: "crossval_development",
    });

    expect(environment.apiPort).toBe(3001);
    expect(environment.mongodb.databaseName).toBe("crossval_development");
    expect(environment.mongodb.maxPoolSize).toBe(10);
  });

  it("reports invalid keys without including the secret value", () => {
    const secret = "definitely-not-a-uri-secret";

    expect(() =>
      readEnvironment({
        MONGODB_URI: secret,
        MONGODB_DATABASE: "invalid/database",
      }),
    ).toThrow(EnvironmentConfigurationError);

    try {
      readEnvironment({
        MONGODB_URI: secret,
        MONGODB_DATABASE: "invalid/database",
      });
    } catch (error: unknown) {
      expect(String(error)).not.toContain(secret);
    }
  });

  it("rejects database names that exceed the Atlas limit", () => {
    expect(() =>
      readEnvironment({
        MONGODB_URI: "mongodb+srv://example.invalid",
        MONGODB_DATABASE: `${"a".repeat(27)}_development`,
      }),
    ).toThrow("at most 38 UTF-8 bytes");
  });
});
