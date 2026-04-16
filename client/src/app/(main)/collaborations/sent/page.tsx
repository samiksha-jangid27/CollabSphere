// ABOUTME: Sent page for collaboration requests — displays requests created and sent by brands.
// ABOUTME: Editorial Noir layout with status filter, request list, and pagination. No action buttons.

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RequestList } from '@/components/collaboration/RequestList';
import { useCollaboration } from '@/hooks/useCollaboration';
import { staggerContainer, fadeUp } from '@/lib/motion';

const STATUS_OPTIONS = ['', 'Open', 'Pending', 'Accepted', 'Declined', 'Closed'];

export default function SentPage() {
  const { requests, pagination, loading, getSent } = useCollaboration();
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    getSent(1, status || undefined);
  }, [status, getSent]);

  const handlePageChange = (page: number) => {
    getSent(page, status || undefined);
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 96px' }}
    >
      {/* Eyebrow + Headline */}
      <motion.div variants={fadeUp} style={{ marginBottom: 48 }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--paper-muted)',
            marginBottom: 16,
            display: 'flex',
            gap: 8,
          }}
        >
          <span style={{ color: 'var(--paper-muted)' }}>03 /</span>
          <span style={{ color: 'var(--paper)' }}>Sent</span>
        </div>
        <h1
          className="type-display-m"
          style={{ color: 'var(--paper)', margin: 0 }}
        >
          Sent requests
        </h1>
        <p
          style={{
            marginTop: 12,
            fontSize: 15,
            color: 'var(--paper-dim)',
            fontFamily: 'var(--font-body)',
            maxWidth: 480,
          }}
        >
          Track the status of collaboration requests you have sent to creators.
        </p>
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        variants={fadeUp}
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-end',
          marginBottom: 48,
        }}
      >
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
              color: 'var(--paper-muted)',
              fontFamily: 'var(--font-body)',
            }}
          >
            Filter by Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '0 12px',
              background: 'var(--ink-1)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              color: 'var(--paper)',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s',
            }}
            onFocus={(e) => {
              (e.target as HTMLSelectElement).style.borderColor = 'var(--amber)';
            }}
            onBlur={(e) => {
              (e.target as HTMLSelectElement).style.borderColor = 'var(--line)';
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt} style={{ background: 'var(--ink-0)', color: 'var(--paper)' }}>
                {opt || 'All Statuses'}
              </option>
            ))}
          </select>
        </div>
      </motion.div>

      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--line)',
          marginBottom: 32,
        }}
      />

      {/* Requests List */}
      <motion.div variants={fadeUp}>
        <RequestList
          requests={requests}
          pagination={pagination}
          isLoading={loading}
          showActions={false}
          onPageChange={handlePageChange}
        />
      </motion.div>
    </motion.div>
  );
}
