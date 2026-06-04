import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bark_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("bark_token");
      window.location.href = "/login";
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
