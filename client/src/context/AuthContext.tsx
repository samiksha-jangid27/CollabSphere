// ABOUTME: Auth state provider — manages user, token, loading, and authentication lifecycle.
// ABOUTME: Silent refresh on mount; exposes register, login, logout via context.

"use client";

import { createContext, useCallback, useEffect, useState, ReactNode } from "react";
import { authService, User } from "@/services/authService";
import { setAccessToken } from "@/services/api";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (username: string, password: string, role: "creator" | "brand", email?: string) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  sendEmailVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authService.getMe();
      setUser(data.user);
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // Silent refresh on mount
  useEffect(() => {
    async function init() {
      try {
        const { data } = await authService.refreshToken();
        setAccessToken(data.accessToken);
        await refreshUser();
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [refreshUser]);

  const register = useCallback(
    async (username: string, password: string, role: "creator" | "brand", email?: string) => {
      const response = await authService.register(username, password, role, email);
      setAccessToken(response.data.accessToken);
      setUser(response.data.user);
    },
    []
  );

  const login = useCallback(async (username: string, password: string) => {
    const response = await authService.login(username, password);
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const sendEmailVerification = useCallback(async (email: string) => {
    await authService.sendEmailVerification(email);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        register,
        login,
        sendEmailVerification,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
