// ABOUTME: Login page — two-step flow: phone input then OTP verification.
// ABOUTME: Uses CollabSphere design system with dark theme, toast errors, loading states.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";

type Step = "phone" | "otp";

export default function LoginPage() {
  const router = useRouter();
  const { sendOtp, login } = useAuth();

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  function startResendTimer() {
    setResendTimer(30);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;

    setIsLoading(true);
    try {
      await sendOtp(fullPhone);
      setPhone(fullPhone);
      setStep("otp");
      startResendTimer();
      toast.success("OTP sent! Check your console (dev mode)");
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Failed to send OTP";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    setIsLoading(true);
    try {
      await login(phone, otp);
      toast.success("Login successful!");
      router.push("/");
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Invalid OTP";
      toast.error(message);
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendOtp() {
    if (resendTimer > 0) return;

    setIsLoading(true);
    try {
      await sendOtp(phone);
      startResendTimer();
      toast.success("OTP resent!");
    } catch (error: any) {
      const message = error.response?.data?.error?.message || "Failed to resend OTP";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-accent">CollabSphere</h1>
        <p className="mt-2 text-text-secondary">
          The collaboration marketplace for creators
        </p>
      </div>

      <Card>
        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Sign in</h2>
              <p className="text-sm text-text-muted mt-1">
                Enter your phone number to receive an OTP
              </p>
            </div>

            <Input
              label="Phone Number"
              prefix="+91"
              type="tel"
              placeholder="9876543210"
              value={phone.replace(/^\+91/, "")}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
            />

            <Button
              className="w-full"
              size="lg"
              isLoading={isLoading}
              onClick={handleSendOtp}
            >
              Send OTP
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Verify OTP</h2>
              <p className="text-sm text-text-muted mt-1">
                Enter the 6-digit code sent to {phone}
              </p>
            </div>

            <OtpInput value={otp} onChange={setOtp} />

            <Button
              className="w-full"
              size="lg"
              isLoading={isLoading}
              onClick={handleVerifyOtp}
            >
              Verify
            </Button>

            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => { setStep("phone"); setOtp(""); }}
                className="text-accent hover:underline"
              >
                Change number
              </button>

              {resendTimer > 0 ? (
                <span className="text-text-muted">Resend in {resendTimer}s</span>
              ) : (
                <button
                  onClick={handleResendOtp}
                  className="text-accent hover:underline"
                  disabled={isLoading}
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
