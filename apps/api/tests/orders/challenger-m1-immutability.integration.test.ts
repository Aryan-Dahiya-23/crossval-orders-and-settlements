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

const databaseName = `crossval_chal_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`;
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

describe("Challenger 1 Immutability & Lifecycle Guard Verification", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-challenger-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_chal_session",
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
      .send({ email: "challenger@example.com", password: validPassword })
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

  it("IMMUTABILITY GUARD: 1 cent ($0.01) payment permanently locks order against edits (PATCH) and deletion (DELETE)", async () => {
    // 1. Create a fresh order for $100.00 (10,000 cents)
    const createRes = await request(app)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Immutability Test Customer",
        dueDate: "2026-12-31",
        items: [
          {
            description: "Consulting Package",
            quantity: 1,
            unitPriceCents: 10_000,
          },
        ],
      })
      .expect(201);

    const orderId = createRes.body.data.id as string;
    expect(createRes.body.data.isEditable).toBe(true);
    expect(createRes.body.data.isDeletable).toBe(true);
    expect(createRes.body.data.paidAmountCents).toBe(0);

    // 2. Record a minimal 1 cent ($0.01) payment
    const paymentRes = await request(app)
      .post(`/v1/orders/${orderId}/payments`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .set("Idempotency-Key", randomUUID())
      .send({
        amountCents: 1, // 1 cent
        paymentDate: todayUtc(),
        note: "Micro payment of 1 cent",
      })
      .expect(201);

    expect(paymentRes.body.data.payment.amountCents).toBe(1);
    expect(paymentRes.body.data.order.paidAmountCents).toBe(1);
    expect(paymentRes.body.data.order.balanceDueCents).toBe(9999);
    expect(paymentRes.body.data.order.status).toBe("partially_paid");

    // 3. Inspect detail view — verify isEditable and isDeletable flags are strictly FALSE
    const detailRes = await request(app)
      .get(`/v1/orders/${orderId}`)
      .set("Cookie", userCookie)
      .expect(200);

    expect(detailRes.body.data.isEditable).toBe(false);
    expect(detailRes.body.data.isDeletable).toBe(false);
    expect(detailRes.body.data.payments).toHaveLength(1);
    expect(detailRes.body.data.payments[0].amountCents).toBe(1);

    // 4. Attempt to edit (PATCH) the order with 1 cent payment -> MUST return 409 Conflict
    const editAttempt = await request(app)
      .patch(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Attempted Malicious Update",
        dueDate: "2027-01-01",
        items: [
          {
            description: "Modified Item",
            quantity: 1,
            unitPriceCents: 5_000,
          },
        ],
      });

    expect(editAttempt.status).toBe(409);
    expect(editAttempt.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
    expect(editAttempt.body.error.message).toBe("Orders cannot be changed after the first payment.");

    // 5. Attempt to delete (DELETE) the order with 1 cent payment -> MUST return 409 Conflict
    const deleteAttempt = await request(app)
      .delete(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie);

    expect(deleteAttempt.status).toBe(409);
    expect(deleteAttempt.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
    expect(deleteAttempt.body.error.message).toBe("Orders cannot be changed after the first payment.");

    // 6. Direct Database Inspection: verify document is completely untouched
    const storedDoc = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
      userId,
    });
    expect(storedDoc).not.toBeNull();
    expect(storedDoc?.customerName).toBe("Immutability Test Customer");
    expect(storedDoc?.totalAmountCents).toBe(10_000);
    expect(storedDoc?.balanceDueCents).toBe(9999);
    expect(storedDoc?.paymentCount).toBe(1);
    expect(storedDoc?.payments).toHaveLength(1);
    expect(storedDoc?.lineItems[0]?.description).toBe("Consulting Package");
  });

  it("UNPAID LIFECYCLE: Unpaid order (0 cents paid) can be replaced and deleted cleanly", async () => {
    // 1. Create unpaid order
    const createRes = await request(app)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Initial Draft Name",
        dueDate: "2026-11-15",
        items: [
          {
            description: "Initial Draft Item",
            quantity: 2,
            unitPriceCents: 2_500,
          },
        ],
      })
      .expect(201);

    const orderId = createRes.body.data.id as string;
    expect(createRes.body.data.totalAmountCents).toBe(5_000);
    expect(createRes.body.data.isEditable).toBe(true);
    expect(createRes.body.data.isDeletable).toBe(true);

    // 2. Replace unpaid order
    const replaceRes = await request(app)
      .patch(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Updated Customer Name",
        dueDate: "2026-11-20",
        items: [
          {
            description: "Updated Line Item 1",
            quantity: 1,
            unitPriceCents: 15_000,
          },
          {
            description: "Updated Line Item 2",
            quantity: 3,
            unitPriceCents: 5_000,
          },
        ],
      })
      .expect(200);

    expect(replaceRes.body.data.customerName).toBe("Updated Customer Name");
    expect(replaceRes.body.data.totalAmountCents).toBe(30_000);
    expect(replaceRes.body.data.balanceDueCents).toBe(30_000);
    expect(replaceRes.body.data.isEditable).toBe(true);
    expect(replaceRes.body.data.isDeletable).toBe(true);

    // 3. Delete unpaid order
    await request(app)
      .delete(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .expect(204);

    // 4. Verify it is gone
    await request(app)
      .get(`/v1/orders/${orderId}`)
      .set("Cookie", userCookie)
      .expect(404);

    const checkDb = await getCollections(database).orders.findOne({
      _id: new ObjectId(orderId),
      userId,
    });
    expect(checkDb).toBeNull();
  });

  it("FULL SETTLEMENT IMMUTABILITY: 100% paid order cannot be edited or deleted", async () => {
    // 1. Create order
    const createRes = await request(app)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Settled Order Corp",
        dueDate: "2026-09-01",
        items: [
          {
            description: "Full Service",
            quantity: 1,
            unitPriceCents: 20_000,
          },
        ],
      })
      .expect(201);

    const orderId = createRes.body.data.id as string;

    // 2. Pay in full ($200.00)
    await request(app)
      .post(`/v1/orders/${orderId}/payments`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .set("Idempotency-Key", randomUUID())
      .send({
        amountCents: 20_000,
        paymentDate: todayUtc(),
      })
      .expect(201);

    // 3. Verify status paid
    const detail = await request(app)
      .get(`/v1/orders/${orderId}`)
      .set("Cookie", userCookie)
      .expect(200);

    expect(detail.body.data.status).toBe("paid");
    expect(detail.body.data.balanceDueCents).toBe(0);
    expect(detail.body.data.isEditable).toBe(false);
    expect(detail.body.data.isDeletable).toBe(false);

    // 4. Attempt edit and delete -> both 409
    const editRes = await request(app)
      .patch(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie)
      .send({
        customerName: "Illegal Edit",
        dueDate: "2026-09-01",
        items: [{ description: "Full Service", quantity: 1, unitPriceCents: 10_000 }],
      });
    expect(editRes.status).toBe(409);
    expect(editRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");

    const delRes = await request(app)
      .delete(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .set("Cookie", userCookie);
    expect(delRes.status).toBe(409);
    expect(delRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
  });
});
