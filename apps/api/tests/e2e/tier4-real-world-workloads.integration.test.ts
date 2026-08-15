import { createHash, randomUUID } from "node:crypto";

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
    "Tier 4 integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}

const databaseName = `crossval_t4_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`;
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

describe("Tier 4: Real-World Workloads & Multi-Tenant Security Isolation Suite", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-tier4-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_t4_session",
    SESSION_TTL_SECONDS: "3600",
    REGISTRATION_ENABLED: "true",
  });
  const app = createApp({ database, environment });

  let connected = false;
  let userACookie = "";
  let userAId = new ObjectId();
  let userBCookie = "";

  beforeAll(async () => {
    await client.connect();
    connected = true;
    await runMigrations(database);

    // Sign up User A
    const signupA = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "tenant_a@example.com", password: validPassword })
      .expect(201);
    userACookie = cookieFrom(signupA);
    userAId = new ObjectId(signupA.body.data.id);

    // Sign up User B
    const signupB = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "tenant_b@example.com", password: validPassword })
      .expect(201);
    userBCookie = cookieFrom(signupB);
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
  // SCENARIO 1: CORE ASSIGNMENT VERIFICATION WORKLOAD
  // =========================================================================
  describe("Scenario 1: Core Assignment Settlement Journey ($1,000 -> $400 -> $600 -> Reject $1)", () => {
    it("executes the full assignment verification journey with strict financial auditing", async () => {
      // Step 1: Create $1,000.00 order with 2 line items ($400 + $600)
      const createRes = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .send({
          customerName: "Assignment Client Corp",
          dueDate: dateOffset(14),
          items: [
            { description: "Phase 1 Milestone", quantity: 1, unitPriceCents: 40_000 },
            { description: "Phase 2 Milestone", quantity: 1, unitPriceCents: 60_000 },
          ],
        })
        .expect(201);

      const orderId = createRes.body.data.id;
      expect(createRes.body.data.totalAmountCents).toBe(100_000);
      expect(createRes.body.data.balanceDueCents).toBe(100_000);
      expect(createRes.body.data.status).toBe("pending");
      expect(createRes.body.data.isEditable).toBe(true);
      expect(createRes.body.data.isDeletable).toBe(true);

      // Verify summary before payment
      const summary1 = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(summary1.body.data.totalOrders).toBe(1);
      expect(summary1.body.data.outstandingAmountCents).toBe(100_000);
      expect(summary1.body.data.collectedAmountCents).toBe(0);

      // Step 2: Record $400.00 partial settlement
      const pay1Res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .set("Idempotency-Key", randomUUID())
        .send({
          amountCents: 40_000,
          paymentDate: todayUtc(),
          note: "Installment 1 - Wire #101",
        })
        .expect(201);

      expect(pay1Res.body.data.order).toMatchObject({
        status: "partially_paid",
        totalAmountCents: 100_000,
        paidAmountCents: 40_000,
        balanceDueCents: 60_000,
      });

      const detail1 = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);

      expect(detail1.body.data.isEditable).toBe(false);
      expect(detail1.body.data.isDeletable).toBe(false);
      expect(detail1.body.data.payments).toHaveLength(1);

      // Verify summary after partial payment
      const summary2 = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(summary2.body.data.outstandingAmountCents).toBe(60_000);
      expect(summary2.body.data.collectedAmountCents).toBe(40_000);

      // Step 3: Verify Edit & Delete are permanently blocked
      await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .send({
          customerName: "Should Fail",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 100_000 }],
        })
        .expect(409);

      await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(409);

      // Step 4: Record $600.00 full settlement
      const pay2Res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .set("Idempotency-Key", randomUUID())
        .send({
          amountCents: 60_000,
          paymentDate: todayUtc(),
          note: "Installment 2 - Final Settlement",
        })
        .expect(201);

      expect(pay2Res.body.data.order).toMatchObject({
        status: "paid",
        totalAmountCents: 100_000,
        paidAmountCents: 100_000,
        balanceDueCents: 0,
      });

      // Verify summary after full settlement
      const summary3 = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(summary3.body.data.outstandingAmountCents).toBe(0);
      expect(summary3.body.data.collectedAmountCents).toBe(100_000);

      // Step 5: Attempt $0.01 and $1.00 overpayments against 0 balance -> Rejected
      const overpayCent = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 1, paymentDate: todayUtc() })
        .expect(422);
      expect(overpayCent.body.error.code).toBe("ORDER_ALREADY_PAID");
      expect(overpayCent.body.error.details.remainingAmountCents).toBe(0);

      const overpayDollar = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 100, paymentDate: todayUtc() })
        .expect(422);
      expect(overpayDollar.body.error.code).toBe("ORDER_ALREADY_PAID");
      expect(overpayDollar.body.error.details.remainingAmountCents).toBe(0);

      // Step 6: Detail View & Database Audit
      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);

      expect(detail.body.data.payments).toHaveLength(2);
      // Detail response is reverse-chronological (newest first)
      expect(detail.body.data.payments[0].amountCents).toBe(60_000);
      expect(detail.body.data.payments[1].amountCents).toBe(40_000);

      // Database document is chronological (oldest first)
      const doc = await getCollections(database).orders.findOne({ _id: new ObjectId(orderId) });
      expect(doc?.payments).toHaveLength(2);
      expect(doc?.payments?.[0]?.amountCents).toBe(40_000);
      expect(doc?.payments?.[1]?.amountCents).toBe(60_000);
      expect(doc?.balanceDueCents).toBe(0);
      expect(doc?.paymentCount).toBe(2);
    });
  });

  // =========================================================================
  // SCENARIO 2: MULTI-TENANT SECURITY ISOLATION
  // =========================================================================
  describe("Scenario 2: Multi-Tenant Security Isolation & Concealment (HTTP 404)", () => {
    it("ensures User A and User B cannot view, edit, delete, or pay each other's orders", async () => {
      // User A creates Order A ($500.00)
      const orderARes = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .send({
          customerName: "User A Confidential",
          dueDate: dateOffset(7),
          items: [{ description: "Private Consulting", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);
      const orderAId = orderARes.body.data.id;

      // User B creates Order B ($1,200.00)
      const orderBRes = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userBCookie)
        .send({
          customerName: "User B Confidential",
          dueDate: dateOffset(7),
          items: [{ description: "Private Infrastructure", quantity: 1, unitPriceCents: 120_000 }],
        })
        .expect(201);
      const orderBId = orderBRes.body.data.id;

      // 1. Cross-Tenant Detail Fetch: User A tries to view Order B -> 404 ORDER_NOT_FOUND
      const fetchBbyA = await request(app)
        .get(`/v1/orders/${orderBId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(404);
      expect(fetchBbyA.body.error.code).toBe("ORDER_NOT_FOUND");

      // 2. Cross-Tenant Payment: User A tries to pay Order B -> 404 ORDER_NOT_FOUND
      const payBbyA = await request(app)
        .post(`/v1/orders/${orderBId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: todayUtc() })
        .expect(404);
      expect(payBbyA.body.error.code).toBe("ORDER_NOT_FOUND");

      // 3. Cross-Tenant Edit: User A tries to edit Order B -> 404 ORDER_NOT_FOUND
      const editBbyA = await request(app)
        .patch(`/v1/orders/${orderBId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .send({
          customerName: "Hacked",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(404);
      expect(editBbyA.body.error.code).toBe("ORDER_NOT_FOUND");

      // 4. Cross-Tenant Deletion: User A tries to delete Order B -> 404 ORDER_NOT_FOUND
      const delBbyA = await request(app)
        .delete(`/v1/orders/${orderBId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(404);
      expect(delBbyA.body.error.code).toBe("ORDER_NOT_FOUND");

      // Verify Order B remains intact in DB
      const docB = await getCollections(database).orders.findOne({ _id: new ObjectId(orderBId) });
      expect(docB).not.toBeNull();
      expect(docB?.balanceDueCents).toBe(120_000);

      // 5. Cross-Tenant Dashboard List: User A sees only Order A
      const listA = await request(app)
        .get("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(listA.body.data).toHaveLength(1);
      expect(listA.body.data[0].id).toBe(orderAId);

      // 6. Cross-Tenant Summary: User A sees only $500.00; User B sees only $1,200.00
      const summaryA = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(summaryA.body.data.outstandingAmountCents).toBe(50_000);

      const summaryB = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userBCookie)
        .expect(200);
      expect(summaryB.body.data.outstandingAmountCents).toBe(120_000);
    });
  });

  // =========================================================================
  // SCENARIO 3: FULL BUSINESS LIFECYCLE & PORTFOLIO ROLLUP (25 ORDERS)
  // =========================================================================
  describe("Scenario 3: Portfolio Rollup, Multi-Page Pagination & Filter Transitions", () => {
    it("handles 25 orders across all states with accurate aggregations and pagination", async () => {
      const now = new Date();

      // Seed 25 orders for User A:
      // 10 pending ($100 each = $1,000 total / 100,000 cents)
      // 5 partially_paid ($200 total each, $100 paid = $500 outstanding, $500 collected)
      // 5 paid ($300 total each, $300 paid = $1,500 collected / 150,000 cents)
      // 5 overdue ($400 total each, past due date = $2,000 overdue / 200,000 cents)
      const seedOrders = [];

      // 10 pending
      for (let i = 1; i <= 10; i++) {
        seedOrders.push({
          _id: new ObjectId(),
          userId: userAId,
          customerName: `Pending Customer ${i}`,
          customerNameNormalized: `pending customer ${i}`,
          dueDate: dateOffset(10),
          lineItems: [
            {
              _id: new ObjectId(),
              position: 0,
              description: `Pending Item ${i}`,
              quantity: 1,
              unitPriceCents: 10_000,
            },
          ],
          totalAmountCents: 10_000,
          balanceDueCents: 10_000,
          paymentCount: 0,
          payments: [],
          createdAt: new Date(now.getTime() - (30 - i) * 60_000),
          updatedAt: new Date(now.getTime() - (30 - i) * 60_000),
        });
      }

      // 5 partially_paid
      for (let i = 1; i <= 5; i++) {
        const idempKey = randomUUID();
        const fingerprint = createHash("sha256")
          .update(JSON.stringify([10_000, todayUtc(), "Half paid"]))
          .digest("hex");

        seedOrders.push({
          _id: new ObjectId(),
          userId: userAId,
          customerName: `Partial Customer ${i}`,
          customerNameNormalized: `partial customer ${i}`,
          dueDate: dateOffset(10),
          lineItems: [
            {
              _id: new ObjectId(),
              position: 0,
              description: `Partial Item ${i}`,
              quantity: 1,
              unitPriceCents: 20_000,
            },
          ],
          totalAmountCents: 20_000,
          balanceDueCents: 10_000,
          paymentCount: 1,
          payments: [
            {
              _id: new ObjectId(),
              idempotencyKey: idempKey,
              requestFingerprint: fingerprint,
              amountCents: 10_000,
              paymentDate: todayUtc(),
              note: "Half paid",
              createdAt: now,
            },
          ],
          createdAt: new Date(now.getTime() - (20 - i) * 60_000),
          updatedAt: new Date(now.getTime() - (20 - i) * 60_000),
        });
      }

      // 5 paid
      for (let i = 1; i <= 5; i++) {
        const idempKey = randomUUID();
        const fingerprint = createHash("sha256")
          .update(JSON.stringify([30_000, todayUtc(), "Full pay"]))
          .digest("hex");

        seedOrders.push({
          _id: new ObjectId(),
          userId: userAId,
          customerName: `Paid Customer ${i}`,
          customerNameNormalized: `paid customer ${i}`,
          dueDate: dateOffset(10),
          lineItems: [
            {
              _id: new ObjectId(),
              position: 0,
              description: `Paid Item ${i}`,
              quantity: 1,
              unitPriceCents: 30_000,
            },
          ],
          totalAmountCents: 30_000,
          balanceDueCents: 0,
          paymentCount: 1,
          payments: [
            {
              _id: new ObjectId(),
              idempotencyKey: idempKey,
              requestFingerprint: fingerprint,
              amountCents: 30_000,
              paymentDate: todayUtc(),
              note: "Full pay",
              createdAt: now,
            },
          ],
          createdAt: new Date(now.getTime() - (15 - i) * 60_000),
          updatedAt: new Date(now.getTime() - (15 - i) * 60_000),
        });
      }

      // 5 overdue
      for (let i = 1; i <= 5; i++) {
        seedOrders.push({
          _id: new ObjectId(),
          userId: userAId,
          customerName: `Overdue Customer ${i}`,
          customerNameNormalized: `overdue customer ${i}`,
          dueDate: dateOffset(-10),
          lineItems: [
            {
              _id: new ObjectId(),
              position: 0,
              description: `Overdue Item ${i}`,
              quantity: 1,
              unitPriceCents: 40_000,
            },
          ],
          totalAmountCents: 40_000,
          balanceDueCents: 40_000,
          paymentCount: 0,
          payments: [],
          createdAt: new Date(now.getTime() - (10 - i) * 60_000),
          updatedAt: new Date(now.getTime() - (10 - i) * 60_000),
        });
      }

      await getCollections(database).orders.insertMany(seedOrders);

      // 1. Verify Portfolio Summary Aggregates
      // outstanding: 10*10,000 + 5*10,000 + 5*0 + 5*40,000 = 100,000 + 50,000 + 200,000 = 350,000 cents ($3,500.00)
      // collected: 5*10,000 + 5*30,000 = 50,000 + 150,000 = 200,000 cents ($2,000.00)
      // overdue: 5*40,000 = 200,000 cents ($2,000.00)
      const summary = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);

      expect(summary.body.data).toMatchObject({
        totalOrders: 25,
        outstandingAmountCents: 350_000,
        collectedAmountCents: 200_000,
        overdueAmountCents: 200_000,
      });

      // 2. Verify Multi-Page Pagination
      const page1 = await request(app)
        .get("/v1/orders?page=1&pageSize=10")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(page1.body.data).toHaveLength(10);
      expect(page1.body.meta).toMatchObject({
        page: 1,
        pageSize: 10,
        totalItems: 25,
        totalPages: 3,
      });

      const page2 = await request(app)
        .get("/v1/orders?page=2&pageSize=10")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(page2.body.data).toHaveLength(10);
      expect(page2.body.meta.page).toBe(2);

      const page3 = await request(app)
        .get("/v1/orders?page=3&pageSize=10")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(page3.body.data).toHaveLength(5);
      expect(page3.body.meta.page).toBe(3);

      const page4 = await request(app)
        .get("/v1/orders?page=4&pageSize=10")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(page4.body.data).toHaveLength(0);
      expect(page4.body.meta.totalPages).toBe(3);

      // 3. Verify Status Filters
      const overdueList = await request(app)
        .get("/v1/orders?status=overdue")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(overdueList.body.data).toHaveLength(5);
      expect(overdueList.body.data.every((o: { status: string }) => o.status === "overdue")).toBe(true);

      const paidList = await request(app)
        .get("/v1/orders?status=paid")
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .expect(200);
      expect(paidList.body.data).toHaveLength(5);
      expect(paidList.body.data.every((o: { status: string }) => o.status === "paid")).toBe(true);
    });
  });

  // =========================================================================
  // SCENARIO 4: MAXIMUM LEDGER CAPACITY BOUNDARY (1,000 PAYMENTS LIMIT)
  // =========================================================================
  describe("Scenario 4: Maximum Ledger Capacity Boundary (1,000 Payments Limit)", () => {
    it("rejects the 1,001st payment with 422 PAYMENT_LIMIT_REACHED", async () => {
      const now = new Date();
      // Create an order for $10,000.00 (1,000,000 cents)
      // Pre-populate with 1,000 micro-payments of $1.00 (100 cents) directly in database
      const microPayments = Array.from({ length: 1000 }, (_, i) => ({
        _id: new ObjectId(),
        idempotencyKey: randomUUID(),
        requestFingerprint: createHash("sha256").update(`micro_${i}`).digest("hex"),
        amountCents: 100,
        paymentDate: todayUtc(),
        note: `Micro payment ${i + 1}`,
        createdAt: now,
      }));

      const largeOrder = {
        _id: new ObjectId(),
        userId: userAId,
        customerName: "Ledger Limit Corp",
        customerNameNormalized: "ledger limit corp",
        dueDate: dateOffset(30),
        lineItems: [
          {
            _id: new ObjectId(),
            position: 0,
            description: "High Capacity Order",
            quantity: 1,
            unitPriceCents: 1_000_000,
          },
        ],
        totalAmountCents: 1_000_000,
        balanceDueCents: 900_000, // 1,000,000 - (1000 * 100) = 900,000 cents remaining ($9,000.00)
        paymentCount: 1000,
        payments: microPayments,
        createdAt: now,
        updatedAt: now,
      };

      await getCollections(database).orders.insertOne(largeOrder);

      // Attempt the 1,001st payment via API
      const res = await request(app)
        .post(`/v1/orders/${largeOrder._id.toHexString()}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userACookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 100, paymentDate: todayUtc(), note: "1001st payment" })
        .expect(422);

      expect(res.body.error.code).toBe("PAYMENT_LIMIT_REACHED");

      // Verify balance remains exactly 900,000 cents and count is 1000
      const doc = await getCollections(database).orders.findOne({ _id: largeOrder._id });
      expect(doc?.paymentCount).toBe(1000);
      expect(doc?.balanceDueCents).toBe(900_000);
      expect(doc?.payments).toHaveLength(1000);
    });
  });
});
