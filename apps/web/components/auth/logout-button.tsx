"use client";

import { useRouter } from "next/navigation";

import { useLogout } from "../../features/auth/queries";

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
    <div className="logout-action">
      <button
        className="secondary-button"
        type="button"
        disabled={logout.isPending}
        onClick={() => void handleLogout()}
      >
        {logout.isPending ? "Signing out…" : "Sign out"}
      </button>
      {logout.isError && (
        <p className="field-error" role="alert">
          Sign out failed. Please try again.
        </p>
      )}
    </div>
  );
}
