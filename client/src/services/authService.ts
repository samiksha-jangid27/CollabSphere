// ABOUTME: Auth API service — typed methods for all authentication endpoints.
// ABOUTME: Consumed by AuthContext to keep API calls centralized.

import api from "./api";

export interface User {
  _id: string;
  phone: string;
  email?: string;
  phoneVerified: boolean;
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
  async sendOtp(phone: string) {
    const { data } = await api.post<ApiResponse<{ phone: string; isNewUser: boolean }>>(
      "/auth/otp/send",
      { phone }
    );
    return data;
  },

  async verifyOtp(phone: string, otp: string) {
    const { data } = await api.post<ApiResponse<{ accessToken: string; user: User }>>(
      "/auth/otp/verify",
      { phone, otp }
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
