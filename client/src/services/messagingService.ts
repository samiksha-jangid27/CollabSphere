// ABOUTME: API client for messaging endpoints — conversations list, single conversation, messages, send, and mark read.
// ABOUTME: Follows the same named-export object pattern as collaborationService.ts and profileService.ts.

import api from './api';
import type { Conversation, Message, SendMessageInput, PaginationInfo } from '@/types/messaging';

interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export const messagingService = {
  async getConversations(page: number = 1, limit: number = 20): Promise<PaginatedResponse<Conversation>> {
    const { data } = await api.get('/messages/conversations', { params: { page, limit } });
    return data.data;
  },

  async getConversation(id: string): Promise<Conversation> {
    const { data } = await api.get(`/messages/conversations/${id}`);
    return data.data;
  },

  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<PaginatedResponse<Message>> {
    const { data } = await api.get(`/messages/conversations/${conversationId}/messages`, { params: { page, limit } });
    return data.data;
  },

  async sendMessage(conversationId: string, input: SendMessageInput): Promise<Message> {
    const { data } = await api.post(`/messages/conversations/${conversationId}/messages`, input);
    return data.data;
  },

  async markAsRead(conversationId: string): Promise<{ modifiedCount: number }> {
    const { data } = await api.patch(`/messages/conversations/${conversationId}/read`);
    return data.data;
  },

  async getOrCreateByCollab(collabId: string): Promise<Conversation> {
    const { data } = await api.get(`/messages/conversations/by-collab/${collabId}`);
    return data.data.conversation;
  },
};
