// ABOUTME: Root route redirects authenticated users into the app shell at /profile/me.
// ABOUTME: Unauthenticated visitors land at /login. No standalone dashboard.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RootRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    router.replace(isAuthenticated ? "/profile/me" : "/login");
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex min-h-[60vh] items-end">
      <p className="type-eyebrow text-paper-muted">Redirecting.</p>
    </div>
  );
}
