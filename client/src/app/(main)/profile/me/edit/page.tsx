// ABOUTME: Profile edit page — sidebar (avatar upload + live name preview) next to form fields.
// ABOUTME: Back navigation at top, create vs update modes, two-column on desktop.

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function EditProfilePage() {
  const { profile, loading, error, hasProfile, refetch } = useProfile();

  if (loading) {
    return <div className="type-eyebrow text-paper-muted">loading</div>;
  }

  if (error) {
    return (
      <div className="max-w-[64ch]">
        <p className="type-body-l text-paper">{error}</p>
      </div>
    );
  }

  const isUpdate = hasProfile && Boolean(profile);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      {/* Back navigation */}
      <motion.div variants={fadeUp}>
        <Link
          href="/profile/me"
          className="type-eyebrow text-paper-muted inline-flex items-center gap-2 hover:text-paper"
          style={{ transition: "color 150ms linear" }}
        >
          <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>←</span>
          <span>Profile</span>
        </Link>
      </motion.div>

      {/* Page heading */}
      <motion.div variants={fadeUp} className="mt-8">
        <h1
          className="font-display text-paper leading-tight"
          style={{ fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 600 }}
        >
          {isUpdate ? "Edit profile." : "Create profile."}
        </h1>
        <hr className="rule-line mt-6" style={{ width: 80 }} />
      </motion.div>

      {/* Two-column layout */}
      <div className="mt-12 flex flex-col gap-12 lg:flex-row lg:gap-16 lg:items-start">

        {/* Left sidebar — avatar + hints */}
        {isUpdate && profile && (
          <motion.aside
            variants={fadeUp}
            className="lg:w-56 lg:shrink-0 lg:sticky lg:top-28"
          >
            <AvatarUpload
              currentUrl={profile.avatar}
              onUploaded={refetch}
            />

            <hr className="rule-line mt-8" />

            <div className="mt-6 space-y-3">
              <p className="type-body-s text-paper-muted">
                Your display name and bio appear on your public profile.
              </p>
              <p className="type-body-s text-paper-muted">
                Pick up to 5 niches that best describe your content.
              </p>
            </div>
          </motion.aside>
        )}

        {/* Right — form fields */}
        <motion.div
          variants={fadeUp}
          className="flex-1 min-w-0"
          style={{ maxWidth: 520 }}
        >
          <ProfileEditForm
            initial={profile}
            onAvatarUploaded={refetch}
            hideAvatar
          />
        </motion.div>

      </div>
    </motion.div>
  );
}
