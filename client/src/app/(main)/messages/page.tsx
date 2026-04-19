// ABOUTME: Messages page with two-panel layout: conversation list and chat window.
// ABOUTME: Desktop shows both panels side by side; mobile toggles between list and chat views.

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useMessaging } from '@/hooks/useMessaging';
import { useSocket } from '@/hooks/useSocket';
import ConversationList from '@/components/messaging/ConversationList';
import ChatWindow from '@/components/messaging/ChatWindow';
import type { Message } from '@/types/messaging';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const {
    conversations,
    conversationsPagination,
    conversationsLoading,
    messages,
    messagesPagination,
    messagesLoading,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    appendMessage,
    handleMessagesRead,
    incrementUnread,
  } = useMessaging();

  const { isConnected, joinConversation, leaveConversation, on, off } = useSocket();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  const currentUserId = user?._id ?? '';

  // Keep a ref so socket handlers always see the latest activeConversationId
  const activeConversationIdRef = useRef(activeConversationId);
  activeConversationIdRef.current = activeConversationId;

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Room management: join/leave when activeConversationId changes
  useEffect(() => {
    if (!isConnected || !activeConversationId) return;
    joinConversation(activeConversationId);
    return () => {
      leaveConversation(activeConversationId);
    };
  }, [activeConversationId, isConnected, joinConversation, leaveConversation]);

  // Listen for incoming messages. new_message reaches users who joined the
  // conversation room (active chat view); message_notification reaches the
  // user's personal room so sidebar unread + lastMessage update even for
  // conversations that are not currently open.
  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const message = args[0] as Message;
      const currentActive = activeConversationIdRef.current;
      appendMessage(message, currentActive);
      if (message.conversationId === currentActive) {
        if (message.senderId !== currentUserId) {
          markAsRead(message.conversationId);
        }
      } else if (message.senderId !== currentUserId) {
        incrementUnread(message.conversationId);
      }
    };
    on('new_message', handler);
    on('message_notification', handler);
    return () => {
      off('new_message', handler);
      off('message_notification', handler);
    };
  }, [on, off, appendMessage, incrementUnread, markAsRead, currentUserId]);

  // Listen for messages_read events
  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const payload = args[0] as { conversationId: string; readerId: string };
      if (payload.conversationId === activeConversationIdRef.current) {
        handleMessagesRead(payload.conversationId, payload.readerId);
      }
    };
    on('messages_read', handler);
    return () => {
      off('messages_read', handler);
    };
  }, [on, off, handleMessagesRead]);

  // Auto-select conversation from URL search param
  useEffect(() => {
    const conversationParam = searchParams.get('conversation');
    if (conversationParam && !activeConversationId) {
      setActiveConversationId(conversationParam);
      fetchMessages(conversationParam);
      setShowChat(true);
    }
  }, [searchParams, activeConversationId, fetchMessages]);

  const handleSelectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      fetchMessages(id);
      setShowChat(true);
    },
    [fetchMessages]
  );

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!activeConversationId) return;
      await sendMessage(activeConversationId, content);
    },
    [activeConversationId, sendMessage]
  );

  const handleMarkAsRead = useCallback(() => {
    if (activeConversationId) {
      markAsRead(activeConversationId);
    }
  }, [activeConversationId, markAsRead]);

  const handleBack = useCallback(() => {
    setShowChat(false);
  }, []);

  // Derive participant name from active conversation
  const activeConversation = conversations.find((c) => c._id === activeConversationId);
  const otherParticipant = activeConversation?.participants.find(
    (p) => p._id !== currentUserId
  );
  const participantName = otherParticipant?.displayName ?? otherParticipant?.username;

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 72px)',
        margin: 'calc(-1 * clamp(48px, 9vw, 96px)) calc(-1 * clamp(24px, 5vw, 64px)) calc(-1 * clamp(48px, 9vw, 96px))',
        borderTop: '1px solid var(--line-subtle)',
      }}
    >
      {/* Desktop layout: both panels */}
      <div
        style={{
          width: 300,
          flexShrink: 0,
          borderRight: '1px solid var(--line)',
          overflow: 'hidden',
        }}
        className="hidden md:flex md:flex-col"
      >
        <ConversationList
          conversations={conversations}
          loading={conversationsLoading}
          currentUserId={currentUserId}
          activeConversationId={activeConversationId ?? undefined}
          onSelectConversation={handleSelectConversation}
          pagination={conversationsPagination}
          onPageChange={(page) => fetchConversations(page)}
        />
      </div>

      <div
        style={{ flex: 1, overflow: 'hidden' }}
        className="hidden md:flex md:flex-col"
      >
        {activeConversationId ? (
          <ChatWindow
            messages={messages}
            messagesLoading={messagesLoading}
            currentUserId={currentUserId}
            onSendMessage={handleSendMessage}
            onMarkAsRead={handleMarkAsRead}
            participantName={participantName}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              background: 'var(--ink-0)',
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: 'var(--paper-muted)',
                margin: 0,
              }}
            >
              Select a conversation to start messaging.
            </p>
          </div>
        )}
      </div>

      {/* Mobile layout: toggle between list and chat */}
      <div
        style={{ flex: 1, overflow: 'hidden' }}
        className="flex flex-col md:hidden"
      >
        {showChat && activeConversationId ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <button
              onClick={handleBack}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '1px solid var(--line-subtle)',
                color: 'var(--amber)',
                fontSize: 13,
                fontWeight: 600,
                padding: '12px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                flexShrink: 0,
              }}
            >
              &larr; Back
            </button>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatWindow
                messages={messages}
                messagesLoading={messagesLoading}
                currentUserId={currentUserId}
                onSendMessage={handleSendMessage}
                onMarkAsRead={handleMarkAsRead}
                participantName={participantName}
              />
            </div>
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            loading={conversationsLoading}
            currentUserId={currentUserId}
            activeConversationId={activeConversationId ?? undefined}
            onSelectConversation={handleSelectConversation}
            pagination={conversationsPagination}
            onPageChange={(page) => fetchConversations(page)}
          />
        )}
      </div>
    </div>
  );
}
