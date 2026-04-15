// ABOUTME: Reusable button with primary/secondary/ghost variants and loading spinner.
// ABOUTME: Styled with CollabSphere design tokens — accent bg, dark theme.

"use client";

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex select-none items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55";

  const variants = {
    primary:
      "border-transparent bg-amber text-ink-0 shadow-[0_1px_0_rgba(245,240,230,0.08)_inset] hover:bg-amber/90 active:bg-amber-dim",
    secondary:
      "border-line bg-ink-2 text-paper hover:border-line-strong hover:bg-ink-3 active:bg-ink-2/70",
    ghost:
      "border-transparent bg-transparent text-paper-dim hover:bg-ink-2 hover:text-paper active:bg-ink-3",
    destructive:
      "border-transparent bg-rust text-ink-0 hover:bg-rust/90 active:bg-rust/80",
  };

  const sizes = {
    sm: "min-h-11 px-3 text-sm",
    md: "min-h-11 px-4 text-sm",
    lg: "min-h-12 px-6 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-80"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
