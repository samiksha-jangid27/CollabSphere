// ABOUTME: Shared messaging TypeScript types mirroring the server Conversation and Message model shapes.
// ABOUTME: Imported by messagingService, hooks, and all messaging UI components.

export interface Participant {
  _id: string;
  username?: string;
  displayName?: string;
  avatar?: string;
}

export interface LastMessage {
  content: string;
  senderId: string;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  participants: Participant[];
  collaborationRequestId: string;
  lastMessage?: LastMessage;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageInput {
  content: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}
