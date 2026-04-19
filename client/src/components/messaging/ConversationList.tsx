// ABOUTME: Sidebar listing conversations with unread badges and relative timestamps.
// ABOUTME: Uses Editorial Noir hairline separators, sharp styling, and staggered motion.

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';
import type { Conversation, PaginationInfo } from '@/types/messaging';

interface ConversationListProps {
  conversations: Conversation[];
  loading: boolean;
  currentUserId: string;
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function ConversationList({
  conversations,
  loading,
  currentUserId,
  activeConversationId,
  onSelectConversation,
  pagination,
  onPageChange,
}: ConversationListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--ink-0)',
      }}
    >
      {/* Header */}
      <div style={{ padding: 24 }}>
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            color: 'var(--paper-muted)',
            textTransform: 'uppercase' as const,
          }}
        >
          04 / MESSAGES
        </span>
      </div>

      {/* Conversation list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--line)',
                }}
              >
                <div
                  style={{
                    height: 14,
                    width: '60%',
                    background: 'var(--ink-2)',
                    borderRadius: 0,
                    marginBottom: 8,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    height: 13,
                    width: '80%',
                    background: 'var(--ink-2)',
                    borderRadius: 0,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          </div>
        ) : conversations.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: 24,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--paper-dim)',
                margin: 0,
              }}
            >
              No conversations yet.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {conversations.map((conv) => {
              const otherParticipant = conv.participants.find(
                (p) => p._id !== currentUserId
              );
              const isActive = conv._id === activeConversationId;
              const isHovered = hoveredId === conv._id;

              return (
                <motion.div
                  key={conv._id}
                  variants={fadeUp}
                  onClick={() => onSelectConversation(conv._id)}
                  onMouseEnter={() => setHoveredId(conv._id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--line)',
                    background:
                      isActive || isHovered ? 'var(--ink-1)' : 'transparent',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--paper)',
                      }}
                    >
                      {otherParticipant?.displayName ?? otherParticipant?.username ?? 'Unknown'}
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {conv.lastMessage && (
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--paper-muted)',
                          }}
                        >
                          {formatRelativeTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                      {conv.unreadCount > 0 && (
                        <span
                          style={{
                            background: 'var(--amber)',
                            color: 'var(--ink-0)',
                            fontSize: 10,
                            fontWeight: 700,
                            minWidth: 18,
                            height: 18,
                            borderRadius: 9,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                          }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  {conv.lastMessage && (
                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--paper-dim)',
                        marginTop: 4,
                        margin: '4px 0 0 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                      }}
                    >
                      {conv.lastMessage.content}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            style={{
              background: 'none',
              border: '1px solid var(--line)',
              color:
                pagination.page <= 1
                  ? 'var(--paper-muted)'
                  : 'var(--paper)',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 0,
              cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
              opacity: pagination.page <= 1 ? 0.5 : 1,
            }}
          >
            Prev
          </button>
          <span
            style={{
              fontSize: 12,
              color: 'var(--paper-dim)',
            }}
          >
            Page {pagination.page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={!pagination.hasNext}
            style={{
              background: 'none',
              border: '1px solid var(--line)',
              color: !pagination.hasNext
                ? 'var(--paper-muted)'
                : 'var(--paper)',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 0,
              cursor: !pagination.hasNext ? 'not-allowed' : 'pointer',
              opacity: !pagination.hasNext ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
