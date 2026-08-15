import type {
  CreateOrderRequest,
  OrderDetail,
  OrderListQuery,
  OrderListResponse,
  OrderSummaryResponse,
  PopulateSampleResult,
  RecordPaymentRequest,
  RecordPaymentResult,
  ReplaceOrderRequest,
} from "@crossval/contracts";
import { MongoError, ObjectId, type Db } from "mongodb";

import { getCollections } from "../../db/collections.js";
import type {
  LineItemDocument,
  OrderDocument,
  PaymentDocument,
} from "../../db/documents.js";
import { AppError } from "../../errors/app-error.js";
import {
  getUtcDateOnly,
  prepareOrderDraft,
  preparePaymentDraft,
} from "./domain.js";
import {
  toOrderDetail,
  toOrderListItem,
  toRecordPaymentResult,
} from "./mapper.js";
import {
  buildOrderListFilter,
  buildOrderSort,
  orderListProjection,
} from "./query.js";
import { asOrderDomainValidationError } from "./validation.js";

interface SummaryAggregationResult {
  totalOrders: number;
  outstandingAmountCents: number;
  collectedAmountCents: number;
  overdueAmountCents: number;
}

export interface RecordPaymentServiceResult {
  data: RecordPaymentResult;
  replayed: boolean;
}

const maximumPaymentsPerOrder = 1_000;
const retryableMongoErrorNames = new Set([
  "MongoNetworkError",
  "MongoNetworkTimeoutError",
  "MongoOperationTimeoutError",
  "MongoServerSelectionError",
]);

export class OrderService {
  public constructor(
    private readonly database: Db,
    private readonly now: () => Date = () => new Date(),
  ) {}

  public async create(
    userId: ObjectId,
    input: CreateOrderRequest,
  ): Promise<OrderDetail> {
    const draft = this.prepareDraft(input);
    const timestamp = this.now();
    const order: OrderDocument = {
      _id: new ObjectId(),
      userId,
      customerName: draft.customerName,
      customerNameNormalized: draft.customerNameNormalized,
      dueDate: draft.dueDate,
      lineItems: draft.lineItems.map((item, position) => ({
        _id: new ObjectId(),
        description: item.description,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        position,
      })),
      totalAmountCents: draft.totalAmountCents,
      balanceDueCents: draft.totalAmountCents,
      paymentCount: 0,
      payments: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getCollections(this.database).orders.insertOne(order);
    return toOrderDetail(order, getUtcDateOnly(timestamp));
  }

  public async list(
    userId: ObjectId,
    query: OrderListQuery,
  ): Promise<OrderListResponse> {
    const todayUtc = getUtcDateOnly(this.now());
    const filter = buildOrderListFilter(userId, query, todayUtc);
    const orders = getCollections(this.database).orders;
    const skip = (query.page - 1) * query.pageSize;

    const [documents, totalItems] = await Promise.all([
      orders
        .find(filter, { projection: orderListProjection })
        .sort(buildOrderSort(query))
        .skip(skip)
        .limit(query.pageSize)
        .toArray(),
      orders.countDocuments(filter),
    ]);

    return {
      data: documents.map((order) => toOrderListItem(order, todayUtc)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages:
          totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
      },
    };
  }

  public async summary(userId: ObjectId): Promise<OrderSummaryResponse> {
    const todayUtc = getUtcDateOnly(this.now());
    const result = await getCollections(this.database)
      .orders.aggregate<SummaryAggregationResult>([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            outstandingAmountCents: { $sum: "$balanceDueCents" },
            collectedAmountCents: {
              $sum: { $subtract: ["$totalAmountCents", "$balanceDueCents"] },
            },
            overdueAmountCents: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$balanceDueCents", 0] },
                      { $lt: ["$dueDate", todayUtc] },
                    ],
                  },
                  "$balanceDueCents",
                  0,
                ],
              },
            },
          },
        },
      ])
      .next();

    return {
      data: {
        totalOrders: result?.totalOrders ?? 0,
        outstandingAmountCents: result?.outstandingAmountCents ?? 0,
        collectedAmountCents: result?.collectedAmountCents ?? 0,
        overdueAmountCents: result?.overdueAmountCents ?? 0,
      },
      meta: { asOfDate: todayUtc },
    };
  }

  public async detail(
    userId: ObjectId,
    orderId: ObjectId,
  ): Promise<OrderDetail> {
    const order = await getCollections(this.database).orders.findOne({
      _id: orderId,
      userId,
    });
    if (order === null) {
      throw this.orderNotFound();
    }

    return toOrderDetail(order, getUtcDateOnly(this.now()));
  }

  public async replace(
    userId: ObjectId,
    orderId: ObjectId,
    input: ReplaceOrderRequest,
  ): Promise<OrderDetail> {
    const draft = this.prepareDraft(input);
    const timestamp = this.now();
    const result = await getCollections(this.database).orders.findOneAndUpdate(
      { _id: orderId, userId, paymentCount: 0 },
      {
        $set: {
          customerName: draft.customerName,
          customerNameNormalized: draft.customerNameNormalized,
          dueDate: draft.dueDate,
          lineItems: draft.lineItems.map((item, position) => ({
            _id: new ObjectId(),
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            position,
          })),
          totalAmountCents: draft.totalAmountCents,
          balanceDueCents: draft.totalAmountCents,
          updatedAt: timestamp,
        },
      },
      { returnDocument: "after" },
    );

    if (result === null) {
      return this.throwConditionalMiss(userId, orderId);
    }

    return toOrderDetail(result, getUtcDateOnly(timestamp));
  }

  public async delete(userId: ObjectId, orderId: ObjectId): Promise<void> {
    const result = await getCollections(this.database).orders.deleteOne({
      _id: orderId,
      userId,
      paymentCount: 0,
    });

    if (result.deletedCount === 0) {
      await this.throwConditionalMiss(userId, orderId);
    }
  }

  public async recordPayment(
    userId: ObjectId,
    orderId: ObjectId,
    input: RecordPaymentRequest,
    idempotencyKey: string,
  ): Promise<RecordPaymentServiceResult> {
    try {
      const timestamp = this.now();
      const draft = this.preparePayment(input, getUtcDateOnly(timestamp));
      const orders = getCollections(this.database).orders;
      const existingOrder = await orders.findOne({
        _id: orderId,
        userId,
        "payments.idempotencyKey": idempotencyKey,
      });
      const existingPayment = existingOrder?.payments.find(
        (payment) => payment.idempotencyKey === idempotencyKey,
      );
      if (existingOrder !== null && existingOrder !== undefined) {
        if (existingPayment === undefined) {
          throw this.paymentTemporarilyUnavailable();
        }
        return this.replayOrConflict(
          existingOrder,
          existingPayment,
          draft.requestFingerprint,
        );
      }

      const payment = {
        _id: new ObjectId(),
        amountCents: draft.amountCents,
        paymentDate: draft.paymentDate,
        note: draft.note,
        idempotencyKey,
        requestFingerprint: draft.requestFingerprint,
        createdAt: timestamp,
      };
      const updatedOrder = await orders.findOneAndUpdate(
        {
          _id: orderId,
          userId,
          balanceDueCents: { $gte: draft.amountCents },
          paymentCount: { $lt: maximumPaymentsPerOrder },
          payments: { $not: { $elemMatch: { idempotencyKey } } },
        },
        {
          $inc: {
            balanceDueCents: -draft.amountCents,
            paymentCount: 1,
          },
          $push: { payments: payment },
          $set: { updatedAt: timestamp },
        },
        { returnDocument: "after" },
      );

      if (updatedOrder !== null) {
        return {
          data: toRecordPaymentResult(updatedOrder, payment),
          replayed: false,
        };
      }

      const currentOrder = await orders.findOne({ _id: orderId, userId });
      if (currentOrder === null) {
        throw this.orderNotFound();
      }

      const replayedPayment = currentOrder.payments.find(
        (candidate) => candidate.idempotencyKey === idempotencyKey,
      );
      if (replayedPayment !== undefined) {
        return this.replayOrConflict(
          currentOrder,
          replayedPayment,
          draft.requestFingerprint,
        );
      }
      if (currentOrder.paymentCount >= maximumPaymentsPerOrder) {
        throw new AppError({
          status: 422,
          code: "PAYMENT_LIMIT_REACHED",
          message: "This order has reached the maximum payment count.",
        });
      }
      if (currentOrder.balanceDueCents === 0) {
        throw new AppError({
          status: 422,
          code: "ORDER_ALREADY_PAID",
          message: "This order has already been paid in full.",
          details: { remainingAmountCents: 0 },
        });
      }
      if (currentOrder.balanceDueCents < draft.amountCents) {
        throw new AppError({
          status: 422,
          code: "PAYMENT_EXCEEDS_BALANCE",
          message: "Payment amount exceeds the order's remaining balance.",
          details: {
            remainingAmountCents: currentOrder.balanceDueCents,
          },
        });
      }

      throw this.paymentTemporarilyUnavailable();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (
        error instanceof MongoError &&
        (retryableMongoErrorNames.has(error.name) ||
          error.hasErrorLabel("RetryableWriteError"))
      ) {
        throw this.paymentTemporarilyUnavailable();
      }
      throw error;
    }
  }

  private prepareDraft(input: CreateOrderRequest) {
    try {
      return prepareOrderDraft(input);
    } catch (error) {
      const appError = asOrderDomainValidationError(error);
      if (appError !== null) {
        throw appError;
      }
      throw error;
    }
  }

  private preparePayment(input: RecordPaymentRequest, todayUtc: string) {
    try {
      return preparePaymentDraft(input, todayUtc);
    } catch (error) {
      const appError = asOrderDomainValidationError(error);
      if (appError !== null) {
        throw appError;
      }
      throw error;
    }
  }

  private replayOrConflict(
    order: OrderDocument,
    payment: OrderDocument["payments"][number],
    requestFingerprint: string,
  ): RecordPaymentServiceResult {
    if (payment.requestFingerprint !== requestFingerprint) {
      throw new AppError({
        status: 409,
        code: "IDEMPOTENCY_KEY_REUSED",
        message:
          "This idempotency key was already used for a different payment request.",
      });
    }
    return {
      data: toRecordPaymentResult(order, payment),
      replayed: true,
    };
  }

  private paymentTemporarilyUnavailable(): AppError {
    return new AppError({
      status: 503,
      code: "PAYMENT_TEMPORARILY_UNAVAILABLE",
      message:
        "Payment recording is temporarily unavailable. Retry with the same idempotency key.",
    });
  }

  private async throwConditionalMiss(
    userId: ObjectId,
    orderId: ObjectId,
  ): Promise<never> {
    const order = await getCollections(this.database).orders.findOne(
      { _id: orderId, userId },
      { projection: { paymentCount: 1 } },
    );
    if (order === null) {
      throw this.orderNotFound();
    }
    if (order.paymentCount > 0) {
      throw new AppError({
        status: 409,
        code: "ORDER_LOCKED_AFTER_PAYMENT",
        message: "Orders cannot be changed after the first payment.",
      });
    }

    throw new AppError({
      status: 409,
      code: "ORDER_LOCKED_AFTER_PAYMENT",
      message: "Order state changed before the request could be completed.",
    });
  }

  public async populateSample(
    userId: ObjectId,
  ): Promise<PopulateSampleResult> {
    const { orders } = getCollections(this.database);

    const dateOnlyFromOffset = (offsetDays: number): string => {
      const date = new Date(this.now());
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
    ): PaymentDocument => ({
      _id: new ObjectId(),
      amountCents,
      paymentDate,
      note: "Sample assignment settlement",
      idempotencyKey,
      requestFingerprint: "sample".repeat(12).slice(0, 64),
      createdAt: this.now(),
    });

    const buildSeedOrder = (input: {
      customerName: string;
      dueDate: string;
      lineItems: LineItemDocument[];
      payments?: PaymentDocument[];
    }): OrderDocument => {
      const payments = input.payments ?? [];
      const totalAmountCents = input.lineItems.reduce(
        (total, item) => total + item.quantity * item.unitPriceCents,
        0,
      );
      const paidAmountCents = payments.reduce(
        (total, item) => total + item.amountCents,
        0,
      );
      const timestamp = this.now();

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

    const today = dateOnlyFromOffset(0);
    const sampleOrders: OrderDocument[] = [
      buildSeedOrder({
        customerName: "Northstar Trading",
        dueDate: dateOnlyFromOffset(7),
        lineItems: [lineItem("Implementation services", 5, 25_000)],
      }),
      buildSeedOrder({
        customerName: "Desert Bloom Retail",
        dueDate: dateOnlyFromOffset(7),
        lineItems: [lineItem("Monthly operations package", 3, 30_000)],
        payments: [
          payment(30_000, today, "10000000-0000-4000-8000-000000000001"),
        ],
      }),
      buildSeedOrder({
        customerName: "Harborline Logistics",
        dueDate: dateOnlyFromOffset(-2),
        lineItems: [lineItem("Reconciliation engagement", 1, 75_000)],
        payments: [
          payment(
            75_000,
            dateOnlyFromOffset(-3),
            "20000000-0000-4000-8000-000000000002",
          ),
        ],
      }),
      buildSeedOrder({
        customerName: "Cedar Works",
        dueDate: dateOnlyFromOffset(-7),
        lineItems: [lineItem("Finance dashboard setup", 2, 25_000)],
      }),
      buildSeedOrder({
        customerName: "Oasis Food Group",
        dueDate: dateOnlyFromOffset(-7),
        lineItems: [lineItem("Reporting support", 4, 30_000)],
        payments: [
          payment(
            50_000,
            dateOnlyFromOffset(-8),
            "30000000-0000-4000-8000-000000000003",
          ),
        ],
      }),
      buildSeedOrder({
        customerName: "Assignment Sample Corp",
        dueDate: dateOnlyFromOffset(14),
        lineItems: [lineItem("Assignment item", 2, 50_000)],
        payments: [
          payment(40_000, today, "40000000-0000-4000-8000-000000000004"),
        ],
      }),
    ];

    await orders.insertMany(sampleOrders);
    return { ordersCreated: sampleOrders.length };
  }

  private orderNotFound(): AppError {
    return new AppError({
      status: 404,
      code: "ORDER_NOT_FOUND",
      message: "Order not found.",
    });
  }
}
