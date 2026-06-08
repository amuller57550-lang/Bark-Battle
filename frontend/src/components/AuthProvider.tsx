"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { authAPI } from "@/lib/api";

/**
 * Re-validates the persisted session against the backend on every load/reload.
 *
 * zustand-persist restores `{ token, user }` from localStorage synchronously,
 * so the UI doesn't flash a logged-out state — but that data could be stale
 * (profile changes) or the token could have expired/been revoked. This effect
 * calls GET /auth/me whenever we have a token, refreshes `user` with the
 * authoritative copy, and logs out cleanly if the token is no longer valid.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    authAPI
      .me()
      .then(({ data }) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) logout();
      });

    return () => {
      cancelled = true;
    };
  }, [token, setUser, logout]);

  return <>{children}</>;
}
