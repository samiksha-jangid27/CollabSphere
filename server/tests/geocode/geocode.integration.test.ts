// ABOUTME: Integration tests for GET /api/v1/geocode — auth, validation, upstream error mapping.
// ABOUTME: Mocks global.fetch so no real Nominatim calls are made.

import request from 'supertest';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '../helpers/testApp';
import { User } from '@/models/User';
import { TokenService } from '@/modules/auth/token.service';

const ORIGINAL_FETCH = global.fetch;

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const tokenService = new TokenService();
const API = '/api/v1/geocode';

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
  global.fetch = ORIGINAL_FETCH;
  jest.clearAllMocks();
});

async function authedUser() {
  const user = await User.create({
    phone: '+919876543210',
    email: 'a@b.com',
    role: 'creator',
    phoneVerified: true,
  });
  const token = tokenService.generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
  });
  return { user, token };
}

describe('Geocode Integration', () => {
  it('returns trimmed results for a valid query', async () => {
    mockFetchOnce([
      {
        display_name: 'Mumbai, Maharashtra, India',
        lat: '19.0760',
        lon: '72.8777',
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
      },
    ]);

    const { token } = await authedUser();
    const res = await request(app)
      .get(API)
      .query({ q: 'mumbai' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.results).toEqual([
      {
        displayName: 'Mumbai, Maharashtra, India',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        lat: 19.076,
        lng: 72.8777,
      },
    ]);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(API).query({ q: 'mumbai' });
    expect(res.status).toBe(401);
  });

  it('rejects missing q', async () => {
    const { token } = await authedUser();
    const res = await request(app).get(API).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('rejects q shorter than 2 characters', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .get(API)
      .query({ q: 'a' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('returns 502 on upstream failure', async () => {
    mockFetchOnce([], false, 503);
    const { token } = await authedUser();
    const res = await request(app)
      .get(API)
      .query({ q: 'mumbai' })
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('GEOCODE_UPSTREAM_ERROR');
  });
});
