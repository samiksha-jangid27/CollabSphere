// ABOUTME: Bio and niche section for the profile view — eyebrow headings, body-l copy, sharp pills.
// ABOUTME: Niche tags are 0-radius pills with hover lift, no card wrapper, full editorial treatment.

"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import type { Profile } from "@/types/profile";

interface ProfileBioProps {
  profile: Profile;
}

export function ProfileBio({ profile }: ProfileBioProps) {
  const bio = profile.bio?.trim() ?? "";
  const tags = [...(profile.niche ?? []), ...(profile.interests ?? [])]
    .map((t) => t.trim())
    .filter(Boolean);

  const showTagBlock = tags.length > 0;

  return (
    <motion.section variants={fadeUp} className="w-full">
      <div className="type-eyebrow text-paper-dim">
        <span className="text-paper-muted">02 /</span>{" "}
        <span className="text-paper">bio</span>
      </div>

      <p
        className={`mt-8 type-body-l ${
          bio ? "text-paper" : "text-paper-muted"
        }`}
        style={{ maxWidth: "64ch" }}
      >
        {bio || "No bio yet."}
      </p>

      {showTagBlock && (
        <div className="mt-16">
          <div className="type-eyebrow text-paper-dim">
            <span className="text-paper-muted">03 /</span>{" "}
            <span className="text-paper">niche</span>
          </div>

          <ul className="mt-8 flex flex-wrap gap-3" role="list">
            {tags.map((tag) => (
              <li key={tag}>
                <span
                  className="type-eyebrow inline-block text-paper"
                  style={{
                    padding: "6px 12px",
                    border: "1px solid var(--line)",
                    letterSpacing: "0.08em",
                    transition: "border-color 150ms linear, color 150ms linear",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--paper)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--line)";
                  }}
                >
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}
