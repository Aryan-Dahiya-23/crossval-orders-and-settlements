import { randomUUID } from "node:crypto";

import request from "supertest";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { readEnvironment } from "../../src/config/environment.js";
import { loadRepositoryEnvironmentFile } from "../../src/config/load-environment-file.js";
import { getCollections } from "../../src/db/collections.js";
import { runMigrations } from "../../src/db/migrations/index.js";
import { hashSessionToken } from "../../src/modules/auth/session.js";

loadRepositoryEnvironmentFile();

const mongoUri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
if (mongoUri === undefined) {
  throw new Error(
    "Authentication integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}
const databaseName = `crossval_${randomUUID().replaceAll("-", "").slice(0, 12)}_test`;
const appOrigin = "http://localhost:3000";
const validPassword = "correct horse battery staple";

const environment = readEnvironment({
  NODE_ENV: "test",
  MONGODB_URI: mongoUri,
  MONGODB_DATABASE: databaseName,
  APP_ORIGIN: appOrigin,
  SESSION_COOKIE_NAME: "crossval_test_session",
  SESSION_TTL_SECONDS: "3600",
  REGISTRATION_ENABLED: "true",
});

const cookieFrom = (response: request.Response): string => {
  const setCookie = response.headers["set-cookie"] as unknown;
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (typeof header !== "string") {
    throw new Error("Expected a Set-Cookie response header.");
  }
  return header.split(";", 1)[0] ?? "";
};

const tokenFromCookie = (cookie: string): string => {
  const separator = cookie.indexOf("=");
  return separator === -1 ? "" : cookie.slice(separator + 1);
};

describe("authentication API", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-auth-integration-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const app = createApp({ database, environment });
  let connected = false;

  beforeAll(async () => {
    await client.connect();
    connected = true;
    await runMigrations(database);
  }, 20_000);

  beforeEach(async () => {
    const { sessions, users } = getCollections(database);
    await Promise.all([sessions.deleteMany({}), users.deleteMany({})]);
  });

  afterAll(async () => {
    if (connected) {
      await database.dropDatabase();
    }
    await client.close();
  });

  it("registers a normalized user and stores only hashed credentials", async () => {
    const response = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .set("X-Request-Id", "11111111-1111-4111-8111-111111111111")
      .send({
        email: "  Reviewer@Example.COM ",
        password: validPassword,
      })
      .expect(201);

    expect(response.body).toEqual({
      data: {
        id: expect.stringMatching(/^[0-9a-f]{24}$/),
        email: "reviewer@example.com",
        createdAt: expect.any(String),
      },
    });
    expect(response.headers["x-request-id"]).toBe(
      "11111111-1111-4111-8111-111111111111",
    );

    const setCookie = String(response.headers["set-cookie"]);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).not.toContain("Secure");

    const { users, sessions } = getCollections(database);
    const [user, session] = await Promise.all([
      users.findOne({ email: "reviewer@example.com" }),
      sessions.findOne({}),
    ]);
    const rawToken = tokenFromCookie(cookieFrom(response));

    expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user?.passwordHash).not.toContain(validPassword);
    expect(session?.tokenHash).toBe(hashSessionToken(rawToken));
    expect(session?.tokenHash).not.toBe(rawToken);

    const meResponse = await request(app)
      .get("/v1/auth/me")
      .set("Cookie", cookieFrom(response))
      .expect(200);
    expect(meResponse.body.data).toEqual(response.body.data);
  });

  it("rejects a duplicate normalized email", async () => {
    await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "duplicate@example.com", password: validPassword })
      .expect(201);

    const response = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: " DUPLICATE@example.com ", password: validPassword })
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: "EMAIL_ALREADY_REGISTERED",
      requestId: expect.any(String),
    });
  });

  it("can disable public registration without exposing an account path", async () => {
    const disabledApp = createApp({
      database,
      environment: { ...environment, registrationEnabled: false },
    });

    const response = await request(disabledApp)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "disabled@example.com", password: validPassword })
      .expect(403);

    expect(response.body.error.code).toBe("REGISTRATION_DISABLED");
    expect(await getCollections(database).users.countDocuments()).toBe(0);
  });

  it("returns the same generic failure for unknown and incorrect credentials", async () => {
    await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "login@example.com", password: validPassword })
      .expect(201);

    const [wrongPassword, unknownEmail] = await Promise.all([
      request(app)
        .post("/v1/auth/login")
        .set("Origin", appOrigin)
        .send({ email: "login@example.com", password: "wrong-password" }),
      request(app)
        .post("/v1/auth/login")
        .set("Origin", appOrigin)
        .send({ email: "unknown@example.com", password: "wrong-password" }),
    ]);

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(unknownEmail.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(wrongPassword.body.error.message).toBe(
      unknownEmail.body.error.message,
    );
  });

  it("rotates the current session on login", async () => {
    const signup = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "rotate@example.com", password: validPassword })
      .expect(201);
    const oldCookie = cookieFrom(signup);

    const login = await request(app)
      .post("/v1/auth/login")
      .set("Origin", appOrigin)
      .set("Cookie", oldCookie)
      .send({ email: "rotate@example.com", password: validPassword })
      .expect(200);
    const newCookie = cookieFrom(login);

    expect(newCookie).not.toBe(oldCookie);
    await request(app).get("/v1/auth/me").set("Cookie", oldCookie).expect(401);
    await request(app).get("/v1/auth/me").set("Cookie", newCookie).expect(200);
    expect(await getCollections(database).sessions.countDocuments()).toBe(1);
  });

  it("revokes logout server-side and clears the cookie idempotently", async () => {
    const signup = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "logout@example.com", password: validPassword })
      .expect(201);
    const cookie = cookieFrom(signup);

    const logout = await request(app)
      .post("/v1/auth/logout")
      .set("Origin", appOrigin)
      .set("Cookie", cookie)
      .expect(204);

    expect(String(logout.headers["set-cookie"])).toContain("Max-Age=0");
    expect(await getCollections(database).sessions.countDocuments()).toBe(0);
    await request(app).get("/v1/auth/me").set("Cookie", cookie).expect(401);
    await request(app)
      .post("/v1/auth/logout")
      .set("Origin", appOrigin)
      .expect(204);
  });

  it("rejects expired sessions even before TTL cleanup", async () => {
    const signup = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "expired@example.com", password: validPassword })
      .expect(201);
    const cookie = cookieFrom(signup);

    await getCollections(database).sessions.updateOne(
      { tokenHash: hashSessionToken(tokenFromCookie(cookie)) },
      { $set: { expiresAt: new Date(0) } },
    );

    await request(app).get("/v1/auth/me").set("Cookie", cookie).expect(401);
  });

  it("rejects unsafe cross-origin requests before creating data", async () => {
    const response = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", "https://attacker.example")
      .send({ email: "blocked@example.com", password: validPassword })
      .expect(403);

    expect(response.body.error.code).toBe("ORIGIN_NOT_ALLOWED");
    expect(await getCollections(database).users.countDocuments()).toBe(0);
  });

  it("returns structured validation, media-type, and malformed-JSON errors", async () => {
    const validation = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "bad", password: "short", unexpected: true })
      .expect(422);
    expect(validation.body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      details: { fields: expect.any(Object) },
      requestId: expect.any(String),
    });

    const mediaType = await request(app)
      .post("/v1/auth/login")
      .set("Origin", appOrigin)
      .set("Content-Type", "text/plain")
      .send("not json")
      .expect(415);
    expect(mediaType.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");

    const malformed = await request(app)
      .post("/v1/auth/login")
      .set("Origin", appOrigin)
      .set("Content-Type", "application/json")
      .send('{"email":')
      .expect(400);
    expect(malformed.body.error.code).toBe("MALFORMED_JSON");

    const tooLarge = await request(app)
      .post("/v1/auth/login")
      .set("Origin", appOrigin)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a".repeat(33_000) }))
      .expect(413);
    expect(tooLarge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("admits only one of two concurrent registrations", async () => {
    const attempts = await Promise.all([
      request(app)
        .post("/v1/auth/signup")
        .set("Origin", appOrigin)
        .send({ email: "race@example.com", password: validPassword }),
      request(app)
        .post("/v1/auth/signup")
        .set("Origin", appOrigin)
        .send({ email: "race@example.com", password: validPassword }),
    ]);

    expect(attempts.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);
    expect(await getCollections(database).users.countDocuments()).toBe(1);
    expect(await getCollections(database).sessions.countDocuments()).toBe(1);
  });

  it("rate limits repeated credential attempts with a safe error", async () => {
    let finalResponse: request.Response | undefined;

    for (let attempt = 0; attempt < 21; attempt += 1) {
      finalResponse = await request(app)
        .post("/v1/auth/login")
        .set("Origin", appOrigin)
        .send({
          email: "rate-limit@example.com",
          password: "wrong-password",
        });
    }

    expect(finalResponse?.status).toBe(429);
    expect(finalResponse?.body.error).toMatchObject({
      code: "RATE_LIMITED",
      requestId: expect.any(String),
    });
  });
});
