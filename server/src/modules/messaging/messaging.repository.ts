// ABOUTME: MessagingRepository — encapsulates all database queries for conversations and messages.
// ABOUTME: Extends BaseRepository for Conversation CRUD; adds message and read-status queries.

import { Types } from 'mongoose';
import { BaseRepository } from '../../shared/BaseRepository';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { IMessagingRepository, MessageFilters } from './messaging.interfaces';

export class MessagingRepository extends BaseRepository<IConversation> implements IMessagingRepository {
  constructor() {
    super(Conversation);
  }

  async findConversationsByUser(
    userId: string,
    filters: MessageFilters,
  ): Promise<{ docs: IConversation[]; total: number }> {
    const query = { participants: new Types.ObjectId(userId) };
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'username role'),
      Conversation.countDocuments(query),
    ]);

    return { docs, total };
  }

  async findConversationById(id: string): Promise<IConversation | null> {
    return Conversation.findById(id).populate('participants', 'username role');
  }

  async findConversationByCollabId(collabRequestId: string): Promise<IConversation | null> {
    return Conversation.findOne({ collaborationRequestId: new Types.ObjectId(collabRequestId) });
  }

  async createConversation(data: Partial<IConversation>): Promise<IConversation> {
    return Conversation.create(data);
  }

  async findMessages(
    conversationId: string,
    filters: MessageFilters,
  ): Promise<{ docs: IMessage[]; total: number }> {
    const query = { conversationId: new Types.ObjectId(conversationId) };
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Message.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Message.countDocuments(query),
    ]);

    return { docs, total };
  }

  async createMessage(data: Partial<IMessage>): Promise<IMessage> {
    return Message.create(data);
  }

  async updateConversationLastMessage(
    conversationId: string,
    message: { content: string; senderId: string; createdAt: Date },
  ): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content: message.content,
        senderId: new Types.ObjectId(message.senderId),
        createdAt: message.createdAt,
      },
    });
  }

  async markMessagesAsRead(conversationId: string, recipientId: string): Promise<number> {
    const result = await Message.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(recipientId) },
        readAt: { $exists: false },
      },
      { $set: { readAt: new Date() } },
    );

    return result.modifiedCount;
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    return Message.countDocuments({
      conversationId: new Types.ObjectId(conversationId),
      senderId: { $ne: new Types.ObjectId(userId) },
      readAt: { $exists: false },
    });
  }
}
