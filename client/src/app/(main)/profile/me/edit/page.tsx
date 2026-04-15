// ABOUTME: Editorial Noir profile edit page wiring useProfile to the controlled ProfileEditForm.
// ABOUTME: Branches create vs update copy, refetches profile after avatar uploads to resync state.

"use client";

import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function EditProfilePage() {
  const { profile, loading, error, hasProfile, refetch } = useProfile();

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

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full"
      style={{ maxWidth: 560 }}
    >
      <motion.div
        variants={fadeUp}
        className="type-eyebrow text-paper-dim"
      >
        <span className="text-paper-muted">01 /</span>{" "}
        <span className="text-paper">{hasProfile ? "edit" : "create"}</span>
      </motion.div>

      <motion.h1
        variants={fadeUp}
        className="type-display-l text-paper mt-12"
        style={{ textWrap: "balance" }}
      >
        {hasProfile ? "Edit profile." : "Create profile."}
      </motion.h1>

      <motion.hr
        variants={fadeUp}
        className="rule-line mt-12"
        style={{ width: 128 }}
      />

      <div style={{ height: 64 }} />

      <ProfileEditForm initial={profile} onAvatarUploaded={refetch} />
    </motion.div>
  );
}
