import { randomUUID } from "node:crypto";

import { MongoClient, ObjectId } from "mongodb";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { readEnvironment } from "../../src/config/environment.js";
import { loadRepositoryEnvironmentFile } from "../../src/config/load-environment-file.js";
import { getCollections } from "../../src/db/collections.js";
import { runMigrations } from "../../src/db/migrations/index.js";
import { getUtcDateOnly } from "../../src/modules/orders/domain.js";

loadRepositoryEnvironmentFile();

const mongoUri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
if (mongoUri === undefined) {
  throw new Error(
    "Payment integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}

const databaseName = `crossval_${randomUUID().replaceAll("-", "").slice(0, 12)}_test`;
const appOrigin = "http://localhost:3000";
const validPassword = "correct horse battery staple";
const todayUtc = (): string => getUtcDateOnly(new Date());
const dateOffset = (offset: number): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return getUtcDateOnly(date);
};

const cookieFrom = (response: request.Response): string => {
  const setCookie = response.headers["set-cookie"] as unknown;
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (typeof header !== "string") {
    throw new Error("Expected a Set-Cookie response header.");
  }
  return header.split(";", 1)[0] ?? "";
};

const orderInput = (totalAmountCents: number): Record<string, unknown> => ({
  customerName: "Payment test customer",
  dueDate: dateOffset(7),
  items: [
    {
      description: "Settlement test",
      quantity: 1,
      unitPriceCents: totalAmountCents,
    },
  ],
});

describe("atomic payment API", () => {
  const primaryClient = new MongoClient(mongoUri, {
    appName: "crossval-payment-integration-primary",
    serverSelectionTimeoutMS: 15_000,
  });
  const concurrentClient = new MongoClient(mongoUri, {
    appName: "crossval-payment-integration-concurrent",
    serverSelectionTimeoutMS: 15_000,
  });
  const primaryDatabase = primaryClient.db(databaseName);
  const concurrentDatabase = concurrentClient.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_payment_test_session",
    SESSION_TTL_SECONDS: "3600",
    REGISTRATION_ENABLED: "true",
  });
  const primaryApp = createApp({ database: primaryDatabase, environment });
  const concurrentApp = createApp({
    database: concurrentDatabase,
    environment,
  });
  let connected = false;
  let userACookie = "";
  let userBCookie = "";

  const createOrder = async (
    totalAmountCents: number,
    cookie = userACookie,
  ): Promise<string> => {
    const response = await request(primaryApp)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .set("Cookie", cookie)
      .send(orderInput(totalAmountCents))
      .expect(201);
    return response.body.data.id as string;
  };

  const recordPayment = (
    app: typeof primaryApp,
    orderId: string,
    amountCents: number,
    idempotencyKey = randomUUID(),
    overrides: Record<string, unknown> = {},
  ) =>
    request(app)
      .post(`/v1/orders/${orderId}/payments`)
      .set("Origin", appOrigin)
      .set("Cookie", userACookie)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        amountCents,
        paymentDate: todayUtc(),
        ...overrides,
      });

  beforeAll(async () => {
    await Promise.all([primaryClient.connect(), concurrentClient.connect()]);
    connected = true;
    await runMigrations(primaryDatabase);

    const [userA, userB] = await Promise.all([
      request(primaryApp)
        .post("/v1/auth/signup")
        .set("Origin", appOrigin)
        .send({ email: "payments-a@example.com", password: validPassword })
        .expect(201),
      request(primaryApp)
        .post("/v1/auth/signup")
        .set("Origin", appOrigin)
        .send({ email: "payments-b@example.com", password: validPassword })
        .expect(201),
    ]);
    userACookie = cookieFrom(userA);
    userBCookie = cookieFrom(userB);
  }, 25_000);

  beforeEach(async () => {
    await getCollections(primaryDatabase).orders.deleteMany({});
  });

  afterAll(async () => {
    if (connected) {
      await primaryDatabase.dropDatabase();
    }
    await Promise.all([primaryClient.close(), concurrentClient.close()]);
  });

  it("validates authentication, ownership, idempotency, and payment input", async () => {
    const ownOrderId = await createOrder(10_000);
    const foreignOrderId = await createOrder(10_000, userBCookie);

    await request(primaryApp)
      .post(`/v1/orders/${ownOrderId}/payments`)
      .set("Origin", appOrigin)
      .set("Idempotency-Key", randomUUID())
      .send({ amountCents: 100, paymentDate: todayUtc() })
      .expect(401);

    const missingKey = await request(primaryApp)
      .post(`/v1/orders/${ownOrderId}/payments`)
      .set("Origin", appOrigin)
      .set("Cookie", userACookie)
      .send({ amountCents: 100, paymentDate: todayUtc() })
      .expect(422);
    expect(missingKey.body.error.code).toBe("VALIDATION_FAILED");

    await request(primaryApp)
      .post(`/v1/orders/${ownOrderId}/payments`)
      .set("Origin", appOrigin)
      .set("Cookie", userACookie)
      .set("Idempotency-Key", "not-a-uuid")
      .send({ amountCents: 100, paymentDate: todayUtc() })
      .expect(422);

    const [zero, future, impossibleDate, foreign] = await Promise.all([
      recordPayment(primaryApp, ownOrderId, 0),
      recordPayment(primaryApp, ownOrderId, 100, randomUUID(), {
        paymentDate: dateOffset(1),
      }),
      recordPayment(primaryApp, ownOrderId, 100, randomUUID(), {
        paymentDate: "2026-02-30",
      }),
      recordPayment(primaryApp, foreignOrderId, 100),
    ]);
    expect(zero.status).toBe(422);
    expect(future.status).toBe(422);
    expect(impossibleDate.status).toBe(422);
    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("completes the $1,000 to $400 to $600 flow and rejects another cent", async () => {
    const orderId = await createOrder(100_000);
    const partial = await recordPayment(
      primaryApp,
      orderId,
      40_000,
      randomUUID(),
      { note: "  Bank   transfer " },
    ).expect(201);
    expect(partial.body.data).toMatchObject({
      payment: { amountCents: 40_000, note: "Bank transfer" },
      order: {
        status: "partially_paid",
        paidAmountCents: 40_000,
        balanceDueCents: 60_000,
      },
    });

    const exact = await recordPayment(primaryApp, orderId, 60_000).expect(201);
    expect(exact.body.data.order).toMatchObject({
      status: "paid",
      paidAmountCents: 100_000,
      balanceDueCents: 0,
    });

    const rejected = await recordPayment(primaryApp, orderId, 1).expect(422);
    expect(rejected.body.error).toMatchObject({
      code: "ORDER_ALREADY_PAID",
      details: { remainingAmountCents: 0 },
    });

    const stored = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(stored).not.toBeNull();
    expect(stored?.paymentCount).toBe(2);
    expect(stored?.balanceDueCents).toBe(0);
    expect(
      stored?.payments.reduce(
        (total, payment) => total + payment.amountCents,
        0,
      ),
    ).toBe(100_000);

    const detail = await request(primaryApp)
      .get(`/v1/orders/${orderId}`)
      .set("Cookie", userACookie)
      .expect(200);
    expect(detail.body.data.payments).toHaveLength(2);
    expect(detail.body.data.payments[0].amountCents).toBe(60_000);
  });

  it("rejects overpayment without changing any financial field", async () => {
    const orderId = await createOrder(50_000);
    const response = await recordPayment(primaryApp, orderId, 50_001).expect(
      422,
    );
    expect(response.body.error).toMatchObject({
      code: "PAYMENT_EXCEEDS_BALANCE",
      details: { remainingAmountCents: 50_000 },
    });

    const stored = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(stored).toMatchObject({
      balanceDueCents: 50_000,
      paymentCount: 0,
      payments: [],
    });
  });

  it("replays the same logical request and conflicts on changed payload", async () => {
    const orderId = await createOrder(50_000);
    const key = randomUUID();
    const first = await recordPayment(primaryApp, orderId, 20_000, key, {
      note: "Wire",
    }).expect(201);
    await recordPayment(primaryApp, orderId, 5_000).expect(201);
    const replay = await recordPayment(primaryApp, orderId, 20_000, key, {
      note: "  Wire  ",
    }).expect(200);
    expect(replay.headers["idempotency-replayed"]).toBe("true");
    expect(replay.body).toEqual(first.body);

    const conflict = await recordPayment(primaryApp, orderId, 20_001, key, {
      note: "Wire",
    }).expect(409);
    expect(conflict.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");

    const stored = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(stored).toMatchObject({
      balanceDueCents: 25_000,
      paymentCount: 2,
    });
    expect(stored?.payments).toHaveLength(2);
  });

  it("commits a concurrent duplicate key only once", async () => {
    const orderId = await createOrder(50_000);
    const key = randomUUID();
    const [first, second] = await Promise.all([
      recordPayment(primaryApp, orderId, 20_000, key),
      recordPayment(concurrentApp, orderId, 20_000, key),
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.body).toEqual(second.body);

    const stored = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(stored).toMatchObject({
      balanceDueCents: 30_000,
      paymentCount: 1,
    });
    expect(stored?.payments).toHaveLength(1);
  });

  it("allows only one concurrent $400 payment against a $500 balance", async () => {
    const orderId = await createOrder(50_000);
    const responses = await Promise.all([
      recordPayment(primaryApp, orderId, 40_000),
      recordPayment(concurrentApp, orderId, 40_000),
    ]);
    expect(responses.map(({ status }) => status).sort()).toEqual([201, 422]);
    const rejected = responses.find(({ status }) => status === 422);
    expect(rejected?.body.error).toMatchObject({
      code: "PAYMENT_EXCEEDS_BALANCE",
      details: { remainingAmountCents: 10_000 },
    });

    const stored = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(stored).toMatchObject({
      balanceDueCents: 10_000,
      paymentCount: 1,
    });
    expect(stored?.payments).toHaveLength(1);
  });

  it("serializes concurrent payments that exactly consume the balance", async () => {
    const orderId = await createOrder(100_000);
    const responses = await Promise.all([
      recordPayment(primaryApp, orderId, 40_000),
      recordPayment(concurrentApp, orderId, 60_000),
    ]);
    expect(responses.map(({ status }) => status)).toEqual([201, 201]);

    const stored = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(stored).toMatchObject({
      balanceDueCents: 0,
      paymentCount: 2,
    });
    expect(stored?.payments).toHaveLength(2);
  });

  it("preserves locking invariants when a first payment races edit and delete", async () => {
    const editOrderId = await createOrder(50_000);
    const [payment, edit] = await Promise.all([
      recordPayment(primaryApp, editOrderId, 20_000),
      request(concurrentApp)
        .patch(`/v1/orders/${editOrderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .send(orderInput(60_000)),
    ]);
    expect(payment.status).toBe(201);
    expect([200, 409]).toContain(edit.status);
    const afterEditRace = await getCollections(primaryDatabase).orders.findOne({
      _id: new ObjectId(editOrderId),
    });
    expect(afterEditRace?.paymentCount).toBe(1);
    expect(afterEditRace?.balanceDueCents).toBe(
      (afterEditRace?.totalAmountCents ?? 0) - 20_000,
    );

    const deleteOrderId = await createOrder(50_000);
    const [deletePayment, deletion] = await Promise.all([
      recordPayment(primaryApp, deleteOrderId, 20_000),
      request(concurrentApp)
        .delete(`/v1/orders/${deleteOrderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie),
    ]);
    expect(
      (deletePayment.status === 201 && deletion.status === 409) ||
        (deletePayment.status === 404 && deletion.status === 204),
    ).toBe(true);
    const afterDeleteRace = await getCollections(
      primaryDatabase,
    ).orders.findOne({
      _id: new ObjectId(deleteOrderId),
    });
    if (afterDeleteRace !== null) {
      expect(afterDeleteRace.paymentCount).toBe(1);
      expect(afterDeleteRace.balanceDueCents).toBe(30_000);
    }
  });
});
