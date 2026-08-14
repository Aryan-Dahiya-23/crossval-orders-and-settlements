import type { ApiErrorResponse } from "@crossval/contracts";

const apiBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? "/api/v1";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorResponse["error"]["code"];
  public readonly details: ApiErrorResponse["error"]["details"];
  public readonly requestId: string;

  public constructor(status: number, response: ApiErrorResponse) {
    super(response.error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = response.error.code;
    this.details = response.error.details;
    this.requestId = response.error.requestId;
  }
}

interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const error = (value as { error?: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "string" &&
    typeof (error as { message?: unknown }).message === "string" &&
    typeof (error as { requestId?: unknown }).requestId === "string"
  );
};

export const apiRequest = async <ResponseBody>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody> => {
  const { body, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiBasePath}${path}`, {
    ...requestOptions,
    headers,
    credentials: "include",
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  if (response.status === 204) {
    return undefined as ResponseBody;
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    if (isApiErrorResponse(payload)) {
      throw new ApiError(response.status, payload);
    }
    throw new Error("The API returned an unreadable error response.");
  }

  return payload as ResponseBody;
};
