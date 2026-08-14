import type { HealthResponse } from "@crossval/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("API foundation", () => {
  it("returns a safe liveness response", async () => {
    const response = await request(createApp()).get("/health").expect(200);
    const body = response.body as HealthResponse;

    expect(body).toEqual({ status: "ok" });
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("returns structured JSON for unknown routes", async () => {
    const response = await request(createApp())
      .get("/not-a-route")
      .expect("Content-Type", /json/)
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "ROUTE_NOT_FOUND",
        message: "No route exists for GET /not-a-route.",
        requestId: expect.any(String),
      },
    });
    expect(response.headers["x-request-id"]).toBe(
      response.body.error.requestId,
    );
  });
});
