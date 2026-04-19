// ABOUTME: Card displaying a collaboration request with sender/recipient, budget, deadline, and action buttons.
// ABOUTME: Status badge with color coding. Accept/Decline buttons visible only to request recipients (creators).

'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { fadeUp } from '@/lib/motion';
import type { CollaborationRequest } from '@/types/collaboration';

interface RequestCardProps {
  request: CollaborationRequest;
  showActions?: boolean; // True if user is the recipient (creator)
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onStartMessage?: (id: string) => void;
  isLoading?: boolean;
  isStartingMessage?: boolean;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Open':
      return 'var(--amber)';
    case 'Accepted':
      return 'var(--sage)'; // green
    case 'Declined':
      return 'var(--rust)'; // red
    case 'Closed':
      return 'var(--paper-muted)'; // gray
    case 'Pending':
      return 'var(--paper-dim)'; // dim
    default:
      return 'var(--paper-muted)';
  }
}

export function RequestCard({
  request,
  showActions = false,
  onAccept,
  onDecline,
  onStartMessage,
  isLoading = false,
  isStartingMessage = false,
}: RequestCardProps) {
  const deadline = new Date(request.deadline);
  const deadlineStr = deadline.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <motion.article variants={fadeUp}>
      <div
        style={{
          background: 'var(--ink-1)',
          border: '1px solid var(--line)',
          padding: 24,
        }}
      >
        {/* Header: Title + Status Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--paper)',
              fontFamily: 'var(--font-body)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {request.title}
          </h3>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              padding: '3px 8px',
              background: getStatusColor(request.status) + '15',
              border: `1px solid ${getStatusColor(request.status)}`,
              borderRadius: 0,
            }}
          >
            <span
              aria-hidden
              style={{
                display: 'inline-block',
                width: 4,
                height: 4,
                background: getStatusColor(request.status),
              }}
            />
            <span
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: getStatusColor(request.status),
                fontFamily: 'var(--font-body)',
              }}
            >
              {request.status}
            </span>
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            margin: '0 0 16px 0',
            fontSize: 13,
            color: 'var(--paper-dim)',
            fontFamily: 'var(--font-body)',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {request.description}
        </p>

        <hr style={{ border: 'none', borderTop: '1px solid var(--line-subtle)', margin: '16px 0' }} />

        {/* Budget + Deadline */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--paper-muted)',
                fontFamily: 'var(--font-body)',
                marginBottom: 4,
              }}
            >
              Budget
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--amber)',
                fontFamily: 'var(--font-body)',
              }}
            >
              ${request.budget.toLocaleString()}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--paper-muted)',
                fontFamily: 'var(--font-body)',
                marginBottom: 4,
              }}
            >
              Deadline
            </div>
            <div
              style={{
                fontSize: 14,
                color: 'var(--paper)',
                fontFamily: 'var(--font-body)',
              }}
            >
              {deadlineStr}
            </div>
          </div>
        </div>

        {/* Action Buttons — only for Open requests */}
        {showActions && request.status === 'Open' && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Button
              variant="primary"
              size="sm"
              isLoading={isLoading}
              onClick={() => onAccept?.(request._id)}
              style={{ flex: 1 }}
            >
              Accept
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isLoading={isLoading}
              onClick={() => onDecline?.(request._id)}
              style={{ flex: 1 }}
            >
              Decline
            </Button>
          </div>
        )}

        {onStartMessage && (
          <Button
            variant="secondary"
            size="sm"
            isLoading={isStartingMessage}
            onClick={() => onStartMessage(request._id)}
            style={{ width: '100%' }}
          >
            Start message
          </Button>
        )}
      </div>
    </motion.article>
  );
}
