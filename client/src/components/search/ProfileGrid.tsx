// ABOUTME: Responsive grid of profile result cards with skeleton loading and empty state.
// ABOUTME: 1 col mobile / 2 col 640px+ / 3 col 1024px+. Framer Motion stagger on reveal.

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { RequestForm } from '@/components/collaboration/RequestForm';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { useAuth } from '@/hooks/useAuth';
import type { Profile } from '@/types/profile';

interface ProfileGridProps {
  profiles: Profile[];
  isLoading?: boolean;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--ink-1)',
        border: '1px solid var(--line)',
        padding: 24,
      }}
      aria-hidden
    >
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: 'var(--ink-2)',
            flexShrink: 0,
            animation: 'pulse 1.8s ease-in-out infinite',
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              height: 18,
              width: '60%',
              background: 'var(--ink-2)',
              animation: 'pulse 1.8s ease-in-out infinite 0.1s',
            }}
          />
          <div
            style={{
              height: 13,
              width: '40%',
              background: 'var(--ink-2)',
              animation: 'pulse 1.8s ease-in-out infinite 0.2s',
            }}
          />
        </div>
      </div>
      <div
        style={{
          height: 1,
          background: 'var(--line-subtle)',
          margin: '16px 0',
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div
          style={{
            height: 12,
            width: '75%',
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.15s',
          }}
        />
        <div
          style={{
            height: 12,
            width: '50%',
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.25s',
          }}
        />
      </div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const { user, isAuthenticated } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const initials = initialsOf(profile.displayName);
  const location = profile.location
    ? [profile.location.city, profile.location.country].filter(Boolean).join(', ')
    : null;
  const niches = profile.niche.slice(0, 3);
  const isBrand = user?.role === 'brand';
  const showSendButton = isAuthenticated && isBrand && user?._id !== profile.userId;

  return (
    <motion.article variants={fadeUp}>
      <Link
        href={`/profile/${profile._id}`}
        style={{ display: 'block', textDecoration: 'none' }}
      >
        <div
          style={{
            background: 'var(--ink-1)',
            border: '1px solid var(--line)',
            padding: 24,
            cursor: 'pointer',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line-strong)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--line)';
          }}
        >
          {/* Avatar + name row */}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 56,
                height: 56,
                background: 'var(--ink-2)',
                border: '1px solid var(--line)',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {profile.avatar ? (
                <Image
                  src={profile.avatar}
                  alt={profile.displayName}
                  fill
                  sizes="56px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--paper-dim)',
                    fontSize: 18,
                    fontWeight: 500,
                    fontFamily: 'var(--font-display)',
                  }}
                  aria-hidden
                >
                  {initials}
                </div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: 'var(--paper)',
                  fontSize: 16,
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile.displayName}
              </div>
              {profile.isVerified && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: 'inline-block',
                      width: 6,
                      height: 6,
                      background: 'var(--sage)',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: 'var(--sage)',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    verified
                  </span>
                </div>
              )}
            </div>
          </div>

          <hr
            style={{
              border: 'none',
              borderTop: '1px solid var(--line-subtle)',
              margin: '16px 0',
            }}
          />

          {/* Location */}
          {location && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--paper-dim)',
                fontFamily: 'var(--font-body)',
                textTransform: 'lowercase',
                marginBottom: 10,
              }}
            >
              {location}
            </div>
          )}

          {/* Niche tags */}
          {niches.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {niches.map((n) => (
                <span
                  key={n}
                  style={{
                    background: 'var(--ink-2)',
                    border: '1px solid var(--line)',
                    borderRadius: 0,
                    padding: '3px 8px',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: 'var(--paper-muted)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          )}

          {/* Follower count */}
          {profile.followerCount > 0 && (
            <div
              style={{
                marginTop: 14,
                fontSize: 12,
                color: 'var(--paper-muted)',
                fontFamily: 'var(--font-body)',
                marginBottom: showSendButton ? 16 : 0,
              }}
            >
              <span style={{ color: 'var(--amber)', fontWeight: 600 }}>
                {profile.followerCount >= 1_000_000
                  ? `${(profile.followerCount / 1_000_000).toFixed(1)}M`
                  : profile.followerCount >= 1_000
                  ? `${(profile.followerCount / 1_000).toFixed(0)}K`
                  : profile.followerCount.toString()}
              </span>
              {' '}followers
            </div>
          )}

          {/* Send Request Button */}
          {showSendButton && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowRequestForm(true)}
              style={{ width: '100%' }}
            >
              Send Request
            </Button>
          )}
        </div>
      </Link>

      {/* Request Form Modal */}
      <RequestForm
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
        onSuccess={() => {
          // Optional: show success toast, refresh list, etc.
        }}
        preselectedCreatorId={profile.userId}
      />
    </motion.article>
  );
}

export function ProfileGrid({ profiles, isLoading = false }: ProfileGridProps) {
  if (isLoading) {
    return (
      <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 1,
            background: 'var(--line-subtle)',
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </>
    );
  }

  if (profiles.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 12,
          padding: '48px 0',
          borderTop: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: 'var(--paper-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          No results
        </div>
        <p
          style={{
            fontSize: 15,
            color: 'var(--paper-dim)',
            fontFamily: 'var(--font-body)',
            margin: 0,
            maxWidth: 400,
          }}
        >
          No creators found. Try different filters.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 1,
        background: 'var(--line-subtle)',
      }}
    >
      {profiles.map((profile) => (
        <ProfileCard key={profile._id} profile={profile} />
      ))}
    </motion.div>
  );
}
