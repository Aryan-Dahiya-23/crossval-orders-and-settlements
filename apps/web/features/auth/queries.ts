"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LoginRequest, SignupRequest, Viewer } from "@crossval/contracts";

import { getSession, login, logout, signup } from "./api";

export const authKeys = {
  all: ["auth"] as const,
  session: () => ["auth", "session"] as const,
};

export const useSession = () =>
  useQuery({
    queryKey: authKeys.session(),
    queryFn: ({ signal }) => getSession(signal),
    staleTime: 30_000,
    retry: false,
  });

const useAuthenticatedMutation = <Input>(
  mutationFn: (input: Input) => Promise<Viewer>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (viewer) => {
      queryClient.setQueryData(authKeys.session(), viewer);
    },
  });
};

export const useLogin = () => useAuthenticatedMutation<LoginRequest>(login);
export const useSignup = () => useAuthenticatedMutation<SignupRequest>(signup);

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(authKeys.session(), null);
    },
  });
};
