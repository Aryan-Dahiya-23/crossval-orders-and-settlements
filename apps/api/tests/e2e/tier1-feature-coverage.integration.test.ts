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
    "Tier 1 integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}

const databaseName = `crossval_t1_${randomUUID().replaceAll("-", "").slice(0, 10)}_test`;
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

describe("Tier 1: Feature Coverage E2E / Integration Suite", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-tier1-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_t1_session",
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
      .send({ email: "tier1_tester@example.com", password: validPassword })
      .expect(201);

    userCookie = cookieFrom(signup);
    userId = new ObjectId(signup.body.data.id);
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
  // FEATURE 1: ORDER CREATION (>= 5 Tests)
  // =========================================================================
  describe("Feature 1: Order Creation", () => {
    it("T1-ORD-01: creates a single line-item order with pending status and correct totals", async () => {
      const dueDate = dateOffset(14);
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Acme Corporation",
          dueDate,
          items: [
            {
              description: "Consulting Package",
              quantity: 2,
              unitPriceCents: 50_000,
            },
          ],
        })
        .expect(201);

      expect(res.body.data).toMatchObject({
        customerName: "Acme Corporation",
        dueDate,
        status: "pending",
        totalAmountCents: 100_000,
        paidAmountCents: 0,
        balanceDueCents: 100_000,
        isEditable: true,
        isDeletable: true,
        payments: [],
      });
      expect(res.body.data.id).toMatch(/^[0-9a-f]{24}$/);
      expect(res.body.data.displayId).toMatch(/^ORD-[0-9A-F]{8}$/);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0]).toMatchObject({
        position: 0,
        description: "Consulting Package",
        quantity: 2,
        unitPriceCents: 50_000,
        lineTotalCents: 100_000,
      });
    });

    it("T1-ORD-02: creates a multi line-item order preserving item positions and ObjectIds", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Multi-Item Enterprise",
          dueDate: dateOffset(30),
          items: [
            { description: "Item 1 - Setup", quantity: 1, unitPriceCents: 15_000 },
            { description: "Item 2 - Licensing", quantity: 2, unitPriceCents: 12_500 },
            { description: "Item 3 - Support", quantity: 1, unitPriceCents: 60_000 },
          ],
        })
        .expect(201);

      expect(res.body.data.totalAmountCents).toBe(100_000); // 15,000 + 25,000 + 60,000 = 100,000
      expect(res.body.data.balanceDueCents).toBe(100_000);
      expect(res.body.data.items).toHaveLength(3);
      expect(res.body.data.items[0].position).toBe(0);
      expect(res.body.data.items[1].position).toBe(1);
      expect(res.body.data.items[2].position).toBe(2);
      expect(res.body.data.items[0].id).toMatch(/^[0-9a-f]{24}$/);
      expect(res.body.data.items[1].id).toMatch(/^[0-9a-f]{24}$/);
      expect(res.body.data.items[2].id).toMatch(/^[0-9a-f]{24}$/);
    });

    it("T1-ORD-03: normalizes customer name whitespace and supports prefix search", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "   Acme   Logistics    Global   LLC   ",
          dueDate: dateOffset(10),
          items: [{ description: "Freight", quantity: 1, unitPriceCents: 20_000 }],
        })
        .expect(201);

      expect(res.body.data.customerName).toBe("Acme Logistics Global LLC");

      // Verify search prefix matches
      const searchRes = await request(app)
        .get("/v1/orders?search=acme+logistics")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(searchRes.body.data).toHaveLength(1);
      expect(searchRes.body.data[0].id).toBe(res.body.data.id);
    });

    it("T1-ORD-04: parses canonical YYYY-MM-DD due date and preserves UTC timestamps", async () => {
      const futureDueDate = dateOffset(45);
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Future Tech Inc",
          dueDate: futureDueDate,
          items: [{ description: "Cloud Hosting", quantity: 12, unitPriceCents: 5_000 }],
        })
        .expect(201);

      expect(res.body.data.dueDate).toBe(futureDueDate);
      expect(new Date(res.body.data.createdAt).toISOString()).toBe(res.body.data.createdAt);
      expect(new Date(res.body.data.updatedAt).toISOString()).toBe(res.body.data.updatedAt);
    });

    it("T1-ORD-05: rejects client-supplied financial fields and status attempts", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Hacker Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 10_000 }],
          totalAmountCents: 100, // Disallowed client override
          status: "paid", // Disallowed client override
          balanceDueCents: 0, // Disallowed client override
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // FEATURE 2: LINE-ITEM DYNAMIC CALCULATIONS (>= 5 Tests)
  // =========================================================================
  describe("Feature 2: Line-Item Dynamic Calculations", () => {
    it("T1-CALC-01: calculates exact line subtotal as quantity * unitPriceCents", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Calculation Test 1",
          dueDate: dateOffset(7),
          items: [{ description: "Widgets", quantity: 5, unitPriceCents: 1234 }],
        })
        .expect(201);

      expect(res.body.data.items[0].lineTotalCents).toBe(6170); // 5 * 1234 = 6170
      expect(res.body.data.totalAmountCents).toBe(6170);
    });

    it("T1-CALC-02: sums multiple line items into grand total without floating point drift", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Calculation Test 2",
          dueDate: dateOffset(7),
          items: [
            { description: "Item A", quantity: 3, unitPriceCents: 1999 }, // 5997
            { description: "Item B", quantity: 7, unitPriceCents: 28 },   // 196
            { description: "Item C", quantity: 1, unitPriceCents: 14 },   // 14
          ],
        })
        .expect(201);

      expect(res.body.data.totalAmountCents).toBe(6207); // 5997 + 196 + 14 = 6207
      expect(res.body.data.balanceDueCents).toBe(6207);
    });

    it("T1-CALC-03: handles large unit quantities with precise integer multiplication", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Bulk Buyer",
          dueDate: dateOffset(14),
          items: [{ description: "Bulk Hardware Units", quantity: 50_000, unitPriceCents: 150 }],
        })
        .expect(201);

      expect(res.body.data.totalAmountCents).toBe(7_500_000); // 50,000 * 150 = 7,500,000 cents ($75,000.00)
    });

    it("T1-CALC-04: derives paidAmountCents and line totals accurately in detail response", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Derivation Test",
          dueDate: dateOffset(7),
          items: [
            { description: "Part 1", quantity: 2, unitPriceCents: 10_000 },
            { description: "Part 2", quantity: 3, unitPriceCents: 5_000 },
          ],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.totalAmountCents).toBe(35_000);
      expect(detail.body.data.balanceDueCents).toBe(35_000);
      expect(detail.body.data.paidAmountCents).toBe(0);
      expect(detail.body.data.items[0].lineTotalCents).toBe(20_000);
      expect(detail.body.data.items[1].lineTotalCents).toBe(15_000);
    });

    it("T1-CALC-05: rejects order creation with empty items array", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Zero Items Corp",
          dueDate: dateOffset(7),
          items: [],
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // FEATURE 3: ORDER REPLACEMENT / EDIT (>= 5 Tests)
  // =========================================================================
  describe("Feature 3: Order Replacement / Edit", () => {
    it("T1-EDIT-01: replaces an unpaid order completely with updated fields and recalculated totals", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Original Customer",
          dueDate: dateOffset(7),
          items: [{ description: "Initial Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const newDueDate = dateOffset(21);

      const editRes = await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Replaced Customer LLC",
          dueDate: newDueDate,
          items: [
            { description: "New Item A", quantity: 2, unitPriceCents: 20_000 },
            { description: "New Item B", quantity: 1, unitPriceCents: 15_000 },
          ],
        })
        .expect(200);

      expect(editRes.body.data).toMatchObject({
        id: orderId,
        customerName: "Replaced Customer LLC",
        dueDate: newDueDate,
        totalAmountCents: 55_000,
        balanceDueCents: 55_000,
        paidAmountCents: 0,
        status: "pending",
        isEditable: true,
      });
      expect(editRes.body.data.items).toHaveLength(2);
    });

    it("T1-EDIT-02: updates quantities and prices on existing items recalculating total authoritatively", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Price Mod Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Widget", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const editRes = await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Price Mod Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Widget", quantity: 4, unitPriceCents: 8_000 }],
        })
        .expect(200);

      expect(editRes.body.data.totalAmountCents).toBe(32_000);
      expect(editRes.body.data.balanceDueCents).toBe(32_000);
    });

    it("T1-EDIT-03: assigns consecutive positions and valid subdocument ObjectIds to replacement items", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Position Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Single Item", quantity: 1, unitPriceCents: 5_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const editRes = await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Position Corp",
          dueDate: dateOffset(7),
          items: [
            { description: "Pos 0", quantity: 1, unitPriceCents: 1_000 },
            { description: "Pos 1", quantity: 2, unitPriceCents: 2_000 },
            { description: "Pos 2", quantity: 3, unitPriceCents: 3_000 },
          ],
        })
        .expect(200);

      expect(editRes.body.data.items).toHaveLength(3);
      expect(editRes.body.data.items[0].position).toBe(0);
      expect(editRes.body.data.items[1].position).toBe(1);
      expect(editRes.body.data.items[2].position).toBe(2);
      expect(editRes.body.data.items[0].id).toMatch(/^[0-9a-f]{24}$/);
    });

    it("T1-EDIT-04: updates customer name and refreshes search index matching", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Beta Logistics",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Edit name to Alpha Services
      await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Alpha Services",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(200);

      // Search for "alpha" -> matches
      const searchAlpha = await request(app)
        .get("/v1/orders?search=alpha")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);
      expect(searchAlpha.body.data.map((o: { id: string }) => o.id)).toContain(orderId);

      // Search for "beta" -> does not match
      const searchBeta = await request(app)
        .get("/v1/orders?search=beta")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);
      expect(searchBeta.body.data.map((o: { id: string }) => o.id)).not.toContain(orderId);
    });

    it("T1-EDIT-05: rejects partial sparse updates missing required schema fields", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Sparse Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const res = await request(app)
        .patch(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Only Customer Name", // Missing items and dueDate
        })
        .expect(422);

      expect(res.body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // FEATURE 4: ORDER DELETION & UNPAID GUARD (>= 5 Tests)
  // =========================================================================
  describe("Feature 4: Order Deletion & Unpaid Guard", () => {
    it("T1-DEL-01: deletes an unpaid order successfully returning 204 No Content", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "To Delete Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Temp Item", quantity: 1, unitPriceCents: 15_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(204);
    });

    it("T1-DEL-02: returns 404 ORDER_NOT_FOUND when requesting a deleted order", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Post-Delete Verify",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 20_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(204);

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(404);

      expect(detail.body.error.code).toBe("ORDER_NOT_FOUND");
    });

    it("T1-DEL-03: removes deleted order from dashboard list query immediately", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "List Removal Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 10_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // List before delete
      const listBefore = await request(app)
        .get("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);
      expect(listBefore.body.data.some((o: { id: string }) => o.id === orderId)).toBe(true);

      // Delete
      await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(204);

      // List after delete
      const listAfter = await request(app)
        .get("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);
      expect(listAfter.body.data.some((o: { id: string }) => o.id === orderId)).toBe(false);
    });

    it("T1-DEL-04: recalculates portfolio summary upon unpaid order deletion", async () => {
      // Create Order 1 ($300) and Order 2 ($500)
      const ord1 = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Summary Order 1",
          dueDate: dateOffset(7),
          items: [{ description: "Item 1", quantity: 1, unitPriceCents: 30_000 }],
        })
        .expect(201);

      await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Summary Order 2",
          dueDate: dateOffset(7),
          items: [{ description: "Item 2", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const summaryBefore = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);
      expect(summaryBefore.body.data.totalOrders).toBe(2);
      expect(summaryBefore.body.data.outstandingAmountCents).toBe(80_000);

      // Delete Order 1
      await request(app)
        .delete(`/v1/orders/${ord1.body.data.id}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(204);

      const summaryAfter = await request(app)
        .get("/v1/orders/summary")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);
      expect(summaryAfter.body.data.totalOrders).toBe(1);
      expect(summaryAfter.body.data.outstandingAmountCents).toBe(50_000);
    });

    it("T1-DEL-05: drops document and embedded line items atomically without leftovers", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Clean DB Corp",
          dueDate: dateOffset(7),
          items: [
            { description: "Line A", quantity: 1, unitPriceCents: 10_000 },
            { description: "Line B", quantity: 2, unitPriceCents: 15_000 },
          ],
        })
        .expect(201);

      const orderId = created.body.data.id;

      await request(app)
        .delete(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(204);

      const doc = await getCollections(database).orders.findOne({
        _id: new ObjectId(orderId),
      });
      expect(doc).toBeNull();
    });
  });

  // =========================================================================
  // FEATURE 5: PAYMENT RECORDING & SETTLEMENT (>= 5 Tests)
  // =========================================================================
  describe("Feature 5: Payment Recording & Settlement", () => {
    it("T1-PAY-01: records valid partial payment updating balance and locking edit/delete", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Partial Pay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 100_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const payRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({
          amountCents: 40_000,
          paymentDate: todayUtc(),
          note: "First installment",
        })
        .expect(201);

      expect(payRes.body.data.payment).toMatchObject({
        amountCents: 40_000,
        paymentDate: todayUtc(),
        note: "First installment",
      });
      expect(payRes.body.data.order).toMatchObject({
        id: orderId,
        status: "partially_paid",
        totalAmountCents: 100_000,
        paidAmountCents: 40_000,
        balanceDueCents: 60_000,
      });

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.isEditable).toBe(false);
      expect(detail.body.data.isDeletable).toBe(false);
      expect(detail.body.data.payments).toHaveLength(1);
    });

    it("T1-PAY-02: settles remaining balance in full transitioning status to paid", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Settlement Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Service", quantity: 1, unitPriceCents: 100_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // First partial payment $400
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 40_000, paymentDate: todayUtc() })
        .expect(201);

      // Final payment $600
      const finalPay = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 60_000, paymentDate: todayUtc(), note: "Final settlement" })
        .expect(201);

      expect(finalPay.body.data.order).toMatchObject({
        id: orderId,
        status: "paid",
        totalAmountCents: 100_000,
        paidAmountCents: 100_000,
        balanceDueCents: 0,
      });

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.payments).toHaveLength(2);
      expect(detail.body.data.status).toBe("paid");
    });

    it("T1-PAY-03: settles fresh order in single full payment transaction", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Single Pay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Full Project", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const payRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 50_000, paymentDate: todayUtc() })
        .expect(201);

      expect(payRes.body.data.order.status).toBe("paid");
      expect(payRes.body.data.order.balanceDueCents).toBe(0);

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.payments).toHaveLength(1);
    });

    it("T1-PAY-04: normalizes payment note whitespace and handles null notes", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Note Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // Payment with messy note whitespace
      const pay1 = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({
          amountCents: 10_000,
          paymentDate: todayUtc(),
          note: "   ACH    Transfer    #12345   ",
        })
        .expect(201);

      expect(pay1.body.data.payment.note).toBe("ACH Transfer #12345");

      // Payment without note
      const pay2 = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({
          amountCents: 10_000,
          paymentDate: todayUtc(),
        })
        .expect(201);

      expect(pay2.body.data.payment.note).toBeNull();
    });

    it("T1-PAY-05: returns reverse chronological payments in detail view", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Ledger Ordering Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Project", quantity: 1, unitPriceCents: 30_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      // 3 sequential payments
      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 5_000, paymentDate: dateOffset(-2), note: "Payment 1" })
        .expect(201);

      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 10_000, paymentDate: dateOffset(-1), note: "Payment 2" })
        .expect(201);

      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 15_000, paymentDate: todayUtc(), note: "Payment 3" })
        .expect(201);

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.payments).toHaveLength(3);
      // Newest first in API detail view
      expect(detail.body.data.payments[0].note).toBe("Payment 3");
      expect(detail.body.data.payments[1].note).toBe("Payment 2");
      expect(detail.body.data.payments[2].note).toBe("Payment 1");
    });
  });

  // =========================================================================
  // FEATURE 6: IDEMPOTENCY REPLAY & FINGERPRINT SAFETY (>= 5 Tests)
  // =========================================================================
  describe("Feature 6: Idempotency Replay & Safety", () => {
    it("T1-IDEMP-01: records initial payment with fresh UUID idempotency key", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Idemp Initial Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();

      const res = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 20_000, paymentDate: todayUtc(), note: "Check 1" })
        .expect(201);

      expect(res.body.data.payment.amountCents).toBe(20_000);
      expect(res.headers["idempotency-replayed"]).toBeUndefined();
    });

    it("T1-IDEMP-02: returns 200 OK and Idempotency-Replayed header on exact replay", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Idemp Replay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();
      const payload = { amountCents: 25_000, paymentDate: todayUtc(), note: "Wire 1" };

      const firstRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send(payload)
        .expect(201);

      const replayRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send(payload)
        .expect(200);

      expect(replayRes.headers["idempotency-replayed"]).toBe("true");
      expect(replayRes.body.data.payment.id).toBe(firstRes.body.data.payment.id);
      expect(replayRes.body.data.order.balanceDueCents).toBe(25_000);

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.payments).toHaveLength(1);
    });

    it("T1-IDEMP-03: recognizes case-insensitive UUID idempotency keys seamlessly", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Case UUID Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const rawUuid = randomUUID();
      const upperUuid = rawUuid.toUpperCase();
      const lowerUuid = rawUuid.toLowerCase();

      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", upperUuid)
        .send({ amountCents: 10_000, paymentDate: todayUtc() })
        .expect(201);

      const replayRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", lowerUuid)
        .send({ amountCents: 10_000, paymentDate: todayUtc() })
        .expect(200);

      expect(replayRes.headers["idempotency-replayed"]).toBe("true");
    });

    it("T1-IDEMP-04: treats non-semantic note whitespace as identical fingerprint for replay", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Whitespace Fingerprint Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();

      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 15_000, paymentDate: todayUtc(), note: "Wire transfer" })
        .expect(201);

      const replayRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send({ amountCents: 15_000, paymentDate: todayUtc(), note: "   Wire    transfer   " })
        .expect(200);

      expect(replayRes.headers["idempotency-replayed"]).toBe("true");
    });

    it("T1-IDEMP-05: allows multiple consecutive replays maintaining single payment count", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Multi Replay Corp",
          dueDate: dateOffset(7),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;
      const idempotencyKey = randomUUID();
      const payload = { amountCents: 20_000, paymentDate: todayUtc(), note: "Multi Replay" };

      await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", idempotencyKey)
        .send(payload)
        .expect(201);

      for (let i = 0; i < 5; i++) {
        const replay = await request(app)
          .post(`/v1/orders/${orderId}/payments`)
          .set("Origin", appOrigin)
          .set("Cookie", userCookie)
          .set("Idempotency-Key", idempotencyKey)
          .send(payload)
          .expect(200);

        expect(replay.headers["idempotency-replayed"]).toBe("true");
        expect(replay.body.data.order.balanceDueCents).toBe(30_000);
      }

      const detail = await request(app)
        .get(`/v1/orders/${orderId}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.payments).toHaveLength(1);
    });
  });

  // =========================================================================
  // FEATURE 7: DERIVED STATUS PROGRESSION (>= 5 Tests)
  // =========================================================================
  describe("Feature 7: Derived Status Progression", () => {
    it("T1-STAT-01: derives pending for fresh unpaid future order", async () => {
      const res = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Pending Status Corp",
          dueDate: dateOffset(10),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 20_000 }],
        })
        .expect(201);

      expect(res.body.data.status).toBe("pending");
    });

    it("T1-STAT-02: derives partially_paid for partially settled future order", async () => {
      const created = await request(app)
        .post("/v1/orders")
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .send({
          customerName: "Partial Status Corp",
          dueDate: dateOffset(10),
          items: [{ description: "Item", quantity: 1, unitPriceCents: 50_000 }],
        })
        .expect(201);

      const orderId = created.body.data.id;

      const payRes = await request(app)
        .post(`/v1/orders/${orderId}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 20_000, paymentDate: todayUtc() })
        .expect(201);

      expect(payRes.body.data.order.status).toBe("partially_paid");
    });

    it("T1-STAT-03: derives paid for zero balance order regardless of past due date", async () => {
      // Directly insert historical order with past due date in database
      const now = new Date();
      const pastDueDate = dateOffset(-30);
      const orderDoc = {
        _id: new ObjectId(),
        userId,
        customerName: "Paid Past Due Corp",
        customerNameNormalized: "paid past due corp",
        dueDate: pastDueDate,
        lineItems: [
          {
            _id: new ObjectId(),
            position: 0,
            description: "Old Service",
            quantity: 1,
            unitPriceCents: 50_000,
          },
        ],
        totalAmountCents: 50_000,
        balanceDueCents: 50_000,
        paymentCount: 0,
        payments: [],
        createdAt: now,
        updatedAt: now,
      };

      await getCollections(database).orders.insertOne(orderDoc);

      // Pay the full amount
      const payRes = await request(app)
        .post(`/v1/orders/${orderDoc._id.toHexString()}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 50_000, paymentDate: todayUtc() })
        .expect(201);

      expect(payRes.body.data.order.status).toBe("paid");
      expect(payRes.body.data.order.balanceDueCents).toBe(0);
    });

    it("T1-STAT-04: derives overdue for unpaid past due date order", async () => {
      const now = new Date();
      const pastDueDate = dateOffset(-5);
      const orderDoc = {
        _id: new ObjectId(),
        userId,
        customerName: "Overdue Unpaid Corp",
        customerNameNormalized: "overdue unpaid corp",
        dueDate: pastDueDate,
        lineItems: [
          {
            _id: new ObjectId(),
            position: 0,
            description: "Past Due Item",
            quantity: 1,
            unitPriceCents: 30_000,
          },
        ],
        totalAmountCents: 30_000,
        balanceDueCents: 30_000,
        paymentCount: 0,
        payments: [],
        createdAt: now,
        updatedAt: now,
      };

      await getCollections(database).orders.insertOne(orderDoc);

      const detail = await request(app)
        .get(`/v1/orders/${orderDoc._id.toHexString()}`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .expect(200);

      expect(detail.body.data.status).toBe("overdue");
    });

    it("T1-STAT-05: derives overdue when partially paid order is past due date", async () => {
      const now = new Date();
      const pastDueDate = dateOffset(-10);
      const orderDoc = {
        _id: new ObjectId(),
        userId,
        customerName: "Overdue Partial Corp",
        customerNameNormalized: "overdue partial corp",
        dueDate: pastDueDate,
        lineItems: [
          {
            _id: new ObjectId(),
            position: 0,
            description: "Past Due Item",
            quantity: 1,
            unitPriceCents: 50_000,
          },
        ],
        totalAmountCents: 50_000,
        balanceDueCents: 50_000,
        paymentCount: 0,
        payments: [],
        createdAt: now,
        updatedAt: now,
      };

      await getCollections(database).orders.insertOne(orderDoc);

      // Make partial payment of $200 on $500 total
      const payRes = await request(app)
        .post(`/v1/orders/${orderDoc._id.toHexString()}/payments`)
        .set("Origin", appOrigin)
        .set("Cookie", userCookie)
        .set("Idempotency-Key", randomUUID())
        .send({ amountCents: 20_000, paymentDate: todayUtc() })
        .expect(201);

      // Status must be overdue because balanceDueCents > 0 and dueDate < todayUtc
      expect(payRes.body.data.order.status).toBe("overdue");
      expect(payRes.body.data.order.balanceDueCents).toBe(30_000);
      expect(payRes.body.data.order.paidAmountCents).toBe(20_000);
    });
  });
});
