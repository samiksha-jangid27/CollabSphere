// ABOUTME: Unit tests for MessagingService — validates conversation/message business logic.
// ABOUTME: Uses in-memory MongoDB for repository tests.

import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { User, IUser } from '@/models/User';
import { MessagingRepository } from '@/modules/messaging/messaging.repository';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { AppError, ERROR_CODES } from '@/shared/errors';
import { eventBus, APP_EVENTS } from '@/shared/EventBus';

const repo = new MessagingRepository();

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

describe('Conversation Model', () => {
  it('creates a conversation with valid fields', async () => {
    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();
    const collabId = new mongoose.Types.ObjectId();

    const conv = await Conversation.create({
      participants: [userId1, userId2],
      collaborationRequestId: collabId,
    });

    expect(conv._id).toBeDefined();
    expect(conv.participants).toHaveLength(2);
    expect(conv.collaborationRequestId.toString()).toBe(collabId.toString());
    expect(conv.createdAt).toBeDefined();
  });
});

describe('Message Model', () => {
  it('creates a message with valid fields', async () => {
    const convId = new mongoose.Types.ObjectId();
    const senderId = new mongoose.Types.ObjectId();

    const msg = await Message.create({
      conversationId: convId,
      senderId: senderId,
      content: 'Hello there',
    });

    expect(msg._id).toBeDefined();
    expect(msg.conversationId.toString()).toBe(convId.toString());
    expect(msg.senderId.toString()).toBe(senderId.toString());
    expect(msg.content).toBe('Hello there');
    expect(msg.readAt).toBeUndefined();
    expect(msg.createdAt).toBeDefined();
  });
});

describe('MessagingRepository', () => {
  let user1Id: mongoose.Types.ObjectId;
  let user2Id: mongoose.Types.ObjectId;
  let collabId: mongoose.Types.ObjectId;

  beforeEach(() => {
    user1Id = new mongoose.Types.ObjectId();
    user2Id = new mongoose.Types.ObjectId();
    collabId = new mongoose.Types.ObjectId();
  });

  describe('createConversation', () => {
    it('creates a conversation', async () => {
      const conv = await repo.createConversation({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      expect(conv._id).toBeDefined();
      expect(conv.participants).toHaveLength(2);
    });
  });

  describe('findConversationsByUser', () => {
    it('returns conversations for a user sorted by updatedAt desc', async () => {
      await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const collabId2 = new mongoose.Types.ObjectId();
      const user3Id = new mongoose.Types.ObjectId();
      await Conversation.create({
        participants: [user1Id, user3Id],
        collaborationRequestId: collabId2,
      });

      const result = await repo.findConversationsByUser(user1Id.toString(), { page: 1, limit: 10 });

      expect(result.docs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('does not return conversations the user is not in', async () => {
      const otherUser = new mongoose.Types.ObjectId();
      await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const result = await repo.findConversationsByUser(otherUser.toString(), { page: 1, limit: 10 });

      expect(result.docs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 5; i++) {
        await Conversation.create({
          participants: [user1Id, new mongoose.Types.ObjectId()],
          collaborationRequestId: new mongoose.Types.ObjectId(),
        });
      }

      const result = await repo.findConversationsByUser(user1Id.toString(), { page: 1, limit: 2 });

      expect(result.docs).toHaveLength(2);
      expect(result.total).toBe(5);
    });
  });

  describe('findConversationById', () => {
    it('returns a conversation by ID', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const found = await repo.findConversationById(conv._id.toString());

      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(conv._id.toString());
    });

    it('returns null for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const found = await repo.findConversationById(fakeId.toString());

      expect(found).toBeNull();
    });
  });

  describe('createMessage + findMessages', () => {
    it('creates a message and retrieves it', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await repo.createMessage({
        conversationId: conv._id,
        senderId: user1Id,
        content: 'Test message',
      });

      const result = await repo.findMessages(conv._id.toString(), { page: 1, limit: 50 });

      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].content).toBe('Test message');
      expect(result.total).toBe(1);
    });

    it('returns messages sorted by createdAt desc', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const base = Date.now();
      await Message.create({ conversationId: conv._id, senderId: user1Id, content: 'First', createdAt: new Date(base) });
      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Second', createdAt: new Date(base + 100) });
      await Message.create({ conversationId: conv._id, senderId: user1Id, content: 'Third', createdAt: new Date(base + 200) });

      const result = await repo.findMessages(conv._id.toString(), { page: 1, limit: 50 });

      expect(result.docs).toHaveLength(3);
      expect(result.docs[0].content).toBe('Third');
      expect(result.docs[2].content).toBe('First');
    });
  });

  describe('updateConversationLastMessage', () => {
    it('updates the lastMessage field on a conversation', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const now = new Date();
      await repo.updateConversationLastMessage(conv._id.toString(), {
        content: 'Latest message',
        senderId: user1Id.toString(),
        createdAt: now,
      });

      const updated = await Conversation.findById(conv._id);
      expect(updated!.lastMessage).toBeDefined();
      expect(updated!.lastMessage!.content).toBe('Latest message');
    });
  });

  describe('markMessagesAsRead', () => {
    it('marks unread messages from the other user as read', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 1' });
      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 2' });
      await Message.create({ conversationId: conv._id, senderId: user1Id, content: 'My msg' });

      const count = await repo.markMessagesAsRead(conv._id.toString(), user1Id.toString());

      expect(count).toBe(2);

      const msgs = await Message.find({ conversationId: conv._id, senderId: user2Id });
      expect(msgs[0].readAt).toBeDefined();
      expect(msgs[1].readAt).toBeDefined();
    });
  });

  describe('countUnread', () => {
    it('counts unread messages for a user', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 1' });
      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 2' });
      await Message.create({ conversationId: conv._id, senderId: user1Id, content: 'My msg' });

      const count = await repo.countUnread(conv._id.toString(), user1Id.toString());

      expect(count).toBe(2);
    });
  });
});

describe('MessagingService', () => {
  const service = new MessagingService(repo);
  let creatorUser: IUser;
  let brandUser: IUser;
  let conversationId: string;

  async function createTestUsersAndConversation() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    creatorUser = await User.create({
      username: 'msg_creator',
      password: hashedPassword,
      role: 'creator',
    });
    brandUser = await User.create({
      username: 'msg_brand',
      password: hashedPassword,
      role: 'brand',
    });

    const collabId = new mongoose.Types.ObjectId();
    const conv = await Conversation.create({
      participants: [creatorUser._id, brandUser._id],
      collaborationRequestId: collabId,
    });
    conversationId = conv._id.toString();
  }

  describe('getConversations', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('returns paginated conversations for a user', async () => {
      const result = await service.getConversations(creatorUser._id.toString(), { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('getConversation', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('returns conversation when user is a participant', async () => {
      const conv = await service.getConversation(conversationId, creatorUser._id.toString());

      expect(conv._id.toString()).toBe(conversationId);
    });

    it('throws CONVERSATION_NOT_FOUND for invalid ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(service.getConversation(fakeId, creatorUser._id.toString()))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_NOT_FOUND });
    });

    it('throws CONVERSATION_UNAUTHORIZED when user is not a participant', async () => {
      const outsider = await User.create({
        username: 'outsider',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.getConversation(conversationId, outsider._id.toString()))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('sends a message and updates lastMessage', async () => {
      const msg = await service.sendMessage(conversationId, creatorUser._id.toString(), { content: 'Hello brand!' });

      expect(msg.content).toBe('Hello brand!');
      expect(msg.senderId.toString()).toBe(creatorUser._id.toString());
      expect(msg.conversationId.toString()).toBe(conversationId);

      const conv = await Conversation.findById(conversationId);
      expect(conv!.lastMessage).toBeDefined();
      expect(conv!.lastMessage!.content).toBe('Hello brand!');
    });

    it('rejects message from non-participant', async () => {
      const outsider = await User.create({
        username: 'outsider2',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.sendMessage(conversationId, outsider._id.toString(), { content: 'Intruder!' }))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('returns paginated messages for a conversation', async () => {
      await Message.create({ conversationId, senderId: creatorUser._id, content: 'Msg 1' });
      await Message.create({ conversationId, senderId: brandUser._id, content: 'Msg 2' });

      const result = await service.getMessages(conversationId, creatorUser._id.toString(), { page: 1, limit: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('rejects non-participant', async () => {
      const outsider = await User.create({
        username: 'outsider3',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.getMessages(conversationId, outsider._id.toString(), { page: 1, limit: 50 }))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('markAsRead', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('marks unread messages as read', async () => {
      await Message.create({ conversationId, senderId: brandUser._id, content: 'Unread 1' });
      await Message.create({ conversationId, senderId: brandUser._id, content: 'Unread 2' });

      await service.markAsRead(conversationId, creatorUser._id.toString());

      const msgs = await Message.find({ conversationId, senderId: brandUser._id });
      expect(msgs[0].readAt).toBeDefined();
      expect(msgs[1].readAt).toBeDefined();
    });

    it('rejects non-participant', async () => {
      const outsider = await User.create({
        username: 'outsider4',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.markAsRead(conversationId, outsider._id.toString()))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('createConversationForCollab', () => {
    it('creates a conversation with both participants and the collab request ID', async () => {
      const creatorId = new Types.ObjectId().toString();
      const brandId = new Types.ObjectId().toString();
      const collabRequestId = new Types.ObjectId().toString();

      const conv = await service.createConversationForCollab(collabRequestId, creatorId, brandId);

      expect(conv._id).toBeDefined();
      expect(conv.participants.map(String)).toContain(creatorId);
      expect(conv.participants.map(String)).toContain(brandId);
      expect(conv.collaborationRequestId.toString()).toBe(collabRequestId);
    });

    it('returns existing conversation if one already exists (idempotent)', async () => {
      const creatorId = new Types.ObjectId().toString();
      const brandId = new Types.ObjectId().toString();
      const collabRequestId = new Types.ObjectId().toString();

      const first = await service.createConversationForCollab(collabRequestId, creatorId, brandId);
      const second = await service.createConversationForCollab(collabRequestId, creatorId, brandId);

      expect(second._id.toString()).toBe(first._id.toString());
    });
  });
});

describe('EventBus subscription', () => {
  const repo = new MessagingRepository();
  const service = new MessagingService(repo);

  it('creates a conversation when COLLAB_ACCEPTED is emitted', async () => {
    const creatorId = new Types.ObjectId().toString();
    const brandId = new Types.ObjectId().toString();
    const collabRequestId = new Types.ObjectId().toString();

    MessagingService.subscribeToEvents(service);

    await eventBus.emit(APP_EVENTS.COLLAB_ACCEPTED, {
      collabRequestId,
      creatorId,
      brandId,
    });

    const conversation = await Conversation.findOne({
      collaborationRequestId: collabRequestId,
    });

    expect(conversation).toBeDefined();
    expect(conversation!.participants.map(String)).toContain(creatorId);
    expect(conversation!.participants.map(String)).toContain(brandId);
  });
});
