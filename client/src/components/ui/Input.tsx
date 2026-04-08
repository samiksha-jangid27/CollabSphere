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
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex">
          {prefix && (
            <span className="inline-flex items-center px-3 bg-bg-tertiary border border-r-0 border-border rounded-l-lg text-text-secondary text-sm">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full px-3 py-2.5 bg-surface border border-border text-text-primary placeholder-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors ${
              prefix ? "rounded-r-lg" : "rounded-lg"
            } ${error ? "border-error focus:ring-error/50" : ""} ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
