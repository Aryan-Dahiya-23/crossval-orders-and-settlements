import {
  createOrderRequestSchema,
  recordPaymentRequestSchema,
  replaceOrderRequestSchema,
  type DataResponse,
  type OrderDetail,
} from "@crossval/contracts";
import { Router } from "express";
import type { Db } from "mongodb";

import {
  createRequireAuthentication,
  requireAuthenticationContext,
} from "../auth/middleware.js";
import { AuthService } from "../auth/service.js";
import type { SessionCookieConfiguration } from "../auth/types.js";
import { paymentRateLimit } from "../../middleware/rate-limit.js";
import { OrderService } from "./service.js";
import {
  parseOrderId,
  parseOrderInput,
  parseOrderListQuery,
  parsePaymentIdempotencyKey,
} from "./validation.js";

interface OrdersRouterOptions {
  database: Db;
  session: SessionCookieConfiguration;
}

export const createOrdersRouter = (options: OrdersRouterOptions): Router => {
  const router = Router();
  const orderService = new OrderService(options.database);
  const requireAuthentication = createRequireAuthentication(
    new AuthService(options.database, options.session),
    options.session,
  );

  router.use(requireAuthentication);

  router.get("/summary", async (request, response) => {
    const context = requireAuthenticationContext(request);
    response.status(200).json(await orderService.summary(context.userId));
  });

  router.get("/", async (request, response) => {
    const context = requireAuthenticationContext(request);
    response
      .status(200)
      .json(
        await orderService.list(
          context.userId,
          parseOrderListQuery(request.query),
        ),
      );
  });

  router.post("/sample", async (request, response) => {
    const context = requireAuthenticationContext(request);
    const result = await orderService.populateSample(context.userId);
    response.status(201).json({ data: result });
  });

  router.post("/", async (request, response) => {
    const context = requireAuthenticationContext(request);
    const input = parseOrderInput(createOrderRequestSchema, request.body);
    const body: DataResponse<OrderDetail> = {
      data: await orderService.create(context.userId, input),
    };
    response.status(201).json(body);
  });

  router.post(
    "/:orderId/payments",
    paymentRateLimit,
    async (request, response) => {
      const context = requireAuthenticationContext(request);
      const result = await orderService.recordPayment(
        context.userId,
        parseOrderId(request.params.orderId ?? ""),
        parseOrderInput(recordPaymentRequestSchema, request.body),
        parsePaymentIdempotencyKey(request.header("Idempotency-Key")),
      );
      if (result.replayed) {
        response.setHeader("Idempotency-Replayed", "true");
      }
      response.status(result.replayed ? 200 : 201).json({ data: result.data });
    },
  );

  router.get("/:orderId", async (request, response) => {
    const context = requireAuthenticationContext(request);
    const body: DataResponse<OrderDetail> = {
      data: await orderService.detail(
        context.userId,
        parseOrderId(request.params.orderId ?? ""),
      ),
    };
    response.status(200).json(body);
  });

  router.patch("/:orderId", async (request, response) => {
    const context = requireAuthenticationContext(request);
    const input = parseOrderInput(replaceOrderRequestSchema, request.body);
    const body: DataResponse<OrderDetail> = {
      data: await orderService.replace(
        context.userId,
        parseOrderId(request.params.orderId ?? ""),
        input,
      ),
    };
    response.status(200).json(body);
  });

  router.delete("/:orderId", async (request, response) => {
    const context = requireAuthenticationContext(request);
    await orderService.delete(
      context.userId,
      parseOrderId(request.params.orderId ?? ""),
    );
    response.status(204).send();
  });

  return router;
};
