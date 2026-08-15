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
    "Tier 3 integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}

const databaseName = `crossval_t3_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`;
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

describe("Tier 3: Pairwise Interactions & Concurrency Race Defenses Suite", () => {
  // Independent MongoClients for concurrent race simulation
  const primaryClient = new MongoClient(mongoUri, {
    appName: "crossval-t3-primary",
    serverSelectionTimeoutMS: 15_000,
  });
  const concurrentClient = new MongoClient(mongoUri, {
    appName: "crossval-t3-concurrent",
    serverSelectionTimeoutMS: 15_000,
  });

  const primaryDatabase = primaryClient.db(databaseName);
  const concurrentDatabase = concurrentClient.db(databaseName);

  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_t3_session",
    SESSION_TTL_SECONDS: "3600",
    REGISTRATION_ENABLED: "true",
  });

  const primaryApp = createApp({ database: primaryDatabase, environment });
  const concurrentApp = createApp({ database: concurrentDatabase, environment });

  let connected = false;
  let userCookie = "";

  beforeAll(async () => {
    await Promise.all([primaryClient.connect(), concurrentClient.connect()]);
    connected = true;
    await runMigrations(primaryDatabase);

    const signup = await request(primaryApp)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "tier3_tester@example.com", password: validPassword })
      .expect(201);

    userCookie = cookieFrom(signup);
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

  // =========================================================================
  // PAIRWISE LIFECYCLE COMBINATIONS
  // =========================================================================
  describe("Pairwise Lifecycle State Transitions", () => {
    it("T3-PAIR-01: Edit before payment recalculates balance, followed by payment locking subsequent edit/delete", async () => {
      // 1. Create order for $100.00
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Pairwise Flow 1",
          dueDate: dateOffset(7),
          items: [{ description: "Initial Draft", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // 2. Replace unpaid order: increase to $250.00
      const edited = await request(primaryApp)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Pairwise Flow 1 Updated",
          dueDate: dateOffset(14),
          items: [
            { description: "Item A", quantity: 1, unitPriceCents: 15_000 },
            { description: "Item B", quantity: 1, unitPriceCents: 10_000 },
          ],
        })
        .expect(200);

      expect(edited.body.data.totalAmountCents).toBe(25_000);
      expect(edited.body.data.balanceDueCents).toBe(25_000);

      // 3. Record partial payment of $100.00 against new balance
      const paid = await request(primaryApp)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: todayUtc() })
        .expect(201);

      expect(paid.body.data.order.balanceDueCents).toBe(15_000);

      const detail = await request(primaryApp)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.isEditable).toBe(false);
      expect(detail.body.data.isDeletable).toBe(false);

      // 4. Assert subsequent edit attempts return 409
      await request(primaryApp)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Forbidden Edit",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(409);

      // 5. Assert subsequent delete attempts return 409
      await request(primaryApp)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(409);
    });

    it("T3-PAIR-02: Full settlement transitions status to paid and blocks subsequent edit and delete", async () => {
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Pairwise Settle",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 40_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Settle in full
      const settled = await request(primaryApp)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 40_000, paymentDate: todayUtc() })
        .expect(201);

      expect(settled.body.data.order.status).toBe("paid");
      expect(settled.body.data.order.balanceDueCents).toBe(0);

      // Subsequent edit returns 409
      await request(primaryApp)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "New",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(409);

      // Subsequent delete returns 409
      await request(primaryApp)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(409);
    });

    it("T3-PAIR-03: Deletion of unpaid order prevents subsequent payments and detail fetches (404)", async () => {
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Delete Then Pay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 30_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Delete unpaid order
      await request(primaryApp)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(204);

      // Detail fetch returns 404
      await request(primaryApp)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(404);

      // Payment attempt returns 404
      const payRes = await request(primaryApp)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: todayUtc() })
        .expect(404);

      expect(payRes.body.error.code).toBe("ORDER_NOT_FOUND");
    });
  });

  // =========================================================================
  // CONCURRENT MULTI-CLIENT PAYMENT RACES
  // =========================================================================
  describe("Concurrent Multi-Client Payment Races", () => {
    it("T3-CONCUR-01: Two concurrent payments exceeding balance -> exactly one succeeds, competing fails with 422", async () => {
      // Order with $500.00 balance
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Overdraft Race Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Package", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Fire two concurrent $400 payments across independent clients
      const [resA, resB] = await Promise.all([
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 40_000, paymentDate: todayUtc() }),
        request(concurrentApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 40_000, paymentDate: todayUtc() }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 422]);

      const failureRes = resA.status === 422 ? resA : resB;
      expect(failureRes.body.error.code).toBe("PAYMENT_EXCEEDS_BALANCE");
      expect(failureRes.body.error.details.remainingAmountCents).toBe(10_000);

      // Verify MongoDB final state: balance is exactly $100 (10,000 cents), 1 payment recorded
      const doc = await getCollections(primaryDatabase).orders.findOne({
        _id: new ObjectId(orderId),
      });
      expect(doc?.balanceDueCents).toBe(10_000);
      expect(doc?.paymentCount).toBe(1);
      expect(doc?.payments).toHaveLength(1);
    });

    it("T3-CONCUR-02: Two concurrent payments exactly consuming balance serialize cleanly to paid status", async () => {
      // Order with $1,000.00 balance
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Split Settle Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Project", quantity: 1, unitPriceCents: 100_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Client A pays $400, Client B pays $600 simultaneously
      const [resA, resB] = await Promise.all([
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 40_000, paymentDate: todayUtc() }),
        request(concurrentApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 60_000, paymentDate: todayUtc() }),
      ]);

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);

      // Final document inspection: 0 balance, status paid, 2 payments
      const doc = await getCollections(primaryDatabase).orders.findOne({
        _id: new ObjectId(orderId),
      });
      expect(doc?.balanceDueCents).toBe(0);
      expect(doc?.paymentCount).toBe(2);
      expect(doc?.payments).toHaveLength(2);
    });
  });

  // =========================================================================
  // CONCURRENT IDEMPOTENCY STAMPEDES
  // =========================================================================
  describe("Concurrent Idempotency Stampedes", () => {
    it("T3-IDEMP-01: 5 concurrent requests with identical idempotency key -> exactly one 201, four 200 replays", async () => {
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Idemp Stampede Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();
      const payload = { amountCents: 10_000, paymentDate: todayUtc(), note: "Stampede Test" };

      // Dispatch 5 simultaneous requests with the SAME key and payload across dual apps
      const results = await Promise.all([
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send(payload),
        request(concurrentApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send(payload),
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send(payload),
        request(concurrentApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send(payload),
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send(payload),
      ]);

      const createdCount = results.filter((r) => r.status === 201).length;
      const replayedCount = results.filter((r) => r.status === 200).length;

      expect(createdCount).toBe(1);
      expect(replayedCount).toBe(4);

      // Verify all 4 replayed responses have header
      results
        .filter((r) => r.status === 200)
        .forEach((r) => {
          expect(r.headers["idempotency-replayed"]).toBe("true");
        });

      // Verify MongoDB state: exactly 1 payment, balance is $400.00
      const doc = await getCollections(primaryDatabase).orders.findOne({
        _id: new ObjectId(orderId),
      });
      expect(doc?.paymentCount).toBe(1);
      expect(doc?.payments).toHaveLength(1);
      expect(doc?.balanceDueCents).toBe(40_000);
    });

    it("T3-IDEMP-02: Concurrent requests with same key but different amounts -> one 201, one 409 Conflict", async () => {
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Conflict Stampede Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();

      const [resA, resB] = await Promise.all([
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send({ amountCents: 15_000, paymentDate: todayUtc() }),
        request(concurrentApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send({ amountCents: 20_000, paymentDate: todayUtc() }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    });
  });

  // =========================================================================
  // CONCURRENT PAYMENT VS MUTATION RACES
  // =========================================================================
  describe("Concurrent Payment vs Mutation Races", () => {
    it("T3-RACE-01: Payment racing Edit preserves locking invariants atomically", async () => {
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Pay vs Edit Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Fire concurrent Payment ($200) and Edit ($600)
      const [payRes, editRes] = await Promise.all([
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 20_000, paymentDate: todayUtc() }),
        request(concurrentApp)
          .patch(`/v1/orders/${orderId}`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .send({
            customerName: "Pay vs Edit Corp Edited",
            dueDate: dateOffset(14),
            items: [{ description: "New Item", quantity: 1, unitPriceCents: 60_000 }],
          }),
      ]);

      // Either:
      // Case A: Payment won (pay 201, edit 409 ORDER_LOCKED_AFTER_PAYMENT)
      // Case B: Edit won (edit 200, pay 201 against new balance)
      if (payRes.status === 201 && editRes.status === 409) {
        expect(editRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
      } else if (editRes.status === 200 && payRes.status === 201) {
        expect(payRes.body.data.order.totalAmountCents).toBe(60_000);
      } else {
        throw new Error(
          `Unexpected race outcome: Pay ${payRes.status}, Edit ${editRes.status}`,
        );
      }

      // Assert DB invariant: paymentCount === payments.length
      const doc = await getCollections(primaryDatabase).orders.findOne({
        _id: new ObjectId(orderId),
      });
      expect(doc?.paymentCount).toBe(doc?.payments.length);
    });

    it("T3-RACE-02: Payment racing Delete preserves locking invariants atomically", async () => {
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Pay vs Delete Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 30_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Fire concurrent Payment ($100) and Delete
      const [payRes, deleteRes] = await Promise.all([
        request(primaryApp)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 10_000, paymentDate: todayUtc() }),
        request(concurrentApp)
          .delete(`/v1/orders/${orderId}`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie),
      ]);

      // Either:
      // Case A: Payment won (pay 201, delete 409 ORDER_LOCKED_AFTER_PAYMENT)
      // Case B: Delete won (delete 204, pay 404 ORDER_NOT_FOUND)
      if (payRes.status === 201 && deleteRes.status === 409) {
        expect(deleteRes.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
      } else if (deleteRes.status === 204 && payRes.status === 404) {
        expect(payRes.body.error.code).toBe("ORDER_NOT_FOUND");
      } else {
        throw new Error(
          `Unexpected race outcome: Pay ${payRes.status}, Delete ${deleteRes.status}`,
        );
      }
    });

    it("T3-RACE-03: High-contention micro-settlement stampede (10 concurrent requests on 100 cents balance)", async () => {
      // Order with $1.00 (100 cents) balance
      const created = await request(primaryApp)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "10-Client Stampede Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Micro Project", quantity: 1, unitPriceCents: 100 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // 10 concurrent requests, each attempting $0.20 (20 cents) with distinct keys
      const promises = Array.from({ length: 10 }, (_, i) => {
        const appInstance = i % 2 === 0 ? primaryApp : concurrentApp;
        return request(appInstance)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", randomUUID())
          .send({ amountCents: 20, paymentDate: todayUtc() });
      });

      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.status === 201).length;
      const failedCount = results.filter((r) => r.status === 422).length;

      // Exactly 5 payments of 20 cents consume 100 cents
      expect(successCount).toBe(5);
      expect(failedCount).toBe(5);

      // Verify MongoDB state: exactly 0 balance, 5 payments, paid status
      const doc = await getCollections(primaryDatabase).orders.findOne({
        _id: new ObjectId(orderId),
      });
      expect(doc?.balanceDueCents).toBe(0);
      expect(doc?.paymentCount).toBe(5);
      expect(doc?.payments).toHaveLength(5);
    });
  });
});
