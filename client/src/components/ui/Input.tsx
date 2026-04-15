// ABOUTME: Styled text input for dark theme — supports label, error state, and prefix.
// ABOUTME: Consistent with CollabSphere design tokens.

"use client";

import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, prefix, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block type-label text-paper-dim">
            {label}
          </label>
        )}
        <div className="relative flex">
          {prefix && (
            <span className="inline-flex min-h-11 items-center rounded-l-lg border border-r-0 border-line bg-ink-2 px-3 type-body-m text-paper-dim">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full min-h-11 border bg-ink-1 px-3 type-body-m text-paper placeholder:text-paper-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0 ${
              prefix ? "rounded-r-lg" : "rounded-lg"
            } ${error ? "border-rust focus-visible:ring-rust/60" : "border-line focus-visible:border-amber"} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 type-body-s text-rust">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
