// ABOUTME: Authenticated user's own profile view — sidebar layout with avatar, completeness, and edit CTA.
// ABOUTME: Two states: empty (no profile) and full (sidebar + bio/niche content). Mobile-first stacked.

"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { CompletenessIndicator } from "@/components/profile/CompletenessIndicator";
import { ProfileBio } from "@/components/profile/ProfileBio";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export default function ProfileMePage() {
  const { profile, loading, error, hasProfile } = useProfile();

  if (loading) {
    return <div className="type-eyebrow text-paper-muted">loading</div>;
  }

  if (error) {
    return (
      <div className="max-w-[64ch]">
        <div className="type-eyebrow text-paper-muted">
          <span>00 /</span> <span className="text-rust">error</span>
        </div>
        <p className="mt-8 type-body-l text-paper">{error}</p>
      </div>
    );
  }

  if (!hasProfile || !profile) {
    return <EmptyState />;
  }

  const initials = initialsOf(profile.displayName);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      <div className="flex flex-col gap-12 lg:flex-row lg:gap-16 lg:items-start">

        {/* Sidebar */}
        <motion.aside
          variants={fadeUp}
          className="lg:w-56 lg:shrink-0 lg:sticky lg:top-28"
        >
          {/* Avatar */}
          <div
            className="relative mx-auto lg:mx-0"
            style={{
              width: 120,
              height: 120,
              background: "var(--ink-1)",
              border: "1px solid var(--paper)",
              flexShrink: 0,
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

          {/* Name + role */}
          <div className="mt-6 text-center lg:text-left">
            <h1
              className="font-display text-paper leading-tight"
              style={{ fontSize: "clamp(20px, 3vw, 26px)", fontWeight: 600 }}
            >
              {profile.displayName}
            </h1>
            <div className="mt-2 type-eyebrow text-paper-muted">creator</div>
            {profile.isVerified && (
              <div className="mt-3 flex items-center justify-center lg:justify-start gap-2">
                <span
                  aria-hidden
                  style={{ width: 7, height: 7, background: "var(--sage)", display: "inline-block" }}
                />
                <span className="type-eyebrow text-paper" style={{ fontSize: 10 }}>verified</span>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="rule-line mt-6" />

          {/* Completeness */}
          <div className="mt-6">
            <CompletenessIndicator value={profile.profileCompleteness} />
          </div>

          {/* Edit Profile CTA */}
          <div className="mt-6">
            <Link
              href="/profile/me/edit"
              className="type-eyebrow block text-center lg:text-left"
              style={{
                padding: "10px 16px",
                border: "1px solid var(--paper)",
                background: "transparent",
                color: "var(--paper)",
                letterSpacing: "0.08em",
                transition: "background 150ms linear, color 150ms linear",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--paper)";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-0)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "var(--paper)";
              }}
            >
              Edit Profile
            </Link>
          </div>
        </motion.aside>

        {/* Main content */}
        <motion.div variants={fadeUp} className="flex-1 min-w-0">
          <ProfileBio profile={profile} />
        </motion.div>

      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full max-w-[64ch]"
    >
      <motion.div variants={fadeUp} className="type-eyebrow text-paper-dim">
        <span className="text-paper-muted">01 /</span>{" "}
        <span className="text-paper">empty</span>
      </motion.div>

      <motion.h1
        variants={fadeUp}
        className="type-display-l text-paper mt-12"
        style={{ textWrap: "balance" }}
      >
        No profile yet.
      </motion.h1>

      <motion.hr
        variants={fadeUp}
        className="rule-line mt-12"
        style={{ width: 128 }}
      />

      <motion.div variants={fadeUp} className="mt-12">
        <Link
          href="/profile/me/edit"
          className="type-body-l text-paper inline-block"
          style={{
            textDecoration: "underline",
            textUnderlineOffset: "6px",
            textDecorationColor: "var(--amber)",
            textDecorationThickness: "1px",
            transition: "color 150ms linear",
          }}
        >
          Create one.
        </Link>
      </motion.div>
    </motion.div>
  );
}
