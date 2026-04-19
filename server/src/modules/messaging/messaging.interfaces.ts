// ABOUTME: IMessagingService and IMessagingRepository interfaces for the messaging module.
// ABOUTME: Defines DTOs, pagination types, and contracts for dependency inversion.

import { IConversation } from '../../models/Conversation';
import { IMessage } from '../../models/Message';

export interface SendMessageInput {
  content: string;
}

export interface MessageFilters {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface IMessagingService {
  getConversations(userId: string, filters: MessageFilters): Promise<PaginatedResponse<IConversation>>;
  getConversation(conversationId: string, userId: string): Promise<IConversation>;
  getMessages(conversationId: string, userId: string, filters: MessageFilters): Promise<PaginatedResponse<IMessage>>;
  sendMessage(conversationId: string, senderId: string, input: SendMessageInput): Promise<IMessage>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
  createConversationForCollab(collabRequestId: string, creatorId: string, brandId: string): Promise<IConversation>;
  getOrCreateConversationByCollab(collabRequestId: string, userId: string): Promise<IConversation>;
}

export interface IMessagingRepository {
  findConversationsByUser(userId: string, filters: MessageFilters): Promise<{ docs: IConversation[]; total: number }>;
  findConversationById(id: string): Promise<IConversation | null>;
  findConversationByCollabId(collabRequestId: string): Promise<IConversation | null>;
  createConversation(data: Partial<IConversation>): Promise<IConversation>;
  findMessages(conversationId: string, filters: MessageFilters): Promise<{ docs: IMessage[]; total: number }>;
  createMessage(data: Partial<IMessage>): Promise<IMessage>;
  updateConversationLastMessage(conversationId: string, message: { content: string; senderId: string; createdAt: Date }): Promise<void>;
  markMessagesAsRead(conversationId: string, recipientId: string): Promise<number>;
  countUnread(conversationId: string, userId: string): Promise<number>;
}
