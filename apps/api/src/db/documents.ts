import type { ObjectId } from "mongodb";

export interface UserDocument {
  _id: ObjectId;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface LineItemDocument {
  _id: ObjectId;
  description: string;
  quantity: number;
  unitPriceCents: number;
  position: number;
}

export interface PaymentDocument {
  _id: ObjectId;
  amountCents: number;
  paymentDate: string;
  note: string | null;
  idempotencyKey: string;
  requestFingerprint: string;
  createdAt: Date;
}

export interface OrderDocument {
  _id: ObjectId;
  userId: ObjectId;
  customerName: string;
  customerNameNormalized: string;
  dueDate: string;
  lineItems: LineItemDocument[];
  totalAmountCents: number;
  balanceDueCents: number;
  paymentCount: number;
  payments: PaymentDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaMigrationDocument {
  _id: string;
  description: string;
  appliedAt: Date;
}
