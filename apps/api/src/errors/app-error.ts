import type { ApiErrorCode, ApiErrorResponse } from "@crossval/contracts";

export type ApiErrorDetails = NonNullable<ApiErrorResponse["error"]["details"]>;

export class AppError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details: ApiErrorDetails | undefined;

  public constructor(options: {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetails;
  }) {
    super(options.message);
    this.name = "AppError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}
