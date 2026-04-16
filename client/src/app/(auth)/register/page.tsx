// ABOUTME: Register page — create new creator or brand account with email/password.
// ABOUTME: Handles role selection, form validation, and email verification flow.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: unknown }).response === "object" &&
    (error as { response?: unknown }).response !== null
  ) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    const message = response?.data?.error?.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

type Role = "creator" | "brand";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("creator");
  const [isLoading, setIsLoading] = useState(false);

  async function handleRegister() {
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }

    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter a password");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      await register(username, password, role, email);
      toast.success("Account created! Redirecting...");
      router.push("/verify");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Registration failed");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="type-display-m text-paper">CollabSphere</h1>
        <p className="mt-2 type-body-m text-paper-dim">
          The collaboration marketplace for creators
        </p>
      </div>

      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="type-h2 text-paper">Create account</h2>
            <p className="mt-1 type-body-s text-paper-muted">
              Join as a creator or brand
            </p>
          </div>

          <div>
            <label className="block type-body-s font-medium text-paper mb-2">
              Account Type
            </label>
            <div className="flex gap-3">
              {(["creator", "brand"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 px-4 py-2 rounded border text-center type-body-s transition ${
                    role === r
                      ? "bg-amber border-amber text-ink-0"
                      : "border-line bg-ink-2 text-paper hover:border-amber"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Username"
            type="text"
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          />

          <Button
            className="w-full"
            size="lg"
            isLoading={isLoading}
            onClick={handleRegister}
          >
            Create account
          </Button>

          <div className="text-center">
            <p className="type-body-s text-paper-muted">
              Already have an account?{" "}
              <Link href="/login" className="text-amber hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
