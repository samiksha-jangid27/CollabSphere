// ABOUTME: Global in-app notifier that listens for message_notification socket events and shows toasts.
// ABOUTME: Mounted once inside the authenticated layout; click a toast to jump to that conversation.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { baseTransition } from '@/lib/motion';

interface NotificationPayload {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName?: string | null;
  content: string;
  createdAt: string;
}

interface Toast {
  id: string;
  conversationId: string;
  senderName: string;
  content: string;
}

const TOAST_TTL_MS = 5000;
const MAX_VISIBLE = 3;

export default function MessageNotifier() {
  const { user } = useAuth();
  const { on, off } = useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const payload = args[0] as NotificationPayload;

      if (!payload || payload.senderId === user?._id) return;

      // Skip toasts while the user is on the messages page; they already
      // have in-page signals (live append, unread counter).
      if (pathname.startsWith('/messages')) return;

      const toast: Toast = {
        id: payload._id,
        conversationId: payload.conversationId,
        senderName: payload.senderName?.trim() ? payload.senderName : 'New message',
        content: payload.content,
      };

      setToasts((prev) => {
        if (prev.some((t) => t.id === toast.id)) return prev;
        const next = [...prev, toast];
        return next.slice(-MAX_VISIBLE);
      });

      window.setTimeout(() => dismiss(toast.id), TOAST_TTL_MS);
    };

    on('message_notification', handler);
    return () => {
      off('message_notification', handler);
    };
  }, [on, off, user?._id, pathname, dismiss]);

  const openConversation = useCallback(
    (conversationId: string, id: string) => {
      dismiss(id);
      router.push(`/messages?conversation=${conversationId}`);
    },
    [dismiss, router]
  );

  return (
    <div
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.button
            key={toast.id}
            type="button"
            onClick={() => openConversation(toast.conversationId, toast.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={baseTransition}
            style={{
              pointerEvents: 'auto',
              width: 320,
              textAlign: 'left',
              background: 'var(--ink-1)',
              color: 'var(--paper)',
              border: '1px solid var(--line)',
              borderLeft: '2px solid var(--amber)',
              borderRadius: 0,
              padding: '14px 16px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--paper-muted)',
                marginBottom: 6,
              }}
            >
              New message
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {toast.senderName}
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--paper-dim)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}
            >
              {toast.content}
            </div>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
