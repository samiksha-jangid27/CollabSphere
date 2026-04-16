// ABOUTME: Unit tests for the Profile Mongoose model — schema constraints, defaults, indexes.
// ABOUTME: Runs against mongodb-memory-server for isolation.

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { Profile } from '@/models/Profile';
import { User } from '@/models/User';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

async function createUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return User.create({ username: 'testuser', password: hashedPassword, role: 'creator' });
}

describe('Profile Model', () => {
  it('creates a profile with minimal required fields', async () => {
    const user = await createUser();
    const profile = await Profile.create({
      userId: user._id,
      displayName: 'Aarav',
    });
    expect(profile._id).toBeDefined();
    expect(profile.displayName).toBe('Aarav');
    expect(profile.niche).toEqual([]);
    expect(profile.isVerified).toBe(false);
    expect(profile.profileCompleteness).toBe(0);
  });

  it('enforces one profile per user via unique index on userId', async () => {
    const user = await createUser();
    await Profile.create({ userId: user._id, displayName: 'First' });
    await expect(
      Profile.create({ userId: user._id, displayName: 'Second' }),
    ).rejects.toThrow();
  });

  it('rejects profile without userId', async () => {
    await expect(
      Profile.create({ displayName: 'Ghost' } as any),
    ).rejects.toThrow();
  });

  it('stores location as a GeoJSON Point', async () => {
    const user = await createUser();
    const profile = await Profile.create({
      userId: user._id,
      displayName: 'Maya',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.076],
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
    });
    expect(profile.location?.coordinates).toEqual([72.8777, 19.076]);
    expect(profile.location?.city).toBe('Mumbai');
  });

  it('caps bio length at 500 characters', async () => {
    const user = await createUser();
    const longBio = 'x'.repeat(501);
    await expect(
      Profile.create({ userId: user._id, displayName: 'X', bio: longBio }),
    ).rejects.toThrow();
  });

  it('has a 2dsphere index on location', async () => {
    const indexes = await Profile.collection.indexes();
    const geoIndex = indexes.find((i) => i.key.location === '2dsphere');
    expect(geoIndex).toBeDefined();
  });
});
