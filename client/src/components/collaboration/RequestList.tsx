// ABOUTME: Container for pagination controls and request cards grid with empty state and skeleton loading.
// ABOUTME: Responsive grid with pagination buttons (prev/next).

'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { RequestCard } from './RequestCard';
import { staggerContainer, fadeUp } from '@/lib/motion';
import type { CollaborationRequest } from '@/types/collaboration';

interface RequestListProps {
  requests: CollaborationRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  isLoading?: boolean;
  showActions?: boolean;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onPageChange?: (page: number) => void;
  actionLoading?: boolean;
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div
          style={{
            height: 18,
            width: '60%',
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: 18,
            width: '100px',
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.1s',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            height: 12,
            width: '100%',
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.15s',
          }}
        />
        <div
          style={{
            height: 12,
            width: '85%',
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.25s',
          }}
        />
      </div>

      <div style={{ borderTop: '1px solid var(--line-subtle)', margin: '16px 0' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div
          style={{
            height: 12,
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.2s',
          }}
        />
        <div
          style={{
            height: 12,
            background: 'var(--ink-2)',
            animation: 'pulse 1.8s ease-in-out infinite 0.3s',
          }}
        />
      </div>
    </div>
  );
}

export function RequestList({
  requests,
  pagination,
  isLoading = false,
  showActions = false,
  onAccept,
  onDecline,
  onPageChange,
  actionLoading = false,
}: RequestListProps) {
  if (isLoading) {
    return (
      <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 1,
            background: 'var(--line-subtle)',
            marginBottom: 32,
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

  if (requests.length === 0) {
    return (
      <motion.div variants={fadeUp}>
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
            No requests
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
            No collaboration requests to display.
          </p>
        </div>
      </motion.div>
    );
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const hasPrev = pagination.page > 1;
  const hasNext = pagination.hasNext;

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 1,
          background: 'var(--line-subtle)',
          marginBottom: 32,
        }}
      >
        {requests.map((request) => (
          <RequestCard
            key={request._id}
            request={request}
            showActions={showActions}
            onAccept={onAccept}
            onDecline={onDecline}
            isLoading={actionLoading}
          />
        ))}
      </motion.div>

      {/* Pagination Controls */}
      <motion.div
        variants={fadeUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          paddingTop: 32,
          borderTop: '1px solid var(--line)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--paper-dim)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Page {pagination.page} of {totalPages}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasPrev}
            onClick={() => onPageChange?.(pagination.page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasNext}
            onClick={() => onPageChange?.(pagination.page + 1)}
          >
            Next
          </Button>
        </div>
      </motion.div>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </>
  );
}
