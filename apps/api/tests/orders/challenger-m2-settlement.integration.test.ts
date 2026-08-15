import { randomUUID } from "node:crypto";
import request from "supertest";
import { MongoClient, ObjectId } from "mongodb";
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
    "Integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}

const databaseName = `crossval_chal_m2_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`;
const appOrigin = "http://localhost:3000";
const validPassword = "correct horse battery staple";
const todayUtc = (): string => getUtcDateOnly(new Date());

const cookieFrom = (response: request.Response): string => {
  const setCookie = response.headers["set-cookie"] as unknown;
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (typeof header !== "string") {
    throw new Error("Expected a Set-Cookie response header.");
  }
  return header.split(";", 1)[0] ?? "";
};

describe("Challenger 2 Settlement & Payment Hardening Integration Tests", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-challenger-m2-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_chal_m2_session",
    SESSION_TTL_SECONDS: "3600",
    REGISTRATION_ENABLED: "true",
  });
  const app = createApp({ database, environment });
  let connected = false;
  let userCookie = "";
  let userId = new ObjectId();

  beforeAll(async () => {
    await client.connect();
    connected = true;
    await runMigrations(database);

    const signup = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "challenger-m2@example.com", password: validPassword })
      .expect(201);

    userCookie = cookieFrom(signup);
    userId = new ObjectId(signup.body.data.id);
  }, 20_000);

  beforeEach(async () => {
    await getCollections(database).orders.deleteMany({});
  });

  afterAll(async () => {
    if (connected) {
      await database.dropDatabase();
    }
    await client.close();
  });

  const createOrderWithItems = async (
    items: Array<{ description: string; quantity: number; unitPriceCents: number }>,
  ): Promise<string> => {
    const res = await request(app)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Settlement Test Corp",
        dueDate: "2026-11-30",
        items,
      })
      .expect(201);
    return res.body.data.id as string;
  };

  const recordPayment = (
    orderId: string,
    amountCents: number,
    idempotencyKey = randomUUID(),
    overrides: Record<string, unknown> = {},
  ) =>
    request(app)
      .post(`/v1/orders/${orderId}/payments`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        amountCents,
        paymentDate: todayUtc(),
        ...overrides,
      });

  it("1. CORE ASSIGNMENT FLOW: $1,000 -> $400 partial -> $600 full settlement -> reject $0.01 overpayment", async () => {
    const orderId = await createOrderWithItems([
      { description: "Enterprise License", quantity: 1, unitPriceCents: 100_000 },
    ]);

    // Initial state check
    const initialDetail = await request(app)
      .get(`/v1/orders/${orderId}`)
      .set("Cookie", userCookie)
      .expect(200);
    expect(initialDetail.body.data.status).toBe("pending");
    expect(initialDetail.body.data.totalAmountCents).toBe(100_000);
    expect(initialDetail.body.data.paidAmountCents).toBe(0);
    expect(initialDetail.body.data.balanceDueCents).toBe(100_000);

    // Step 1: Partial payment of $400.00
    const payment1 = await recordPayment(orderId, 40_000, randomUUID(), {
      note: "Partial installment #1",
    }).expect(201);

    expect(payment1.body.data.payment.amountCents).toBe(40_000);
    expect(payment1.body.data.order.status).toBe("partially_paid");
    expect(payment1.body.data.order.paidAmountCents).toBe(40_000);
    expect(payment1.body.data.order.balanceDueCents).toBe(60_000);

    // Step 2: Full settlement of remaining $600.00
    const payment2 = await recordPayment(orderId, 60_000, randomUUID(), {
      note: "Final settlement",
    }).expect(201);

    expect(payment2.body.data.payment.amountCents).toBe(60_000);
    expect(payment2.body.data.order.status).toBe("paid");
    expect(payment2.body.data.order.paidAmountCents).toBe(100_000);
    expect(payment2.body.data.order.balanceDueCents).toBe(0);

    // Step 3: Overpayment attempt of 1 cent ($0.01) -> MUST return 422 ORDER_ALREADY_PAID
    const reject1 = await recordPayment(orderId, 1).expect(422);
    expect(reject1.body.error.code).toBe("ORDER_ALREADY_PAID");
    expect(reject1.body.error.details.remainingAmountCents).toBe(0);

    // Step 4: Overpayment attempt of $1.00 -> MUST return 422 ORDER_ALREADY_PAID
    const reject100 = await recordPayment(orderId, 100).expect(422);
    expect(reject100.body.error.code).toBe("ORDER_ALREADY_PAID");
    expect(reject100.body.error.details.remainingAmountCents).toBe(0);

    // Verify DB integrity (raw MongoDB doc has append-order)
    const doc = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
      userId,
    });
    expect(doc).not.toBeNull();
    expect(doc?.paymentCount).toBe(2);
    expect(doc?.balanceDueCents).toBe(0);
    expect(
      doc?.payments.reduce((sum, p) => sum + p.amountCents, 0),
    ).toBe(100_000);
    expect(doc?.payments).toHaveLength(2);
    expect(doc?.payments[0]?.amountCents).toBe(40_000); // chronological append order
    expect(doc?.payments[1]?.amountCents).toBe(60_000);

    // Verify API GET /v1/orders/:id returns newest payment first
    const finalDetail = await request(app)
      .get(`/v1/orders/${orderId}`)
      .set("Cookie", userCookie)
      .expect(200);
    expect(finalDetail.body.data.status).toBe("paid");
    expect(finalDetail.body.data.paidAmountCents).toBe(100_000);
    expect(finalDetail.body.data.balanceDueCents).toBe(0);
    expect(finalDetail.body.data.payments[0].amountCents).toBe(60_000); // newest first in API response
    expect(finalDetail.body.data.payments[1].amountCents).toBe(40_000);
  });

  it("2. ODD-CENTS EXACT SETTLEMENT: $19.99 order settled in one transaction", async () => {
    const orderId = await createOrderWithItems([
      { description: "Book", quantity: 1, unitPriceCents: 1999 },
    ]);

    const payRes = await recordPayment(orderId, 1999).expect(201);
    expect(payRes.body.data.order.status).toBe("paid");
    expect(payRes.body.data.order.paidAmountCents).toBe(1999);
    expect(payRes.body.data.order.balanceDueCents).toBe(0);

    const doc = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(doc?.balanceDueCents).toBe(0);
    expect(doc?.paymentCount).toBe(1);
    expect(doc?.payments[0]?.amountCents).toBe(1999);
  });

  it("3. MICRO-PENNY STEP-DOWN: $0.05 order settled in five 1-cent payments", async () => {
    const orderId = await createOrderWithItems([
      { description: "Penny Gum", quantity: 5, unitPriceCents: 1 },
    ]);

    for (let i = 1; i <= 5; i++) {
      const step = await recordPayment(orderId, 1).expect(201);
      expect(step.body.data.order.paidAmountCents).toBe(i);
      expect(step.body.data.order.balanceDueCents).toBe(5 - i);
      if (i < 5) {
        expect(step.body.data.order.status).toBe("partially_paid");
      } else {
        expect(step.body.data.order.status).toBe("paid");
      }
    }

    // 6th attempt of 1 cent must be rejected
    const overAttempt = await recordPayment(orderId, 1).expect(422);
    expect(overAttempt.body.error.code).toBe("ORDER_ALREADY_PAID");

    const doc = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(doc?.paymentCount).toBe(5);
    expect(doc?.balanceDueCents).toBe(0);
    expect(
      doc?.payments.reduce((sum, p) => sum + p.amountCents, 0),
    ).toBe(5);
  });

  it("4. OVERPAYMENT BY 1 CENT ON PARTIAL BALANCE: $100.00 order -> pay $70.00 -> reject $30.01", async () => {
    const orderId = await createOrderWithItems([
      { description: "Service Contract", quantity: 1, unitPriceCents: 10_000 },
    ]);

    // Pay $70.00
    await recordPayment(orderId, 7_000).expect(201);

    // Remaining is $30.00 (3,000 cents). Attempt $30.01 (3,001 cents)
    const overpayment = await recordPayment(orderId, 3_001).expect(422);
    expect(overpayment.body.error.code).toBe("PAYMENT_EXCEEDS_BALANCE");
    expect(overpayment.body.error.details.remainingAmountCents).toBe(3_000);

    // Verify order state unchanged
    const doc = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(doc?.balanceDueCents).toBe(3_000);
    expect(doc?.paymentCount).toBe(1);
    expect(
      doc?.payments.reduce((sum, p) => sum + p.amountCents, 0),
    ).toBe(7_000);
  });

  it("5. IDEMPOTENCY REPLAY OF FULL SETTLEMENT: Replay returns original 200 without double decrement", async () => {
    const orderId = await createOrderWithItems([
      { description: "Hardware", quantity: 1, unitPriceCents: 50_000 },
    ]);

    const settlementKey = randomUUID();
    const original = await recordPayment(orderId, 50_000, settlementKey, {
      note: "Full payment via wire",
    }).expect(201);

    expect(original.body.data.order.status).toBe("paid");
    expect(original.body.data.order.balanceDueCents).toBe(0);

    // Replay with exact same key and note
    const replay = await recordPayment(orderId, 50_000, settlementKey, {
      note: "  Full payment via wire  ",
    }).expect(200);

    expect(replay.headers["idempotency-replayed"]).toBe("true");
    expect(replay.body).toEqual(original.body);

    // Check DB has only 1 payment
    const doc = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
    });
    expect(doc?.paymentCount).toBe(1);
    expect(doc?.balanceDueCents).toBe(0);
    expect(doc?.payments).toHaveLength(1);
  });
});
