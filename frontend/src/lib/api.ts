import axios from "axios";
import { useAuthStore } from "@/store/authStore";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Read straight from the zustand store (which is itself rehydrated from
    // localStorage["bark-auth"]) so there's a single source of truth for the
    // token instead of a second, easily-desynced localStorage key.
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      // Clear the persisted session fully (store + localStorage) so the app
      // doesn't think it's still logged in after a reload.
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post("/auth/register", { username, email, password }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const usersAPI = {
  getProfile: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: FormData) => api.patch("/users/me", data),
  getStats: (id: string) => api.get(`/users/${id}/stats`),
};

export const matchesAPI = {
  getHistory: (page = 1, limit = 20) =>
    api.get(`/matches/history?page=${page}&limit=${limit}`),
  getMatch: (id: string) => api.get(`/matches/${id}`),
};

export const leaderboardAPI = {
  getGlobal: (page = 1, limit = 100) =>
    api.get(`/leaderboard/global?page=${page}&limit=${limit}`),
  getWeekly: () => api.get("/leaderboard/weekly"),
  getMonthly: () => api.get("/leaderboard/monthly"),
  getFriends: () => api.get("/leaderboard/friends"),
  getNearby: () => api.get("/leaderboard/nearby"),
};

export const shopAPI = {
  getItems: () => api.get("/shop/items"),
  purchaseItem: (itemId: string) => api.post(`/shop/purchase/${itemId}`),
  getInventory: () => api.get("/shop/inventory"),
};
