// ABOUTME: Custom hook for consuming AuthContext — throws if used outside AuthProvider.
// ABOUTME: Typed access to user, auth state, and auth actions.

"use client";

import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
