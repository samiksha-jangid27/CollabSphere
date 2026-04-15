// ABOUTME: Signature Editorial Noir profile hero — display-xl name stacked over a rule and avatar.
// ABOUTME: Name splits on first space, square avatar flush-right, sage verified dot, lowercase location.

"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { fadeUp } from "@/lib/motion";
import type { Profile } from "@/types/profile";

interface ProfileHeaderProps {
  profile: Profile;
}

function splitName(name: string): { line1: string; line2: string | null } {
  const trimmed = name.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) {
    return { line1: trimmed, line2: null };
  }
  return {
    line1: trimmed.slice(0, firstSpace),
    line2: trimmed.slice(firstSpace + 1),
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1][0]!).toUpperCase();
}

function formatLocation(profile: Profile): string | null {
  const loc = profile.location;
  if (!loc) return null;
  const parts = [loc.city, loc.state, loc.country]
    .filter((p): p is string => Boolean(p && p.trim()))
    .map((p) => p.toLowerCase());
  if (parts.length === 0) return null;
  return parts.join(", ");
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  const { line1, line2 } = splitName(profile.displayName);
  const initials = initialsOf(profile.displayName);
  const location = formatLocation(profile);

  return (
    <motion.header variants={fadeUp} className="w-full">
      <div className="type-eyebrow text-paper-dim">
        <span className="text-paper-muted">01 /</span>{" "}
        <span className="text-paper">creator</span>
      </div>

      <div
        className="mt-12 flex items-start justify-between gap-8"
        style={{ minHeight: 120 }}
      >
        <h1
          className="type-display-xl text-paper flex-1 min-w-0"
          style={{ textWrap: "balance" }}
        >
          <span className="block">{line1}</span>
          {line2 && <span className="block">{line2}</span>}
        </h1>

        <div
          className="relative shrink-0"
          style={{
            width: 120,
            height: 120,
            background: "var(--ink-1)",
            border: "1px solid var(--paper)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              outline: "1px solid var(--line)",
              outlineOffset: -4,
            }}
            aria-hidden
          />
          {profile.avatar ? (
            <Image
              src={profile.avatar}
              alt={profile.displayName}
              fill
              sizes="120px"
              className="object-cover"
            />
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center text-paper type-display-m"
              aria-hidden
            >
              {initials}
            </div>
          )}
        </div>
      </div>

      {profile.isVerified && (
        <div className="mt-6 flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block"
            style={{
              width: 8,
              height: 8,
              background: "var(--sage)",
              borderRadius: 0,
            }}
          />
          <span className="type-eyebrow text-paper">verified</span>
        </div>
      )}

      <hr className="rule-line mt-10" />

      {location && (
        <div className="mt-6 type-body-m text-paper-dim lowercase">
          {location}
        </div>
      )}
    </motion.header>
  );
}
