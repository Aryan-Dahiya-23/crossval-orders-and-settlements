import { ObjectId, type Db } from "mongodb";

import { getCollections } from "./collections.js";
import type {
  LineItemDocument,
  OrderDocument,
  PaymentDocument,
} from "./documents.js";
import { assertDisposableDatabase } from "./safety.js";

const seedEmail = "phase2-seed@crossval.invalid";
const disabledPasswordHash = "phase2-disabled-login-placeholder";

const dateOnlyFromOffset = (offsetDays: number): string => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const lineItem = (
  description: string,
  quantity: number,
  unitPriceCents: number,
  position = 0,
): LineItemDocument => ({
  _id: new ObjectId(),
  description,
  quantity,
  unitPriceCents,
  position,
});

const payment = (
  amountCents: number,
  paymentDate: string,
  idempotencyKey: string,
  fingerprintCharacter: string,
): PaymentDocument => ({
  _id: new ObjectId(),
  amountCents,
  paymentDate,
  note: "Development seed payment",
  idempotencyKey,
  requestFingerprint: fingerprintCharacter.repeat(64),
  createdAt: new Date(),
});

interface SeedOrderInput {
  customerName: string;
  dueDate: string;
  lineItems: LineItemDocument[];
  payments?: PaymentDocument[];
}

const seedOrder = (userId: ObjectId, input: SeedOrderInput): OrderDocument => {
  const payments = input.payments ?? [];
  const totalAmountCents = input.lineItems.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  );
  const paidAmountCents = payments.reduce(
    (total, item) => total + item.amountCents,
    0,
  );
  const timestamp = new Date();

  return {
    _id: new ObjectId(),
    userId,
    customerName: input.customerName,
    customerNameNormalized: input.customerName.toLowerCase(),
    dueDate: input.dueDate,
    lineItems: input.lineItems,
    totalAmountCents,
    balanceDueCents: totalAmountCents - paidAmountCents,
    paymentCount: payments.length,
    payments,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
};

export const seedDevelopmentData = async (database: Db): Promise<number> => {
  assertDisposableDatabase(database.databaseName);
  const { users, orders } = getCollections(database);
  const timestamp = new Date();

  await users.updateOne(
    { email: seedEmail },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        email: seedEmail,
        passwordHash: disabledPasswordHash,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    },
    { upsert: true },
  );

  const user = await users.findOne({ email: seedEmail });
  if (user === null) {
    throw new Error("Development seed user was not created.");
  }

  await orders.deleteMany({ userId: user._id });

  const today = dateOnlyFromOffset(0);
  const ordersToInsert: OrderDocument[] = [
    seedOrder(user._id, {
      customerName: "Northstar Trading",
      dueDate: dateOnlyFromOffset(7),
      lineItems: [lineItem("Implementation services", 5, 25_000)],
    }),
    seedOrder(user._id, {
      customerName: "Desert Bloom Retail",
      dueDate: dateOnlyFromOffset(7),
      lineItems: [lineItem("Monthly operations package", 3, 30_000)],
      payments: [
        payment(30_000, today, "10000000-0000-4000-8000-000000000001", "1"),
      ],
    }),
    seedOrder(user._id, {
      customerName: "Harborline Logistics",
      dueDate: dateOnlyFromOffset(-2),
      lineItems: [lineItem("Reconciliation engagement", 1, 75_000)],
      payments: [
        payment(
          75_000,
          dateOnlyFromOffset(-3),
          "20000000-0000-4000-8000-000000000002",
          "2",
        ),
      ],
    }),
    seedOrder(user._id, {
      customerName: "Cedar Works",
      dueDate: dateOnlyFromOffset(-7),
      lineItems: [lineItem("Finance dashboard setup", 2, 25_000)],
    }),
    seedOrder(user._id, {
      customerName: "Oasis Food Group",
      dueDate: dateOnlyFromOffset(-7),
      lineItems: [lineItem("Reporting support", 4, 30_000)],
      payments: [
        payment(
          50_000,
          dateOnlyFromOffset(-8),
          "30000000-0000-4000-8000-000000000003",
          "3",
        ),
      ],
    }),
    seedOrder(user._id, {
      customerName: "Assignment Sample",
      dueDate: dateOnlyFromOffset(14),
      lineItems: [lineItem("Assignment item", 2, 50_000)],
      payments: [
        payment(40_000, today, "40000000-0000-4000-8000-000000000004", "4"),
      ],
    }),
  ];

  await orders.insertMany(ordersToInsert);
  return ordersToInsert.length;
};
