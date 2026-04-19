// ABOUTME: Integration tests for collaboration endpoints — tests full HTTP request/response cycle.
// ABOUTME: Uses supertest and in-memory MongoDB for isolated, repeatable E2E-style tests.

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '@/index';
import { User } from '@/models/User';
import { TokenService } from '@/modules/auth/token.service';
import { CollaborationRequest } from '@/models/CollaborationRequest';
import { Conversation } from '@/models/Conversation';

const tokenService = new TokenService();

let creatorToken: string;
let brandToken: string;
let creatorId: string;
let brandId: string;

// Helper to create a user with hashed password
async function createUser(username: string, role: 'creator' | 'brand') {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return User.create({
    username,
    password: hashedPassword,
    role,
    email: `${username}@example.com`,
  });
}

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();

  const creatorUser = await createUser('creator1', 'creator');
  creatorId = creatorUser._id.toString();
  creatorToken = tokenService.generateAccessToken({ userId: creatorId, role: 'creator' });

  const brandUser = await createUser('brand1', 'brand');
  brandId = brandUser._id.toString();
  brandToken = tokenService.generateAccessToken({ userId: brandId, role: 'brand' });
});

describe('POST /api/v1/collaborations', () => {
  it('brand creates a collaboration request successfully', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/v1/collaborations')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        recipientId: creatorId,
        title: 'Fashion Collab',
        description: 'Looking for fashion influencers',
        budget: 50000,
        deadline: futureDate.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.collaboration.title).toBe('Fashion Collab');
    expect(res.body.data.collaboration.status).toBe('Open');
  });

  it('rejects if user is not a brand', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/v1/collaborations')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        recipientId: creatorId,
        title: 'Fashion Collab',
        description: 'Looking for fashion influencers',
        budget: 50000,
        deadline: futureDate.toISOString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects if user is not authenticated', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/v1/collaborations')
      .send({
        recipientId: creatorId,
        title: 'Fashion Collab',
        description: 'Looking for fashion influencers',
        budget: 50000,
        deadline: futureDate.toISOString(),
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects if deadline is in the past', async () => {
    const pastDate = new Date(Date.now() - 1000);

    const res = await request(app)
      .post('/api/v1/collaborations')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        userId: creatorId,
        title: 'Fashion Collab',
        description: 'Looking for fashion influencers',
        budget: 50000,
        deadline: pastDate.toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects if title is missing', async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/v1/collaborations')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        userId: creatorId,
        description: 'Looking for fashion influencers',
        budget: 50000,
        deadline: futureDate.toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/v1/collaborations/inbox', () => {
  it('creator views received requests', async () => {
    await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test Request',
      description: 'Test Description',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .get('/api/v1/collaborations/inbox')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('rejects if user is not a creator', async () => {
    const res = await request(app)
      .get('/api/v1/collaborations/inbox')
      .set('Authorization', `Bearer ${brandToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('filters inbox by status', async () => {
    await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Open',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Accepted',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Accepted',
    });

    const res = await request(app)
      .get('/api/v1/collaborations/inbox?status=Open')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].title).toBe('Open');
  });

  it('handles pagination', async () => {
    for (let i = 0; i < 15; i++) {
      await CollaborationRequest.create({
        userId: creatorId,
        brandId: brandId,
        title: `Request ${i}`,
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });
    }

    const res = await request(app)
      .get('/api/v1/collaborations/inbox?page=1&limit=10')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(10);
    expect(res.body.data.pagination.hasNext).toBe(true);
  });
});

describe('GET /api/v1/collaborations/sent', () => {
  it('brand views sent requests', async () => {
    await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test Request',
      description: 'Test Description',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .get('/api/v1/collaborations/sent')
      .set('Authorization', `Bearer ${brandToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data.length).toBe(1);
  });

  it('rejects if user is not a brand', async () => {
    const res = await request(app)
      .get('/api/v1/collaborations/sent')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('filters sent by status', async () => {
    await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Open',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Declined',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Declined',
    });

    const res = await request(app)
      .get('/api/v1/collaborations/sent?status=Declined')
      .set('Authorization', `Bearer ${brandToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data.length).toBe(1);
    expect(res.body.data.data[0].title).toBe('Declined');
  });
});

describe('PATCH /api/v1/collaborations/:id/accept', () => {
  it('creator accepts a request', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.collaboration.status).toBe('Accepted');
  });

  it('rejects if user is not a creator', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
      .set('Authorization', `Bearer ${brandToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects if creator is not the recipient', async () => {
    const otherCreator = await createUser('creator2', 'creator');
    const otherToken = tokenService.generateAccessToken({ userId: otherCreator._id.toString(), role: 'creator' });

    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects if request already declined', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Declined',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('creates a conversation and returns conversationId on accept', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.collaboration.status).toBe('Accepted');
    expect(res.body.data.conversationId).toBeDefined();

    // Verify conversation exists in DB
    const conversation = await Conversation.findById(res.body.data.conversationId);
    expect(conversation).toBeDefined();
    expect(conversation!.participants.map(String)).toContain(creatorId);
    expect(conversation!.participants.map(String)).toContain(brandId);
    expect(conversation!.collaborationRequestId.toString()).toBe(req._id.toString());
  });

  it('does not create duplicate conversation if accept is retried', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    // First accept
    await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/accept`)
      .set('Authorization', `Bearer ${creatorToken}`);

    // Count conversations
    const count = await Conversation.countDocuments({
      collaborationRequestId: req._id,
    });

    expect(count).toBe(1);
  });
});

describe('PATCH /api/v1/collaborations/:id/decline', () => {
  it('creator declines a request', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/decline`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.collaboration.status).toBe('Declined');
  });

  it('rejects if user is not a creator', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/decline`)
      .set('Authorization', `Bearer ${brandToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects if creator is not the recipient', async () => {
    const otherCreator = await createUser('creator2', 'creator');
    const otherToken = tokenService.generateAccessToken({ userId: otherCreator._id.toString(), role: 'creator' });

    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Open',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/decline`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects if request already accepted', async () => {
    const req = await CollaborationRequest.create({
      userId: creatorId,
      brandId: brandId,
      title: 'Test',
      description: 'Desc',
      budget: 10000,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'Accepted',
    });

    const res = await request(app)
      .patch(`/api/v1/collaborations/${req._id.toString()}/decline`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
