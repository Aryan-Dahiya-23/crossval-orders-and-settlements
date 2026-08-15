"use client";

import { useRouter } from "next/navigation";

import { useLogout } from "../../features/auth/queries";
import * as Button from "../ui/button";

export function LogoutButton() {
  const logout = useLogout();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
      router.replace("/login");
    } catch {
      // Keep the authenticated screen visible when server-side revocation fails.
    }
  };

  return (
    <div className="grid gap-1.5">
      <Button.Root
        className="w-full"
        variant="neutral"
        mode="stroke"
        size="small"
        type="button"
        disabled={logout.isPending}
        onClick={() => void handleLogout()}
      >
        {logout.isPending ? "Signing out…" : "Sign out"}
      </Button.Root>
      {logout.isError && (
        <p className="text-paragraph-xs text-error-base" role="alert">
          Sign out failed. Please try again.
        </p>
      )}
    </div>
  );
}
