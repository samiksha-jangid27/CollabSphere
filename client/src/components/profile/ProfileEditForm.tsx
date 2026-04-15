// ABOUTME: Controlled create/update form for Editorial Noir profile pages with staggered reveal.
// ABOUTME: Switches copy and submit handler based on whether an initial profile is provided.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { profileService } from "@/services/profileService";
import type {
  CreateProfileInput,
  Profile,
} from "@/types/profile";
import { NicheSelector } from "./NicheSelector";
import { AvatarUpload } from "./AvatarUpload";

const BIO_MAX = 500;

interface ProfileEditFormProps {
  initial?: Profile | null;
  onAvatarUploaded?: () => void;
  hideAvatar?: boolean;
}

export function ProfileEditForm({ initial, onAvatarUploaded, hideAvatar }: ProfileEditFormProps) {
  const router = useRouter();
  const isUpdate = Boolean(initial);

  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [niche, setNiche] = useState<string[]>(initial?.niche ?? []);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(
    initial?.avatar
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayNameFocused, setDisplayNameFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);

  const bioRemaining = BIO_MAX - bio.length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const payload: CreateProfileInput = {
      displayName: displayName.trim(),
      bio: bio.trim() || undefined,
      niche,
    };

    if (!payload.displayName) {
      setError("Display name is required.");
      return;
    }

    setSubmitting(true);
    try {
      if (isUpdate) {
        await profileService.update(payload);
      } else {
        await profileService.create(payload);
      }
      router.push("/profile/me");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      setError(
        axiosErr.response?.data?.error?.message ?? "Failed to save."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.form
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      onSubmit={onSubmit}
      className="w-full"
      noValidate
    >
      {isUpdate && !hideAvatar && (
        <motion.div variants={fadeUp} className="mb-12">
          <AvatarUpload
            currentUrl={avatarUrl}
            onUploaded={(url) => {
              setAvatarUrl(url);
              onAvatarUploaded?.();
            }}
          />
        </motion.div>
      )}

      <motion.div variants={fadeUp} className="mb-12">
        <label className="block">
          <span className="type-label text-paper-dim block uppercase">
            Display name
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onFocus={() => setDisplayNameFocused(true)}
            onBlur={() => setDisplayNameFocused(false)}
            placeholder="your name"
            required
            maxLength={120}
            className="type-body-l text-paper mt-3 block w-full bg-transparent py-2 outline-none placeholder:text-paper-muted"
            style={{
              borderBottom: `1px solid ${displayNameFocused ? "var(--amber)" : "var(--line)"}`,
              transition: "border-color 150ms linear",
            }}
          />
        </label>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-12">
        <label className="block">
          <span className="type-label text-paper-dim block uppercase">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
            onFocus={() => setBioFocused(true)}
            onBlur={() => setBioFocused(false)}
            placeholder="a short bio"
            rows={4}
            className="type-body-l text-paper mt-3 block w-full resize-none bg-transparent py-2 outline-none placeholder:text-paper-muted"
            style={{
              borderBottom: `1px solid ${bioFocused ? "var(--amber)" : "var(--line)"}`,
              transition: "border-color 150ms linear",
            }}
          />
          <span className="type-body-s text-paper-muted mt-2 block text-right">
            {bioRemaining} left
          </span>
        </label>
      </motion.div>

      <motion.div variants={fadeUp} className="mb-12">
        <span className="type-label text-paper-dim block uppercase">Niche</span>
        <div className="mt-4">
          <NicheSelector value={niche} onChange={setNiche} />
        </div>
      </motion.div>

      <motion.hr variants={fadeUp} className="rule-line my-12" />

      {error && (
        <motion.p
          variants={fadeUp}
          className="type-body-s text-rust mb-6"
          role="alert"
        >
          {error}
        </motion.p>
      )}

      <motion.div variants={fadeUp} className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="type-label uppercase"
          style={{
            padding: "14px 28px",
            borderRadius: 2,
            border: "1px solid var(--paper)",
            background: "var(--paper)",
            color: "var(--ink-0)",
            cursor: submitting ? "wait" : "pointer",
            transition: "background-color 150ms linear, border-color 150ms linear",
          }}
          onMouseEnter={(e) => {
            if (submitting) return;
            e.currentTarget.style.background = "var(--amber)";
            e.currentTarget.style.borderColor = "var(--amber)";
          }}
          onMouseLeave={(e) => {
            if (submitting) return;
            e.currentTarget.style.background = "var(--paper)";
            e.currentTarget.style.borderColor = "var(--paper)";
          }}
        >
          {submitting ? "Saving..." : isUpdate ? "Save" : "Create profile"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="type-label text-paper uppercase"
          style={{
            padding: "14px 28px",
            borderRadius: 2,
            border: "1px solid var(--line-strong)",
            background: "transparent",
            cursor: "pointer",
            transition: "background-color 150ms linear",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--ink-2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          Cancel
        </button>
      </motion.div>
    </motion.form>
  );
}
