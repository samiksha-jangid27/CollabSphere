// ABOUTME: Email verification page — send verification email and handle ?token= confirmation.
// ABOUTME: Shows verification status and redirects to dashboard on success.

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { authService } from "@/services/authService";
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

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading, sendEmailVerification, refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  // Handle token from email link
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;

    async function verify() {
      setIsVerifying(true);
      try {
        await authService.verifyEmail(token!);
        toast.success("Email verified successfully!");
        await refreshUser();
        router.push("/");
      } catch (error: unknown) {
        const message = getErrorMessage(error, "Verification failed");
        toast.error(message);
      } finally {
        setIsVerifying(false);
      }
    }

    verify();
  }, [searchParams, refreshUser, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  async function handleSendVerification() {
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }

    setIsLoading(true);
    try {
      await sendEmailVerification(email);
      setSent(true);
      toast.success("Verification email sent! Check your inbox (or console in dev)");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Failed to send email");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || isVerifying) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  if (user?.emailVerified) {
    return (
      <Card>
        <div className="text-center space-y-4">
          <div className="text-4xl">&#10003;</div>
          <h2 className="type-h2 text-sage">Email Verified</h2>
          <p className="type-body-m text-paper-dim">Your email has been verified successfully.</p>
          <Button onClick={() => router.push("/")} className="w-full" size="lg">
            Go to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="type-display-m text-paper">CollabSphere</h1>
        <p className="mt-2 type-body-m text-paper-dim">Verify your email to continue</p>
      </div>

      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="type-h2 text-paper">Email Verification</h2>
            <p className="mt-1 type-body-s text-paper-muted">
              We&apos;ll send a verification link to your email
            </p>
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendVerification()}
          />

          <Button
            className="w-full"
            size="lg"
            isLoading={isLoading}
            onClick={handleSendVerification}
          >
            {sent ? "Resend Verification Email" : "Send Verification Email"}
          </Button>

          {sent && (
            <p className="text-center type-body-s text-paper-dim">
              Check your email for the verification link.
              <br />
              <span className="text-paper-muted">(In dev mode, check the server console for the Ethereal preview URL)</span>
            </p>
          )}

          <Button
            type="button"
            onClick={() => router.push("/")}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Skip for now
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
