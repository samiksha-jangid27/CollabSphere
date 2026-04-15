// ABOUTME: Dark card component with CollabSphere card background and shadow.
// ABOUTME: Used as container for auth forms and content sections.

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-line bg-ink-1 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.28)] ${className}`}
    >
      {children}
    </div>
  );
}
