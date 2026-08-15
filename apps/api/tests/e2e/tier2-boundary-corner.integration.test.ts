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
    "Tier 2 integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}

const databaseName = `crossval_t2_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`;
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

describe("Tier 2: Boundary & Corner Cases E2E / Integration Suite", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-tier2-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_t2_session",
    SESSION_TTL_SECONDS: "3600",
    REGISTRATION_ENABLED: "true",
  });
  const app = createApp({ database, environment });
  let connected = false;
  let userCookie = "";

  beforeAll(async () => {
    await client.connect();
    connected = true;
    await runMigrations(database);

    const signup = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "tier2_tester@example.com", password: validPassword })
      .expect(201);

    userCookie = cookieFrom(signup);
  }, 25_000);

  beforeEach(async () => {
    await getCollections(database).orders.deleteMany({});
  });

  afterAll(async () => {
    if (connected) {
      await database.dropDatabase();
    }
    await client.close();
  });

  // =========================================================================
  // MONEY BOUNDARIES
  // =========================================================================
  describe("Money Boundary & Financial Invariant Tests", () => {
    it("T2-MONEY-01: permits minimum allowable order value of 1 cent ($0.01)", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "One Cent Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Micro Item", quantity: 1, unitPriceCents: 1 }],
        })
        .expect(201);

      expect(res.body.data.totalAmountCents).toBe(1);
      expect(res.body.data.balanceDueCents).toBe(1);
    });

    it("T2-MONEY-02: permits maximum allowable order value of $9,999,999.99 (999,999,999 cents)", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Max Value Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Enterprise Max", quantity: 1, unitPriceCents: 999_999_999 }],
        })
        .expect(201);

      expect(res.body.data.totalAmountCents).toBe(999_999_999);
      expect(res.body.data.balanceDueCents).toBe(999_999_999);
    });

    it("T2-MONEY-03: rejects arithmetic overflow exceeding $9,999,999.99 ($10,000,000.00)", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Overflow Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Overflow Item", quantity: 1, unitPriceCents: 1_000_000_000 }],
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("T2-MONEY-04: rejects multi-line summation exceeding $9,999,999.99", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Multi Sum Overflow",
          dueDate: dateOffset(7),
          items: [
            { description: "Half A", quantity: 1, unitPriceCents: 600_000_000 },
            { description: "Half B", quantity: 1, unitPriceCents: 500_000_000 },
          ],
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("T2-MONEY-05: rejects zero or negative unit price cents", async () => {
      const resZero = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Zero Price Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Free Item", quantity: 1, unitPriceCents: 0 }],
        })
        .expect(422);

      expect(resZero.body.error.code).toBe("VALIDATION_FAILED");

      const resNegative = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Negative Price Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Negative Item", quantity: 1, unitPriceCents: -500 }],
        })
        .expect(422);

      expect(resNegative.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("T2-MONEY-06: rejects fractional floating-point cents in payloads", async () => {
      const resFloat = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Float Price Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Float Item", quantity: 1, unitPriceCents: 10.5 }],
        })
        .expect(422);

      expect(resFloat.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // QUANTITY & ITEM COUNT BOUNDARIES
  // =========================================================================
  describe("Quantity & Item Count Boundary Tests", () => {
    it("T2-QTY-01: permits minimum quantity of 1", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Min Qty Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 5_000 }],
        })
        .expect(201);

      expect(res.body.data.items[0].quantity).toBe(1);
    });

    it("T2-QTY-02: permits maximum quantity of 1,000,000", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Max Qty Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Micro Hardware", quantity: 1_000_000, unitPriceCents: 1 }],
        })
        .expect(201);

      expect(res.body.data.items[0].quantity).toBe(1_000_000);
      expect(res.body.data.totalAmountCents).toBe(1_000_000);
    });

    it("T2-QTY-03: rejects quantity 0 and quantity exceeding 1,000,000", async () => {
      const resZero = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Zero Qty Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 0, unitPriceCents: 100 }],
        })
        .expect(422);
      expect(resZero.body.error.code).toBe("VALIDATION_FAILED");

      const resOver = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Over Qty Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1_000_001, unitPriceCents: 1 }],
        })
        .expect(422);
      expect(resOver.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("T2-QTY-04: permits line items array upper bound of 100 items", async () => {
      const items = Array.from({ length: 100 }, (_, i) => ({
        description: `Line Item ${i + 1}`,
        quantity: 1,
        unitPriceCents: 100,
      }));

      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "100 Items Corp",
          dueDate: dateOffset(7),
          items,
        })
        .expect(201);

      expect(res.body.data.items).toHaveLength(100);
      expect(res.body.data.totalAmountCents).toBe(10_000);
    });

    it("T2-QTY-05: rejects line items array exceeding 100 items (101 items)", async () => {
      const items = Array.from({ length: 101 }, (_, i) => ({
        description: `Line Item ${i + 1}`,
        quantity: 1,
        unitPriceCents: 100,
      }));

      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "101 Items Corp",
          dueDate: dateOffset(7),
          items,
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // DATE & CALENDAR BOUNDARIES
  // =========================================================================
  describe("Date & Calendar Boundary Tests", () => {
    it("T2-DATE-01: derives pending for order due today (due today is NOT overdue)", async () => {
      const today = todayUtc();
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Due Today Corp",
          dueDate: today,
          items: [{ description: "Urgent Service", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      expect(res.body.data.dueDate).toBe(today);
      expect(res.body.data.status).toBe("pending");
    });

    it("T2-DATE-02: derives partially_paid for partially settled order due today", async () => {
      const today = todayUtc();
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Due Today Partial Corp",
          dueDate: today,
          items: [{ description: "Service", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const payRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 20_000, paymentDate: today })
        .expect(201);

      expect(payRes.body.data.order.status).toBe("partially_paid");
    });

    it("T2-DATE-03: accepts valid leap year date (2024-02-29)", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Leap Year Corp",
          dueDate: "2024-02-29",
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      expect(res.body.data.dueDate).toBe("2024-02-29");
    });

    it("T2-DATE-04: rejects non-leap year leap day (2025-02-29) and impossible date (2026-02-30)", async () => {
      const resLeap = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Invalid Leap Corp",
          dueDate: "2025-02-29",
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(422);
      expect(resLeap.body.error.code).toBe("VALIDATION_FAILED");

      const resFeb30 = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Feb 30 Corp",
          dueDate: "2026-02-30",
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(422);
      expect(resFeb30.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("T2-DATE-05: accepts historical payment dates but rejects future payment dates", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Temporal Pay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Historical date (5 days ago) is valid
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: dateOffset(-5) })
        .expect(201);

      // Future date (tomorrow) is rejected
      const futureRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: dateOffset(1) })
        .expect(422);

      expect(futureRes.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // 1-CENT MICRO-PAYMENT PERMANENT LOCKS (HTTP 409)
  // =========================================================================
  describe("1-Cent Micro-Payment Permanent Lock Tests", () => {
    it("T2-LOCK-01: permanently locks order against edits (PATCH) after a 1-cent payment", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Micro Lock Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Large Package", quantity: 1, unitPriceCents: 100_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Pay 1 single cent ($0.01)
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 1, paymentDate: todayUtc() })
        .expect(201);

      // Attempt edit
      const editRes = await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Hacked Name",
          dueDate: dateOffset(14),
          items: [{ description: "Hacked Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(409);

      expect(editRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
    });

    it("T2-LOCK-02: permanently locks order against deletion (DELETE) after a 1-cent payment", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Micro Lock Delete Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Package", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Pay 1 cent
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 1, paymentDate: todayUtc() })
        .expect(201);

      // Attempt deletion
      const deleteRes = await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(409);

      expect(deleteRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");

      // Verify document still intact in MongoDB
      const doc = await getCollections(database).orders.findOne({ _id: new ObjectId(orderId) });
      expect(doc).not.toBeNull();
      expect(doc?.balanceDueCents).toBe(49_999);
      expect(doc?.paymentCount).toBe(1);
    });

    it("T2-LOCK-03: enforces permanent lock on fully settled (100% paid) orders", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Full Settle Lock Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 20_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Pay full balance
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 20_000, paymentDate: todayUtc() })
        .expect(201);

      // Verify edit fails 409
      const editRes = await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "New Name",
          dueDate: dateOffset(7),
          items: [{ description: "New Item", quantity: 1, unitPriceCents: 30_000 }],
        })
        .expect(409);
      expect(editRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");

      // Verify delete fails 409
      const deleteRes = await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(409);
      expect(deleteRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
    });
  });

  // =========================================================================
  // OVERPAYMENT REJECTION BOUNDARIES
  // =========================================================================
  describe("Overpayment Rejection Boundaries", () => {
    it("T2-OVER-01: rejects 1-cent overpayment on fresh unpaid order", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Overpay Fresh Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Attempt $500.01 on $500.00 balance
      const res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 50_001, paymentDate: todayUtc() })
        .expect(422);

      expect(res.body.error.code).toBe("PAYMENT_EXCEEDS_BALANCE");
      expect(res.body.error.details.remainingAmountCents).toBe(50_000);
    });

    it("T2-OVER-02: rejects 1-cent overpayment against partial balance", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Overpay Partial Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 100_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Pay $700.00 (remaining balance $300.00)
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 70_000, paymentDate: todayUtc() })
        .expect(201);

      // Attempt $300.01 on $300.00 balance
      const res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 30_001, paymentDate: todayUtc() })
        .expect(422);

      expect(res.body.error.code).toBe("PAYMENT_EXCEEDS_BALANCE");
      expect(res.body.error.details.remainingAmountCents).toBe(30_000);
    });

    it("T2-OVER-03: rejects 1-cent payment against fully settled order (0 balance)", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Zero Balance Overpay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Settle in full
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: todayUtc() })
        .expect(201);

      // Attempt 1 cent payment on 0 balance
      const res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 1, paymentDate: todayUtc() })
        .expect(422);

      expect(res.body.error.code).toBe("ORDER_ALREADY_PAID");
      expect(res.body.error.details.remainingAmountCents).toBe(0);
    });
  });

  // =========================================================================
  // IDEMPOTENCY FINGERPRINT TAMPERING & REUSED BOUNDARIES
  // =========================================================================
  describe("Idempotency Key Fingerprint Tampering Boundaries", () => {
    it("T2-IDEMP-01: returns 409 IDEMPOTENCY_KEY_REUSED on amount tampering (1-cent drift)", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Idemp Tamper Amount Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();

      // Original request: $200.00
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 20_000, paymentDate: todayUtc(), note: "Wire 1" })
        .expect(201);

      // Tampered amount: $200.01 with same key
      const tamperRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 20_001, paymentDate: todayUtc(), note: "Wire 1" })
        .expect(409);

      expect(tamperRes.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });

    it("T2-IDEMP-02: returns 409 IDEMPOTENCY_KEY_REUSED on payment date tampering", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Idemp Tamper Date Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();

      // Original request
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 15_000, paymentDate: dateOffset(-2), note: "Wire 1" })
        .expect(201);

      // Tampered date
      const tamperRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 15_000, paymentDate: dateOffset(-1), note: "Wire 1" })
        .expect(409);

      expect(tamperRes.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });

    it("T2-IDEMP-03: returns 409 IDEMPOTENCY_KEY_REUSED on payment note semantic alteration", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Idemp Tamper Note Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();

      // Original request with note
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 10_000, paymentDate: todayUtc(), note: "Invoice A" })
        .expect(201);

      // Altered note
      const tamperRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 10_000, paymentDate: todayUtc(), note: "Invoice B" })
        .expect(409);

      expect(tamperRes.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });

    it("T2-IDEMP-04: rejects payment missing Idempotency-Key header", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Missing Header Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        // No Idempotency-Key header
        .send({ amountCents: 5_000, paymentDate: todayUtc() })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });

    it("T2-IDEMP-05: rejects payment with malformed UUID in Idempotency-Key header", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Malformed UUID Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", "not-a-valid-uuid-12345")
        .send({ amountCents: 5_000, paymentDate: todayUtc() })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });
});
