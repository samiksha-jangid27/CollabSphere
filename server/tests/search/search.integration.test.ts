// ABOUTME: Integration tests for search endpoints — validates HTTP contract and filtering.
// ABOUTME: Tests public endpoints without auth middleware.

import request from 'supertest';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '../helpers/testApp';
import { User } from '@/models/User';
import { Profile } from '@/models/Profile';

const API = '/api/v1/search';

let phoneCounter = 1;

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
  phoneCounter = 1;
});

async function createTestProfile(data: {
  displayName: string;
  niche?: string[];
  location?: { type: 'Point'; coordinates: [number, number]; city: string };
}) {
  const user = await User.create({ 
    phone: `+9198765432${phoneCounter++}`, 
    role: 'creator' 
  });
  return Profile.create({
    userId: user._id,
    displayName: data.displayName,
    niche: data.niche || [],
    location: data.location,
  });
}

describe('Search Integration', () => {
  it('GET /search/profiles?city=Mumbai → 200 + results', async () => {
    await createTestProfile({
      displayName: 'Aarav',
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    const res = await request(app).get(`${API}/profiles?city=Mumbai`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /search/profiles?city=Mumbai&niche=fashion → 200 + filtered', async () => {
    await createTestProfile({
      displayName: 'Maya',
      niche: ['fashion'],
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    await createTestProfile({
      displayName: 'Raj',
      niche: ['tech'],
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    const res = await request(app).get(`${API}/profiles?city=Mumbai&niche=fashion`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].displayName).toBe('Maya');
  });

  it('GET /search/profiles (no params) → 400 + INVALID_SEARCH_FILTERS', async () => {
    const res = await request(app).get(`${API}/profiles`);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_SEARCH_FILTERS');
  });

  it('GET /search/cities?q=mum → 200 + suggestions', async () => {
    await createTestProfile({
      displayName: 'User1',
      location: { type: 'Point', coordinates: [72.8479, 19.0176], city: 'Mumbai' },
    });
    const res = await request(app).get(`${API}/cities?q=mum`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.includes('Mumbai')).toBe(true);
  });

  it('GET /search/cities (no q) → 200 + empty array', async () => {
    const res = await request(app).get(`${API}/cities`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
