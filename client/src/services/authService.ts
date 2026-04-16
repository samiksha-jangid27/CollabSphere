// ABOUTME: Auth API service — typed methods for all authentication endpoints.
// ABOUTME: Consumed by AuthContext to keep API calls centralized.

import api from "./api";

export interface User {
  _id: string;
  username: string;
  email?: string;
  emailVerified: boolean;
  role: "creator" | "brand" | "admin";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export const authService = {
  async register(username: string, password: string, role: "creator" | "brand", email?: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; user: User }>>(
      "/auth/register",
      { username, password, role, email }
    );
    return data;
  },

  async login(username: string, password: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; user: User }>>(
      "/auth/login",
      { username, password }
    );
    return data;
  },

  async sendEmailVerification(email: string) {
    const { data } = await api.post<ApiResponse<null>>("/auth/email/send", { email });
    return data;
  },

  async verifyEmail(token: string) {
    const { data } = await api.get<ApiResponse<{ emailVerified: boolean }>>(
      `/auth/email/verify/${token}`
    );
    return data;
  },

  async refreshToken() {
    const { data } = await api.post<ApiResponse<{ accessToken: string }>>("/auth/refresh");
    return data;
  },

  async logout() {
    const { data } = await api.post<ApiResponse<null>>("/auth/logout");
    return data;
  },

  async getMe() {
    const { data } = await api.get<ApiResponse<{ user: User }>>("/auth/me");
    return data;
  },
};
