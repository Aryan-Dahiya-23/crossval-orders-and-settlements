import { randomUUID } from "node:crypto";

import request from "supertest";
import { MongoClient, ObjectId } from "mongodb";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";
import { readEnvironment } from "../../src/config/environment.js";
import { loadRepositoryEnvironmentFile } from "../../src/config/load-environment-file.js";
import { getCollections } from "../../src/db/collections.js";
import type { OrderDocument } from "../../src/db/documents.js";
import { runMigrations } from "../../src/db/migrations/index.js";
import { getUtcDateOnly } from "../../src/modules/orders/domain.js";

loadRepositoryEnvironmentFile();

const mongoUri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
if (mongoUri === undefined) {
  throw new Error(
    "Order integration tests require MONGODB_TEST_URI or MONGODB_URI.",
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

const orderInput = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  customerName: "Acme Corporation",
  dueDate: dateOffset(7),
  items: [
    {
      description: "Implementation service",
      quantity: 2,
      unitPriceCents: 50_000,
    },
  ],
  ...overrides,
});

describe("order API", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-order-integration-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  const environment = readEnvironment({
    NODE_ENV: "test",
    MONGODB_URI: mongoUri,
    MONGODB_DATABASE: databaseName,
    APP_ORIGIN: appOrigin,
    SESSION_COOKIE_NAME: "crossval_order_test_session",
    SESSION_TTL_SECONDS: "3600",
    REGISTRATION_ENABLED: "true",
  });
  const app = createApp({ database, environment });
  let connected = false;
  let userACookie = "";
  let userAId = new ObjectId();
  let userBId = new ObjectId();

  const createOrder = (cookie: string, input = orderInput()) =>
    request(app)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .set("Cookie", cookie)
      .send(input);

  const insertOrder = async (
    userId: ObjectId,
    options: {
      customerName?: string;
      dueDate?: string;
      totalAmountCents?: number;
      balanceDueCents?: number;
      withPayment?: boolean;
      createdAt?: Date;
    } = {},
  ): Promise<OrderDocument> => {
    const timestamp = options.createdAt ?? new Date();
    const totalAmountCents = options.totalAmountCents ?? 10_000;
    const balanceDueCents = options.balanceDueCents ?? totalAmountCents;
    const paidAmountCents = totalAmountCents - balanceDueCents;
    const withPayment = options.withPayment ?? paidAmountCents > 0;
    const customerName = options.customerName ?? "Fixture customer";
    const order: OrderDocument = {
      _id: new ObjectId(),
      userId,
      customerName,
      customerNameNormalized: customerName.toLowerCase(),
      dueDate: options.dueDate ?? dateOffset(7),
      lineItems: [
        {
          _id: new ObjectId(),
          description: "Fixture line",
          quantity: 1,
          unitPriceCents: totalAmountCents,
          position: 0,
        },
      ],
      totalAmountCents,
      balanceDueCents,
      paymentCount: withPayment ? 1 : 0,
      payments: withPayment
        ? [
            {
              _id: new ObjectId(),
              amountCents: paidAmountCents,
              paymentDate: todayUtc(),
              note: null,
              idempotencyKey: randomUUID(),
              requestFingerprint: "a".repeat(64),
              createdAt: timestamp,
            },
          ]
        : [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getCollections(database).orders.insertOne(order);
    return order;
  };

  beforeAll(async () => {
    await client.connect();
    connected = true;
    await runMigrations(database);

    const userA = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "orders-a@example.com", password: validPassword })
      .expect(201);
    const userB = await request(app)
      .post("/v1/auth/signup")
      .set("Origin", appOrigin)
      .send({ email: "orders-b@example.com", password: validPassword })
      .expect(201);
    userACookie = cookieFrom(userA);
    userAId = new ObjectId(userA.body.data.id);
    userBId = new ObjectId(userB.body.data.id);
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

  it("requires authentication for every order surface", async () => {
    const orderId = new ObjectId().toHexString();
    await request(app).get("/v1/orders").expect(401);
    await request(app).get("/v1/orders/summary").expect(401);
    await request(app).get(`/v1/orders/${orderId}`).expect(401);
    await request(app)
      .post("/v1/orders")
      .set("Origin", appOrigin)
      .send(orderInput())
      .expect(401);
    await request(app)
      .patch(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .send(orderInput())
      .expect(401);
    await request(app)
      .delete(`/v1/orders/${orderId}`)
      .set("Origin", appOrigin)
      .expect(401);
  });

  it("creates server-authored totals and rejects client financial fields", async () => {
    const created = await createOrder(userACookie, {
      ...orderInput({ customerName: "  Acme   Corporation " }),
      totalAmountCents: 1,
      userId: new ObjectId().toHexString(),
    }).expect(422);
    expect(created.body.error.code).toBe("VALIDATION_FAILED");

    const response = await createOrder(userACookie, orderInput()).expect(201);
    expect(response.body.data).toMatchObject({
      customerName: "Acme Corporation",
      totalAmountCents: 100_000,
      paidAmountCents: 0,
      balanceDueCents: 100_000,
      status: "pending",
      isEditable: true,
      isDeletable: true,
    });
    expect(response.body.data.items).toEqual([
      expect.objectContaining({
        quantity: 2,
        unitPriceCents: 50_000,
        lineTotalCents: 100_000,
        position: 0,
      }),
    ]);
    expect(response.body.data.items[0].id).toMatch(/^[0-9a-f]{24}$/);

    const stored = await getCollections(database).orders.findOne({
      _id: new ObjectId(response.body.data.id),
      userId: userAId,
    });
    expect(stored).toMatchObject({
      totalAmountCents: 100_000,
      balanceDueCents: 100_000,
      paymentCount: 0,
      payments: [],
    });
  });

  it("returns owned detail while hiding missing and foreign orders", async () => {
    const ownOrder = await insertOrder(userAId, {
      dueDate: dateOffset(-1),
      totalAmountCents: 10_000,
      balanceDueCents: 0,
      withPayment: true,
    });
    const foreignOrder = await insertOrder(userBId);

    const detail = await request(app)
      .get(`/v1/orders/${ownOrder._id.toHexString()}`)
      .set("Cookie", userACookie)
      .expect(200);
    expect(detail.body.data).toMatchObject({
      id: ownOrder._id.toHexString(),
      status: "paid",
      paidAmountCents: 10_000,
      isEditable: false,
      isDeletable: false,
    });
    expect(detail.body.data.payments).toHaveLength(1);

    const [foreign, missing] = await Promise.all([
      request(app)
        .get(`/v1/orders/${foreignOrder._id.toHexString()}`)
        .set("Cookie", userACookie),
      request(app)
        .get(`/v1/orders/${new ObjectId().toHexString()}`)
        .set("Cookie", userACookie),
    ]);
    expect(foreign.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(foreign.body.error.code).toBe("ORDER_NOT_FOUND");
    expect(missing.body.error.code).toBe("ORDER_NOT_FOUND");

    const malformed = await request(app)
      .get("/v1/orders/not-an-id")
      .set("Cookie", userACookie)
      .expect(400);
    expect(malformed.body.error.code).toBe("INVALID_RESOURCE_ID");
  });

  it("lists owned orders with status filters, prefix search, stable pagination, and projections", async () => {
    const createdAt = new Date("2026-08-14T12:00:00.000Z");
    await insertOrder(userAId, {
      customerName: "Acme Alpha",
      dueDate: dateOffset(2),
      createdAt,
    });
    await insertOrder(userAId, {
      customerName: "Acme Beta",
      dueDate: dateOffset(2),
      createdAt,
    });
    await insertOrder(userAId, {
      customerName: "Past Due",
      dueDate: dateOffset(-1),
    });
    await insertOrder(userAId, {
      customerName: "Settled",
      dueDate: dateOffset(-1),
      balanceDueCents: 0,
      withPayment: true,
    });
    await insertOrder(userAId, {
      customerName: "Partial settlement",
      dueDate: dateOffset(2),
      balanceDueCents: 5_000,
      withPayment: true,
    });
    await insertOrder(userBId, { customerName: "Acme Hidden" });

    const searched = await request(app)
      .get(
        "/v1/orders?search=acme&sort=createdAt&direction=desc&page=1&pageSize=10",
      )
      .set("Cookie", userACookie)
      .expect(200);
    expect(searched.body.meta).toMatchObject({
      page: 1,
      pageSize: 10,
      totalItems: 2,
      totalPages: 1,
    });
    expect(
      searched.body.data.map(
        (order: { customerName: string }) => order.customerName,
      ),
    ).toEqual(["Acme Beta", "Acme Alpha"]);
    expect(searched.body.data[0]).not.toHaveProperty("items");
    expect(searched.body.data[0]).not.toHaveProperty("payments");

    const [pending, partial, overdue, paid, outOfRange] = await Promise.all([
      request(app).get("/v1/orders?status=pending").set("Cookie", userACookie),
      request(app)
        .get("/v1/orders?status=partially_paid")
        .set("Cookie", userACookie),
      request(app).get("/v1/orders?status=overdue").set("Cookie", userACookie),
      request(app).get("/v1/orders?status=paid").set("Cookie", userACookie),
      request(app)
        .get("/v1/orders?page=2&pageSize=50")
        .set("Cookie", userACookie),
    ]);
    expect(
      pending.body.data.map(
        (order: { customerName: string }) => order.customerName,
      ),
    ).toEqual(["Acme Beta", "Acme Alpha"]);
    expect(
      partial.body.data.map(
        (order: { customerName: string }) => order.customerName,
      ),
    ).toEqual(["Partial settlement"]);
    expect(
      overdue.body.data.map(
        (order: { customerName: string }) => order.customerName,
      ),
    ).toEqual(["Past Due"]);
    expect(
      paid.body.data.map(
        (order: { customerName: string }) => order.customerName,
      ),
    ).toEqual(["Settled"]);
    expect(outOfRange.body).toMatchObject({
      data: [],
      meta: { page: 2, pageSize: 50, totalItems: 5, totalPages: 1 },
    });

    const invalidQuery = await request(app)
      .get("/v1/orders?sort=userId")
      .set("Cookie", userACookie)
      .expect(422);
    expect(invalidQuery.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("calculates account summary values without crossing ownership", async () => {
    const emptySummary = await request(app)
      .get("/v1/orders/summary")
      .set("Cookie", userACookie)
      .expect(200);
    expect(emptySummary.body.data).toEqual({
      totalOrders: 0,
      outstandingAmountCents: 0,
      collectedAmountCents: 0,
      overdueAmountCents: 0,
    });

    await insertOrder(userAId, {
      totalAmountCents: 10_000,
      balanceDueCents: 10_000,
      dueDate: dateOffset(-1),
    });
    await insertOrder(userAId, {
      totalAmountCents: 20_000,
      balanceDueCents: 5_000,
      dueDate: dateOffset(1),
      withPayment: true,
    });
    await insertOrder(userAId, {
      totalAmountCents: 30_000,
      balanceDueCents: 0,
      dueDate: dateOffset(-1),
      withPayment: true,
    });
    await insertOrder(userBId, {
      totalAmountCents: 1_000_000,
      balanceDueCents: 1_000_000,
      dueDate: dateOffset(-1),
    });

    const response = await request(app)
      .get("/v1/orders/summary")
      .set("Cookie", userACookie)
      .expect(200);
    expect(response.body).toMatchObject({
      data: {
        totalOrders: 3,
        outstandingAmountCents: 15_000,
        collectedAmountCents: 45_000,
        overdueAmountCents: 10_000,
      },
      meta: { asOfDate: todayUtc() },
    });
  });

  it("replaces and deletes unpaid owned orders through conditional writes", async () => {
    const created = await createOrder(userACookie).expect(201);
    const id = created.body.data.id as string;

    await request(app)
      .patch(`/v1/orders/${id}`)
      .set("Origin", appOrigin)
      .set("Cookie", userACookie)
      .send({ customerName: "Incomplete replacement" })
      .expect(422);

    const replaced = await request(app)
      .patch(`/v1/orders/${id}`)
      .set("Origin", appOrigin)
      .set("Cookie", userACookie)
      .send(
        orderInput({
          customerName: "Replacement customer",
          items: [
            {
              description: "Replacement line",
              quantity: 3,
              unitPriceCents: 12_345,
            },
          ],
        }),
      )
      .expect(200);
    expect(replaced.body.data).toMatchObject({
      customerName: "Replacement customer",
      totalAmountCents: 37_035,
      balanceDueCents: 37_035,
      paidAmountCents: 0,
    });

    await request(app)
      .delete(`/v1/orders/${id}`)
      .set("Origin", appOrigin)
      .set("Cookie", userACookie)
      .expect(204);
    await request(app)
      .get(`/v1/orders/${id}`)
      .set("Cookie", userACookie)
      .expect(404);
  });

  it("locks paid orders and does not reveal foreign mutation targets", async () => {
    const locked = await insertOrder(userAId, {
      totalAmountCents: 10_000,
      balanceDueCents: 4_000,
      withPayment: true,
    });
    const foreign = await insertOrder(userBId);

    const [lockedEdit, lockedDelete, foreignEdit, foreignDelete] =
      await Promise.all([
        request(app)
          .patch(`/v1/orders/${locked._id.toHexString()}`)
          .set("Origin", appOrigin)
          .set("Cookie", userACookie)
          .send(orderInput()),
        request(app)
          .delete(`/v1/orders/${locked._id.toHexString()}`)
          .set("Origin", appOrigin)
          .set("Cookie", userACookie),
        request(app)
          .patch(`/v1/orders/${foreign._id.toHexString()}`)
          .set("Origin", appOrigin)
          .set("Cookie", userACookie)
          .send(orderInput()),
        request(app)
          .delete(`/v1/orders/${foreign._id.toHexString()}`)
          .set("Origin", appOrigin)
          .set("Cookie", userACookie),
      ]);

    expect(lockedEdit.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
    expect(lockedDelete.body.error.code).toBe("ORDER_LOCKED_AFTER_PAYMENT");
    expect(lockedEdit.status).toBe(409);
    expect(lockedDelete.status).toBe(409);
    expect(foreignEdit.status).toBe(404);
    expect(foreignDelete.status).toBe(404);

    const preserved = await getCollections(database).orders.findOne({
      _id: locked._id,
      userId: userAId,
    });
    expect(preserved).toMatchObject({
      totalAmountCents: 10_000,
      balanceDueCents: 4_000,
      paymentCount: 1,
    });
  });
});
