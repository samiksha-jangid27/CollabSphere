// ABOUTME: Dashboard placeholder — protected page showing user info and email verification status.
// ABOUTME: Redirects unauthenticated users to /login. Sprint 2 content goes here.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-accent">CollabSphere</h1>
        <Button variant="ghost" onClick={handleLogout}>
          Logout
        </Button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Welcome back</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Phone</span>
                <span className="text-text-primary">{user.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Email</span>
                <span className="text-text-primary">{user.email || "Not set"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Phone Verified</span>
                <span className={user.phoneVerified ? "text-success" : "text-error"}>
                  {user.phoneVerified ? "Verified" : "Not verified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Email Verified</span>
                <span className={user.emailVerified ? "text-success" : "text-error"}>
                  {user.emailVerified ? "Verified" : "Not verified"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Role</span>
                <span className="text-text-primary capitalize">{user.role}</span>
              </div>
            </div>

            {!user.emailVerified && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => router.push("/verify")}
              >
                Verify Email
              </Button>
            )}
          </div>
        </Card>

        <Card className="text-center">
          <p className="text-text-muted text-sm">
            Sprint 2 content — profiles, discovery, and more — coming soon.
          </p>
        </Card>
      </main>
    </div>
  );
}
