import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem("bark_token", token);
        else localStorage.removeItem("bark_token");
        set({ token });
      },
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => {
        localStorage.removeItem("bark_token");
        set({ user: null, token: null });
      },
    }),
    {
      name: "bark-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
