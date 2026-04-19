// ABOUTME: Integration tests for messaging endpoints — tests full HTTP request/response cycle.
// ABOUTME: Uses supertest and in-memory MongoDB for isolated, repeatable tests.

import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '@/index';
import { User } from '@/models/User';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { CollaborationRequest } from '@/models/CollaborationRequest';
import { TokenService } from '@/modules/auth/token.service';

const tokenService = new TokenService();

let creatorToken: string;
let brandToken: string;
let creatorId: string;
let brandId: string;
let conversationId: string;
let collabId: string;

async function createUser(username: string, role: 'creator' | 'brand') {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return User.create({
    username,
    password: hashedPassword,
    role,
    email: `${username}@example.com`,
  });
}

async function setupConversation() {
  collabId = new mongoose.Types.ObjectId().toString();
  const conv = await Conversation.create({
    participants: [creatorId, brandId],
    collaborationRequestId: collabId,
  });
  conversationId = conv._id.toString();
}

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();

  const creatorUser = await createUser('msg_creator', 'creator');
  creatorId = creatorUser._id.toString();
  creatorToken = tokenService.generateAccessToken({ userId: creatorId, role: 'creator' });

  const brandUser = await createUser('msg_brand', 'brand');
  brandId = brandUser._id.toString();
  brandToken = tokenService.generateAccessToken({ userId: brandId, role: 'brand' });
});

describe('GET /api/v1/messages/conversations', () => {
  it('returns empty list when user has no conversations', async () => {
    const res = await request(app)
      .get('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(0);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('returns conversations the user participates in', async () => {
    await setupConversation();

    const res = await request(app)
      .get('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .get('/api/v1/messages/conversations');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('paginates results', async () => {
    for (let i = 0; i < 5; i++) {
      await Conversation.create({
        participants: [creatorId, new mongoose.Types.ObjectId()],
        collaborationRequestId: new mongoose.Types.ObjectId(),
      });
    }

    const res = await request(app)
      .get('/api/v1/messages/conversations?page=1&limit=2')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.hasNext).toBe(true);
  });
});

describe('GET /api/v1/messages/conversations/:id', () => {
  it('returns a conversation when user is participant', async () => {
    await setupConversation();

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversation._id).toBe(conversationId);
  });

  it('returns 404 for non-existent conversation', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${fakeId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when user is not a participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider', 'creator');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'creator',
    });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/messages/conversations/:id/messages', () => {
  it('sends a message successfully', async () => {
    await setupConversation();

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ content: 'Hello from creator!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.content).toBe('Hello from creator!');
    expect(res.body.data.message.senderId).toBe(creatorId);
    expect(res.body.message).toBe('Message sent');
  });

  it('updates lastMessage on conversation after sending', async () => {
    await setupConversation();

    await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ content: 'Brand says hi' });

    const conv = await Conversation.findById(conversationId);
    expect(conv!.lastMessage!.content).toBe('Brand says hi');
  });

  it('rejects empty content', async () => {
    await setupConversation();

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider2', 'brand');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'brand',
    });

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ content: 'Intruder message' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects unauthenticated requests', async () => {
    await setupConversation();

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .send({ content: 'No auth' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/messages/conversations/:id/messages', () => {
  it('returns messages for a conversation', async () => {
    await setupConversation();

    await Message.create({ conversationId, senderId: creatorId, content: 'Msg 1' });
    await Message.create({ conversationId, senderId: brandId, content: 'Msg 2' });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('paginates messages', async () => {
    await setupConversation();

    for (let i = 0; i < 5; i++) {
      await Message.create({ conversationId, senderId: creatorId, content: `Msg ${i}` });
    }

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}/messages?page=1&limit=2`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.hasNext).toBe(true);
  });

  it('rejects non-participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider3', 'creator');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'creator',
    });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/messages/conversations/:id/read', () => {
  it('marks unread messages as read', async () => {
    await setupConversation();

    await Message.create({ conversationId, senderId: brandId, content: 'Unread 1' });
    await Message.create({ conversationId, senderId: brandId, content: 'Unread 2' });

    const res = await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const msgs = await Message.find({ conversationId, senderId: brandId });
    expect(msgs[0].readAt).toBeDefined();
    expect(msgs[1].readAt).toBeDefined();
  });

  it('does not mark own messages as read', async () => {
    await setupConversation();

    await Message.create({ conversationId, senderId: creatorId, content: 'My own msg' });

    await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${creatorToken}`);

    const msgs = await Message.find({ conversationId, senderId: creatorId });
    expect(msgs[0].readAt).toBeUndefined();
  });

  it('rejects non-participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider4', 'brand');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'brand',
    });

    const res = await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    await setupConversation();

    const res = await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/messages/conversations/by-collab/:collabId', () => {
  async function createCollab(status: 'Open' | 'Accepted' | 'Declined' = 'Open') {
    return CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test collab',
      description: 'Test description',
      budget: 1000,
      deadline: new Date(Date.now() + 86400000),
      status,
    });
  }

  it('returns existing conversation for the collab', async () => {
    const collab = await createCollab('Accepted');
    const conv = await Conversation.create({
      participants: [creatorId, brandId],
      collaborationRequestId: collab._id,
    });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/by-collab/${collab._id}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversation._id).toBe(conv._id.toString());
  });

  it('creates a conversation when none exists for the collab', async () => {
    const collab = await createCollab('Open');

    const res = await request(app)
      .get(`/api/v1/messages/conversations/by-collab/${collab._id}`)
      .set('Authorization', `Bearer ${brandToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.conversation._id).toBeDefined();

    const conv = await Conversation.findOne({ collaborationRequestId: collab._id });
    expect(conv).not.toBeNull();
    expect(conv!.participants.map((p: any) => p.toString()).sort()).toEqual(
      [creatorId, brandId].sort(),
    );
  });

  it('rejects a non-participant', async () => {
    const collab = await createCollab('Open');
    const outsider = await createUser('msg_outsider', 'creator');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'creator',
    });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/by-collab/${collab._id}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for non-existent collab', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/messages/conversations/by-collab/${fakeId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('rejects unauthenticated requests', async () => {
    const collab = await createCollab();

    const res = await request(app)
      .get(`/api/v1/messages/conversations/by-collab/${collab._id}`);

    expect(res.status).toBe(401);
  });
});
