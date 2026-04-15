// ABOUTME: Integration tests for all profile endpoints — auth, CRUD, upload stub.
// ABOUTME: Covers happy paths and the one-per-user constraint.

import request from 'supertest';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '../helpers/testApp';
import { User } from '@/models/User';
import { TokenService } from '@/modules/auth/token.service';

jest.mock('@/config/cloudinary', () => ({
  uploadImageBuffer: jest.fn().mockResolvedValue('https://cdn.test/fake.jpg'),
}));

const tokenService = new TokenService();
const API = '/api/v1/profiles';

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
});

async function authedUser() {
  const user = await User.create({
    phone: '+919876543210',
    email: 'a@b.com',
    role: 'creator',
    phoneVerified: true,
  });
  const token = tokenService.generateAccessToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
}

describe('Profile Integration', () => {
  it('creates a profile', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Aarav', niche: ['fashion'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.displayName).toBe('Aarav');
  });

  it('rejects creating a second profile', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROFILE_ALREADY_EXISTS');
  });

  it('GET /me returns own profile', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.displayName).toBe('A');
  });

  it('GET /me returns 404 when no profile exists', async () => {
    const { token } = await authedUser();
    const res = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /me updates fields', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app)
      .patch(`${API}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Updated bio text here' });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.bio).toBe('Updated bio text here');
  });

  it('DELETE /me removes the profile', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const del = await request(app).delete(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it('POST /me/avatar uploads and returns the URL', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app)
      .post(`${API}/me/avatar`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toBe('https://cdn.test/fake.jpg');
  });

  it('GET /:id returns public profile', async () => {
    const { token } = await authedUser();
    const created = await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const id = created.body.data.profile._id;
    const res = await request(app).get(`${API}/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile._id).toBe(id);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`${API}/me`);
    expect(res.status).toBe(401);
  });
});
