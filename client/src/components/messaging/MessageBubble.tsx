// ABOUTME: Single message bubble component with own/other alignment and read receipts.
// ABOUTME: Uses Editorial Noir inline styles with sharp 0px radius and fadeUp motion.

'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import type { Message } from '@/types/messaging';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      variants={fadeUp}
      style={{
        display: 'flex',
        justifyContent: isOwn ? 'flex-end' : 'flex-start',
        width: '100%',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '12px 16px',
          borderRadius: 0,
          background: isOwn ? 'var(--ink-2)' : 'var(--ink-1)',
        }}
      >
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--paper)',
            margin: 0,
            wordBreak: 'break-word',
          }}
        >
          {message.content}
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 4,
            justifyContent: 'flex-end',
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: 'var(--paper-muted)',
            }}
          >
            {timestamp}
          </span>
          {isOwn && message.readAt && (
            <span
              style={{
                fontSize: 10,
                color: 'var(--paper-muted)',
              }}
            >
              Read
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
