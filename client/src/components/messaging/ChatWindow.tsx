// ABOUTME: Message thread with scrollable history, staggered motion, and input form.
// ABOUTME: Auto-scrolls to bottom on new messages and calls onMarkAsRead on mount.

'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';
import type { Message } from '@/types/messaging';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  messages: Message[];
  messagesLoading: boolean;
  currentUserId: string;
  onSendMessage: (content: string) => Promise<void>;
  onMarkAsRead: () => void;
  participantName?: string;
}

export default function ChatWindow({
  messages,
  messagesLoading,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  participantName,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const onMarkAsReadRef = useRef(onMarkAsRead);
  onMarkAsReadRef.current = onMarkAsRead;

  useEffect(() => {
    if (messages.length > 0) {
      onMarkAsReadRef.current();
    }
  }, [messages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      await onSendMessage(trimmed);
      setInputValue('');
    } finally {
      setSending(false);
    }
  };

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
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--paper)',
          }}
        >
          {participantName ?? ''}
        </span>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 24,
        }}
      >
        {messagesLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    width: i === 1 ? '50%' : '40%',
                    height: 48,
                    background: 'var(--ink-2)',
                    borderRadius: 0,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              </div>
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
          </div>
        ) : messages.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--paper-dim)',
                margin: 0,
              }}
            >
              No messages yet. Start the conversation.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                isOwn={msg.senderId === currentUserId}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            background: 'var(--ink-2)',
            color: 'var(--paper)',
            border: 'none',
            padding: '12px 16px',
            borderRadius: 0,
            fontSize: 14,
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid var(--amber)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || sending}
          style={{
            background: !inputValue.trim() || sending ? 'var(--amber-dim)' : 'var(--amber)',
            color: 'var(--ink-0)',
            fontSize: 13,
            fontWeight: 600,
            padding: '12px 20px',
            borderRadius: 0,
            border: 'none',
            cursor: !inputValue.trim() || sending ? 'not-allowed' : 'pointer',
            opacity: !inputValue.trim() || sending ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
