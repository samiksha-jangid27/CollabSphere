// ABOUTME: Public profile view at /profile/[id] — fetches by route param and renders the Editorial Noir header and bio.
// ABOUTME: Brands can send collaboration requests; creators see view-only profile.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { profileService } from "@/services/profileService";
import { Button } from "@/components/ui/Button";
import { RequestForm } from "@/components/collaboration/RequestForm";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/types/profile";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileBio } from "@/components/profile/ProfileBio";
import { fadeUp, staggerContainer } from "@/lib/motion";

type FetchState =
  | { kind: "loading" }
  | { kind: "ready"; profile: Profile }
  | { kind: "notFound" }
  | { kind: "error"; message: string };

export default function ProfileByIdPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setState({ kind: "loading" });
    profileService
      .getById(id)
      .then((profile) => {
        if (!cancelled) setState({ kind: "ready", profile });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const axiosErr = err as {
          response?: {
            status?: number;
            data?: { error?: { message?: string } };
          };
        };
        if (axiosErr.response?.status === 404) {
          setState({ kind: "notFound" });
          return;
        }
        setState({
          kind: "error",
          message:
            axiosErr.response?.data?.error?.message ?? "Failed to load profile.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.kind === "loading") {
    return <div className="type-eyebrow text-paper-muted">loading</div>;
  }

  if (state.kind === "notFound") {
    return (
      <div className="w-full max-w-[64ch]">
        <div className="type-eyebrow text-paper-dim">
          <span className="text-paper-muted">00 /</span>{" "}
          <span className="text-paper">profile</span>
        </div>
        <h1
          className="type-display-l text-paper mt-12"
          style={{ textWrap: "balance" }}
        >
          Not found.
        </h1>
        <hr className="rule-line mt-12" style={{ width: 128 }} />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="w-full max-w-[64ch]">
        <div className="type-eyebrow text-paper-dim">
          <span className="text-paper-muted">00 /</span>{" "}
          <span className="text-rust">error</span>
        </div>
        <p className="mt-8 type-body-l text-paper">{state.message}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full"
    >
      <motion.div variants={fadeUp} className="type-eyebrow text-paper-muted">
        profile
      </motion.div>

      <div style={{ height: 96 }} />

      <ProfileHeader profile={state.profile} />

      <div style={{ height: 96 }} />

      <ProfileBio profile={state.profile} />

      {state.kind === "ready" && (() => {
        const isBrand = user?.role === "brand";
        const showSendButton =
          isAuthenticated && isBrand && user?._id !== state.profile.userId;

        return (
          <>
            {showSendButton && (
              <motion.div variants={fadeUp} style={{ marginTop: 48 }}>
                <Button
                  variant="primary"
                  onClick={() => setShowRequestForm(true)}
                >
                  Send Request
                </Button>
              </motion.div>
            )}

            <RequestForm
              isOpen={showRequestForm}
              onClose={() => setShowRequestForm(false)}
              onSuccess={() => {
                setShowRequestForm(false);
              }}
              preselectedCreatorId={state.profile.userId}
            />
          </>
        );
      })()}
    </motion.div>
  );
}
