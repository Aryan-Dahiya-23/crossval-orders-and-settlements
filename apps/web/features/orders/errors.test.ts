import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../../lib/api-client";
import { applyApiFieldErrorsToForm, parseOrderApiError } from "./errors";

describe("parseOrderApiError", () => {
  it("formats 409 ORDER_LOCKED_AFTER_PAYMENT with clear financial audit trail explanation", () => {
    const error = new ApiError(409, {
      error: {
        code: "ORDER_LOCKED_AFTER_PAYMENT",
        message: "Orders cannot be changed after the first payment.",
        requestId: "req_1",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.isLocked).toBe(true);
    expect(parsed.isNotFound).toBe(false);
    expect(parsed.title).toBe("Order is locked");
    expect(parsed.message).toContain("permanently locked");
  });

  it("handles status 409 even with alternate error code", () => {
    const error = new ApiError(409, {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Locked",
        requestId: "req_lock",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.isLocked).toBe(true);
  });


  it("formats 404 ORDER_NOT_FOUND correctly", () => {
    const error = new ApiError(404, {
      error: {
        code: "ORDER_NOT_FOUND",
        message: "Order not found",
        requestId: "req_2",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.isNotFound).toBe(true);
    expect(parsed.isLocked).toBe(false);
    expect(parsed.title).toBe("Order not found");
  });

  it("extracts field errors from 422 VALIDATION_FAILED", () => {
    const error = new ApiError(422, {
      error: {
        code: "VALIDATION_FAILED",
        message: "Please correct the fields.",
        details: {
          fields: {
            customerName: ["Customer name is required."],
            "items.0.unitPrice": ["Unit price is required."],
          },
        },
        requestId: "req_3",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.isLocked).toBe(false);
    expect(parsed.isNotFound).toBe(false);
    expect(parsed.title).toBe("Validation error");
    expect(parsed.fieldErrors.customerName).toEqual([
      "Customer name is required.",
    ]);
  });

  it("formats 401 AUTHENTICATION_REQUIRED with session message", () => {
    const error = new ApiError(401, {
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required",
        requestId: "req_4",
      },
    });
    const parsed = parseOrderApiError(error);
    expect(parsed.title).toBe("Session expired");
  });

  it("handles generic Error objects as network errors", () => {
    const error = new Error("Failed to fetch");
    const parsed = parseOrderApiError(error);
    expect(parsed.title).toBe("Network error");
    expect(parsed.message).toBe("Failed to fetch");
  });

  it("handles unknown error non-object gracefully", () => {
    const parsed = parseOrderApiError("something weird");
    expect(parsed.title).toBe("Network error");
    expect(parsed.message).toBe("Unable to connect to the server. Please check your network connection.");
  });
});

describe("applyApiFieldErrorsToForm", () => {
  it("calls setError for each present field with first message", () => {
    const setError = vi.fn();
    const applied = applyApiFieldErrorsToForm(
      {
        customerName: ["Customer name is required.", "Second message"],
        dueDate: ["Due date is invalid."],
      },
      setError,
    );

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith("customerName", {
      type: "server",
      message: "Customer name is required.",
    });
    expect(setError).toHaveBeenCalledWith("dueDate", {
      type: "server",
      message: "Due date is invalid.",
    });
  });

  it("returns false if fieldErrors map is empty", () => {
    const setError = vi.fn();
    const applied = applyApiFieldErrorsToForm({}, setError);
    expect(applied).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
