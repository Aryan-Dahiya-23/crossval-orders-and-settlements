import type {
  OrderDetail,
  OrderLineItem,
  OrderListItem,
  OrderPayment,
} from "@crossval/contracts";

import type {
  LineItemDocument,
  OrderDocument,
  PaymentDocument,
} from "../../db/documents.js";
import { deriveOrderStatus, toDisplayId } from "./domain.js";

const toOrderLineItem = (item: LineItemDocument): OrderLineItem => ({
  id: item._id.toHexString(),
  description: item.description,
  quantity: item.quantity,
  unitPriceCents: item.unitPriceCents,
  lineTotalCents: item.quantity * item.unitPriceCents,
  position: item.position,
});

const toOrderPayment = (payment: PaymentDocument): OrderPayment => ({
  id: payment._id.toHexString(),
  amountCents: payment.amountCents,
  paymentDate: payment.paymentDate,
  note: payment.note,
  createdAt: payment.createdAt.toISOString(),
});

export const toOrderListItem = (
  order: OrderDocument,
  todayUtc: string,
): OrderListItem => ({
  id: order._id.toHexString(),
  displayId: toDisplayId(order._id.toHexString()),
  customerName: order.customerName,
  dueDate: order.dueDate,
  status: deriveOrderStatus(order, todayUtc),
  totalAmountCents: order.totalAmountCents,
  paidAmountCents: order.totalAmountCents - order.balanceDueCents,
  balanceDueCents: order.balanceDueCents,
  isEditable: order.paymentCount === 0,
  isDeletable: order.paymentCount === 0,
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
});

export const toOrderDetail = (
  order: OrderDocument,
  todayUtc: string,
): OrderDetail => ({
  ...toOrderListItem(order, todayUtc),
  items: [...order.lineItems]
    .sort((left, right) => left.position - right.position)
    .map(toOrderLineItem),
  payments: [...order.payments]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map(toOrderPayment),
});
