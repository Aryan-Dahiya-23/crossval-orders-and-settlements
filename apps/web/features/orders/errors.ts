import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "../../lib/api-client";

export interface ParsedOrderError {
  title: string;
  message: string;
  isLocked: boolean;
  isNotFound: boolean;
  fieldErrors: Record<string, string[]>;
}

/**
 * Parses and categorizes errors from order API operations.
 */
export const parseOrderApiError = (error: unknown): ParsedOrderError => {
  if (error instanceof ApiError) {
    if (error.code === "ORDER_LOCKED_AFTER_PAYMENT" || error.status === 409) {
      return {
        title: "Order is locked",
        message:
          "This order has recorded payments and is permanently locked against modifications or deletion for financial audit integrity.",
        isLocked: true,
        isNotFound: false,
        fieldErrors: {},
      };
    }

    if (error.code === "ORDER_NOT_FOUND" || error.status === 404) {
      return {
        title: "Order not found",
        message:
          "The requested order could not be found or belongs to a different workspace.",
        isLocked: false,
        isNotFound: true,
        fieldErrors: {},
      };
    }

    if (error.code === "VALIDATION_FAILED" || error.status === 422) {
      return {
        title: "Validation error",
        message:
          error.message || "Please review and correct the highlighted fields.",
        isLocked: false,
        isNotFound: false,
        fieldErrors: error.details?.fields ?? {},
      };
    }

    if (error.code === "AUTHENTICATION_REQUIRED" || error.status === 401) {
      return {
        title: "Session expired",
        message: "Your session has expired. Please sign in again to continue.",
        isLocked: false,
        isNotFound: false,
        fieldErrors: {},
      };
    }

    return {
      title: "Request failed",
      message:
        error.message || "An unexpected error occurred. Please try again.",
      isLocked: false,
      isNotFound: false,
      fieldErrors: error.details?.fields ?? {},
    };
  }

  return {
    title: "Network error",
    message:
      error instanceof Error
        ? error.message
        : "Unable to connect to the server. Please check your network connection.",
    isLocked: false,
    isNotFound: false,
    fieldErrors: {},
  };
};

/**
 * Applies parsed field errors from the API response to a React Hook Form instance.
 */
export const applyApiFieldErrorsToForm = <TFormValues extends FieldValues>(
  fieldErrors: Record<string, string[]>,
  setError: UseFormSetError<TFormValues>,
): boolean => {
  let appliedAny = false;
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const firstMessage = messages?.[0];
    if (firstMessage !== undefined && firstMessage.length > 0) {
      setError(field as Path<TFormValues>, {
        type: "server",
        message: firstMessage,
      });
      appliedAny = true;
    }
  }
  return appliedAny;
};

