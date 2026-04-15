// ABOUTME: Authenticated user's own profile view — Editorial Noir magazine spread, staggered reveal.
// ABOUTME: Two states: empty (no profile) and full (completeness, header, bio), both declarative.

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { CompletenessIndicator } from "@/components/profile/CompletenessIndicator";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";

export default function ProfileMePage() {
  const { profile, loading, error, hasProfile } = useProfile();

  if (loading) {
    return (
      <div className="type-eyebrow text-paper-muted">loading</div>
    );
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

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      <div className="flex items-start justify-between gap-8">
        <div className="flex-1 min-w-0">
          <CompletenessIndicator value={profile.profileCompleteness} />
        </div>
        <Link
          href="/profile/me/edit"
          className="type-eyebrow text-paper-dim shrink-0 hover:text-paper"
          style={{
            transition: "color 150ms linear",
            textDecoration: "underline",
            textUnderlineOffset: "6px",
            textDecorationColor: "var(--amber)",
            textDecorationThickness: "1px",
          }}
        >
          edit profile
        </Link>
      </div>

      <div style={{ height: 96 }} />

      <ProfileHeader profile={profile} />

      <div style={{ height: 96 }} />

      <ProfileBio profile={profile} />
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
