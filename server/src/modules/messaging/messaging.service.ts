// ABOUTME: MessagingService — orchestrates business logic for conversations and messages.
// ABOUTME: Handles authorization (participant check), message sending, read marking, and pagination.

import { IConversation } from '../../models/Conversation';
import { IMessage } from '../../models/Message';
import { CollaborationRequest } from '../../models/CollaborationRequest';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { eventBus, APP_EVENTS } from '../../shared/EventBus';
import logger from '../../shared/logger';
import {
  IMessagingService,
  IMessagingRepository,
  SendMessageInput,
  MessageFilters,
  PaginatedResponse,
} from './messaging.interfaces';

export class MessagingService implements IMessagingService {
  constructor(private readonly repository: IMessagingRepository) {}

  async getConversations(userId: string, filters: MessageFilters): Promise<PaginatedResponse<IConversation>> {
    const { docs, total } = await this.repository.findConversationsByUser(userId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const withUnread = await Promise.all(
      docs.map(async (doc) => {
        const unreadCount = await this.repository.countUnread(doc._id.toString(), userId);
        const obj = doc.toObject ? doc.toObject() : { ...doc };
        return { ...obj, unreadCount } as IConversation;
      }),
    );

    return {
      data: withUnread,
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async getConversation(conversationId: string, userId: string): Promise<IConversation> {
    const conv = await this.repository.findConversationById(conversationId);

    if (!conv) {
      throw AppError.notFound('Conversation not found', ERROR_CODES.CONVERSATION_NOT_FOUND);
    }

    const isParticipant = conv.participants.some(
      (p) => p._id?.toString() === userId || p.toString() === userId,
    );

    if (!isParticipant) {
      throw AppError.forbidden('You are not a participant in this conversation', ERROR_CODES.CONVERSATION_UNAUTHORIZED);
    }

    return conv;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    filters: MessageFilters,
  ): Promise<PaginatedResponse<IMessage>> {
    await this.getConversation(conversationId, userId);

    const { docs, total } = await this.repository.findMessages(conversationId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    return {
      data: docs,
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async sendMessage(conversationId: string, senderId: string, input: SendMessageInput): Promise<IMessage> {
    await this.getConversation(conversationId, senderId);

    const message = await this.repository.createMessage({
      conversationId: conversationId as any,
      senderId: senderId as any,
      content: input.content,
    });

    await this.repository.updateConversationLastMessage(conversationId, {
      content: input.content,
      senderId,
      createdAt: message.createdAt,
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.getConversation(conversationId, userId);
    await this.repository.markMessagesAsRead(conversationId, userId);
  }

  async getOrCreateConversationByCollab(collabRequestId: string, userId: string): Promise<IConversation> {
    const collab = await CollaborationRequest.findById(collabRequestId);

    if (!collab) {
      throw AppError.notFound('Collaboration request not found', ERROR_CODES.COLLAB_REQUEST_NOT_FOUND);
    }

    const creatorId = collab.userId.toString();
    const brandId = collab.brandId.toString();

    if (userId !== creatorId && userId !== brandId) {
      throw AppError.forbidden(
        'You are not a participant in this collaboration',
        ERROR_CODES.CONVERSATION_UNAUTHORIZED,
      );
    }

    return this.createConversationForCollab(collabRequestId, creatorId, brandId);
  }

  async createConversationForCollab(
    collabRequestId: string,
    creatorId: string,
    brandId: string,
  ): Promise<IConversation> {
    const existing = await this.repository.findConversationByCollabId(collabRequestId);
    if (existing) {
      return existing;
    }

    return this.repository.createConversation({
      participants: [creatorId as any, brandId as any],
      collaborationRequestId: collabRequestId as any,
    });
  }

  static subscribeToEvents(instance: MessagingService): void {
    eventBus.on(APP_EVENTS.COLLAB_ACCEPTED, async (data: unknown) => {
      const { collabRequestId, creatorId, brandId } = data as {
        collabRequestId: string;
        creatorId: string;
        brandId: string;
      };

      try {
        await instance.createConversationForCollab(collabRequestId, creatorId, brandId);
      } catch (error) {
        logger.error('Failed to create conversation for accepted collab', { error, collabRequestId });
      }
    });
  }
}
