import { randomUUID } from "node:crypto";

import { MongoClient, MongoServerError, ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadRepositoryEnvironmentFile } from "../../src/config/load-environment-file.js";
import { getCollections } from "../../src/db/collections.js";
import type { OrderDocument } from "../../src/db/documents.js";
import { runMigrations } from "../../src/db/migrations/index.js";

loadRepositoryEnvironmentFile();

const mongoUri = process.env.MONGODB_TEST_URI ?? process.env.MONGODB_URI;
if (mongoUri === undefined) {
  throw new Error(
    "Database integration tests require MONGODB_TEST_URI or MONGODB_URI.",
  );
}
const databaseName = `crossval_${randomUUID().replaceAll("-", "").slice(0, 12)}_test`;

describe("MongoDB foundation", () => {
  const client = new MongoClient(mongoUri, {
    appName: "crossval-orders-settlements-integration-tests",
    serverSelectionTimeoutMS: 15_000,
  });
  const database = client.db(databaseName);
  let connected = false;

  beforeAll(async () => {
    await client.connect();
    connected = true;
  }, 20_000);

  afterAll(async () => {
    if (connected) {
      await database.dropDatabase();
    }
    await client.close();
  });

  it("applies migrations idempotently", async () => {
    const first = await runMigrations(database);
    const second = await runMigrations(database);

    expect(first.applied).toEqual([
      "001_create_collections",
      "002_create_indexes",
      "003_add_order_sort_tiebreaker",
    ]);
    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual([
      "001_create_collections",
      "002_create_indexes",
      "003_add_order_sort_tiebreaker",
    ]);
  });

  it("installs named unique, TTL, ownership, and list indexes", async () => {
    const { users, sessions, orders } = getCollections(database);
    const [userIndexes, sessionIndexes, orderIndexes] = await Promise.all([
      users.listIndexes().toArray(),
      sessions.listIndexes().toArray(),
      orders.listIndexes().toArray(),
    ]);

    expect(userIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "users_email_unique", unique: true }),
      ]),
    );
    expect(sessionIndexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "sessions_token_hash_unique",
          unique: true,
        }),
        expect.objectContaining({
          name: "sessions_expires_at_ttl",
          expireAfterSeconds: 0,
        }),
        expect.objectContaining({ name: "sessions_user_id" }),
      ]),
    );
    expect(orderIndexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        "orders_user_created_at",
        "orders_user_due_balance",
        "orders_user_payment_count_due_balance",
        "orders_user_customer_created_at",
      ]),
    );
  });

  it("rejects documents that violate money and ledger invariants", async () => {
    const { orders } = getCollections(database);
    const timestamp = new Date();

    const validOrder: OrderDocument = {
      _id: new ObjectId(),
      userId: new ObjectId(),
      customerName: "Validation fixture",
      customerNameNormalized: "validation fixture",
      dueDate: "2026-08-14",
      lineItems: [
        {
          _id: new ObjectId(),
          description: "Validation line",
          quantity: 1,
          unitPriceCents: 10_000,
          position: 0,
        },
      ],
      totalAmountCents: 10_000,
      balanceDueCents: 10_000,
      paymentCount: 0,
      payments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const invalidOrders: OrderDocument[] = [
      { ...validOrder, _id: new ObjectId(), dueDate: "08/14/2026" },
      { ...validOrder, _id: new ObjectId(), lineItems: [] },
      {
        ...validOrder,
        _id: new ObjectId(),
        totalAmountCents: 10_000.5,
        balanceDueCents: 10_000.5,
      },
      { ...validOrder, _id: new ObjectId(), balanceDueCents: 11_000 },
      { ...validOrder, _id: new ObjectId(), paymentCount: 1 },
      { ...validOrder, _id: new ObjectId(), balanceDueCents: 9_000 },
    ];

    for (const invalidOrder of invalidOrders) {
      try {
        await orders.insertOne(invalidOrder);
        expect.unreachable("MongoDB should reject the invalid order.");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(MongoServerError);
        expect((error as MongoServerError).code).toBe(121);
      }
    }
  });

  it("enforces the normalized-email unique index", async () => {
    const { users } = getCollections(database);
    const timestamp = new Date();
    const email = "unique-index@example.com";

    await users.insertOne({
      _id: new ObjectId(),
      email,
      passwordHash: "a-valid-placeholder-password-hash",
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    try {
      await users.insertOne({
        _id: new ObjectId(),
        email,
        passwordHash: "another-valid-placeholder-hash",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      expect.unreachable("MongoDB should reject a duplicate email.");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(MongoServerError);
      expect((error as MongoServerError).code).toBe(11_000);
    }
  });

  it("uses the owned newest-orders index for the representative list query", async () => {
    const { orders } = getCollections(database);
    const userId = new ObjectId();
    const timestamp = new Date();

    await orders.insertOne({
      _id: new ObjectId(),
      userId,
      customerName: "Indexed customer",
      customerNameNormalized: "indexed customer",
      dueDate: "2026-08-21",
      lineItems: [
        {
          _id: new ObjectId(),
          description: "Indexed line",
          quantity: 1,
          unitPriceCents: 10_000,
          position: 0,
        },
      ],
      totalAmountCents: 10_000,
      balanceDueCents: 10_000,
      paymentCount: 0,
      payments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const [newestExplanation, overdueExplanation, pendingExplanation] =
      await Promise.all([
        orders
          .find({ userId })
          .sort({ createdAt: -1, _id: -1 })
          .explain("executionStats"),
        orders
          .find({
            userId,
            dueDate: { $lt: "2026-08-22" },
            balanceDueCents: { $gt: 0 },
          })
          .sort({ dueDate: 1 })
          .explain("executionStats"),
        orders
          .find({
            userId,
            paymentCount: 0,
            dueDate: { $gte: "2026-08-14" },
            balanceDueCents: { $gt: 0 },
          })
          .sort({ dueDate: 1 })
          .explain("executionStats"),
      ]);

    const newestPlanner = JSON.stringify(newestExplanation.queryPlanner);
    expect(newestPlanner).toContain("orders_user_created_at");
    expect(
      JSON.stringify(newestExplanation.queryPlanner.winningPlan),
    ).not.toContain('"stage":"SORT"');
    expect(JSON.stringify(overdueExplanation.queryPlanner)).toContain(
      "orders_user_due_balance",
    );
    expect(JSON.stringify(pendingExplanation.queryPlanner)).toContain(
      "orders_user_payment_count_due_balance",
    );
  });
});
