import type {
  DataResponse,
  LoginRequest,
  SignupRequest,
  Viewer,
} from "@crossval/contracts";

import { ApiError, apiRequest } from "../../lib/api-client";

export const getSession = async (
  signal?: AbortSignal,
): Promise<Viewer | null> => {
  try {
    const response = await apiRequest<DataResponse<Viewer>>("/auth/me", {
      ...(signal !== undefined && { signal }),
    });
    return response.data;
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
};

export const login = async (input: LoginRequest): Promise<Viewer> => {
  const response = await apiRequest<DataResponse<Viewer>>("/auth/login", {
    method: "POST",
    body: input,
  });
  return response.data;
};

export const signup = async (input: SignupRequest): Promise<Viewer> => {
  const response = await apiRequest<DataResponse<Viewer>>("/auth/signup", {
    method: "POST",
    body: input,
  });
  return response.data;
};

export const logout = async (): Promise<void> => {
  await apiRequest<void>("/auth/logout", { method: "POST" });
};
