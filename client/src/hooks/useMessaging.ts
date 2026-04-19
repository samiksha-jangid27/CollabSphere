// ABOUTME: Hook for messaging state management — conversations list, messages, send, and mark as read.
// ABOUTME: Manages two state concerns: conversations list with pagination and active conversation messages.

'use client';

import { useState, useCallback } from 'react';
import { messagingService } from '@/services/messagingService';
import type { Conversation, Message, PaginationInfo } from '@/types/messaging';

interface UseMessagingState {
  conversations: Conversation[];
  conversationsPagination: PaginationInfo;
  conversationsLoading: boolean;
  messages: Message[];
  messagesPagination: PaginationInfo;
  messagesLoading: boolean;
  error: string | null;
}

const defaultPagination: PaginationInfo = {
  page: 1,
  limit: 20,
  total: 0,
  hasNext: false,
};

export function useMessaging() {
  const [state, setState] = useState<UseMessagingState>({
    conversations: [],
    conversationsPagination: { ...defaultPagination },
    conversationsLoading: false,
    messages: [],
    messagesPagination: { ...defaultPagination, limit: 50 },
    messagesLoading: false,
    error: null,
  });

  const fetchConversations = useCallback(async (page: number = 1) => {
    setState((prev) => ({ ...prev, conversationsLoading: true, error: null }));
    try {
      const response = await messagingService.getConversations(page);
      setState((prev) => ({
        ...prev,
        conversations: response.data,
        conversationsPagination: response.pagination,
        conversationsLoading: false,
      }));
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        axiosErr.response?.data?.error?.message ?? 'Failed to fetch conversations';
      setState((prev) => ({
        ...prev,
        conversationsLoading: false,
        error: message,
        conversations: [],
      }));
    }
  }, []);

  const fetchMessages = useCallback(
    async (conversationId: string, page: number = 1) => {
      setState((prev) => ({ ...prev, messagesLoading: true, error: null }));
      try {
        const response = await messagingService.getMessages(conversationId, page);
        setState((prev) => ({
          ...prev,
          messages: [...response.data].reverse(),
          messagesPagination: response.pagination,
          messagesLoading: false,
        }));
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to fetch messages';
        setState((prev) => ({
          ...prev,
          messagesLoading: false,
          error: message,
          messages: [],
        }));
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (conversationId: string, content: string): Promise<Message> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        const newMessage = await messagingService.sendMessage(conversationId, { content });
        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
          conversations: prev.conversations.map((c) =>
            c._id === conversationId
              ? {
                  ...c,
                  lastMessage: {
                    content: newMessage.content,
                    senderId: newMessage.senderId,
                    createdAt: newMessage.createdAt,
                  },
                }
              : c
          ),
        }));
        return newMessage;
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { error?: { message?: string } } };
        };
        const message =
          axiosErr.response?.data?.error?.message ?? 'Failed to send message';
        setState((prev) => ({ ...prev, error: message }));
        throw new Error(message);
      }
    },
    []
  );

  const appendMessage = useCallback(
    (message: Message, activeConversationId: string | null) => {
      setState((prev) => {
        const updatedConversations = prev.conversations.map((c) =>
          c._id === message.conversationId
            ? {
                ...c,
                lastMessage: {
                  content: message.content,
                  senderId: message.senderId,
                  createdAt: message.createdAt,
                },
              }
            : c
        );

        // Only append to messages array if this is the active conversation
        const shouldAppend = message.conversationId === activeConversationId;
        const alreadyExists = prev.messages.some((m) => m._id === message._id);
        const updatedMessages =
          shouldAppend && !alreadyExists
            ? [...prev.messages, message]
            : prev.messages;

        return { ...prev, conversations: updatedConversations, messages: updatedMessages };
      });
    },
    []
  );

  const handleMessagesRead = useCallback(
    (conversationId: string, readerId: string) => {
      setState((prev) => {
        const now = new Date().toISOString();
        const updatedMessages = prev.messages.map((m) =>
          m.conversationId === conversationId &&
          m.senderId !== readerId &&
          !m.readAt
            ? { ...m, readAt: now }
            : m
        );
        return { ...prev, messages: updatedMessages };
      });
    },
    []
  );

  const incrementUnread = useCallback((conversationId: string) => {
    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      ),
    }));
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    setState((prev) => ({
      ...prev,
      error: null,
      conversations: prev.conversations.map((c) =>
        c._id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    }));
    try {
      await messagingService.markAsRead(conversationId);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { error?: { message?: string } } };
      };
      const message =
        axiosErr.response?.data?.error?.message ?? 'Failed to mark as read';
      setState((prev) => ({ ...prev, error: message }));
    }
  }, []);

  return {
    ...state,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    appendMessage,
    handleMessagesRead,
    incrementUnread,
  };
}
