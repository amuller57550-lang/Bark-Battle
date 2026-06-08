import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  // True once zustand-persist has finished restoring `{ token, user }` from
  // localStorage on the client. Pages MUST wait for this before deciding
  // "no user => redirect to /login" — otherwise the very first render (before
  // the persisted session loads) looks logged-out and bounces everyone to the
  // login page on every reload, even with a perfectly valid session.
  hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      hasHydrated: false,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem("bark_token", token);
        else localStorage.removeItem("bark_token");
        set({ token });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      logout: () => {
        localStorage.removeItem("bark_token");
        set({ user: null, token: null });
      },
    }),
    {
      name: "bark-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
