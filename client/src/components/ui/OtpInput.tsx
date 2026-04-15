// ABOUTME: 6-digit OTP input with individual boxes, auto-focus, paste support, and backspace handling.
// ABOUTME: Accent border on focus, dark theme styled.

"use client";

import { useRef, KeyboardEvent, ClipboardEvent } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: string;
}

export function OtpInput({ value, onChange, length = 6, error }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  function handleChange(index: number, digit: string) {
    if (!/^\d*$/.test(digit)) return;

    const newValue = digits.map((d, i) => (i === index ? digit : d)).join("");
    onChange(newValue.slice(0, length));

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newValue = digits.map((d, i) => (i === index - 1 ? "" : d)).join("");
      onChange(newValue);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`OTP digit ${index + 1}`}
            className={`h-14 w-12 rounded-lg border text-center text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0 ${
              error
                ? "border-rust bg-ink-1 text-paper"
                : digit
                  ? "border-amber bg-ink-2 text-paper"
                  : "border-line bg-ink-1 text-paper"
            }`}
          />
        ))}
      </div>
      {error && <p className="mt-2 text-center type-body-s text-rust">{error}</p>}
    </div>
  );
}
