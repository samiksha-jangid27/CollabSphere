// ABOUTME: Login page — email and password authentication.
// ABOUTME: Uses CollabSphere design system with dark theme, toast errors, loading states.

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

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin() {
    if (!username.trim()) {
      toast.error("Please enter your username");
      return;
    }

    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }

    setIsLoading(true);
    try {
      await login(username, password);
      toast.success("Login successful!");
      router.push("/");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Login failed");
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
            <h2 className="type-h2 text-paper">Sign in</h2>
            <p className="mt-1 type-body-s text-paper-muted">
              Enter your credentials to access your account
            </p>
          </div>

          <Input
            label="Username"
            type="text"
            placeholder="your_username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <Button
            className="w-full"
            size="lg"
            isLoading={isLoading}
            onClick={handleLogin}
          >
            Sign in
          </Button>

          <div className="text-center">
            <p className="type-body-s text-paper-muted">
              {"Don't have an account? "}
              <Link href="/register" className="text-amber hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
