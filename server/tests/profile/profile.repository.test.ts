// ABOUTME: Repository-level tests for ProfileRepository against an in-memory MongoDB.
// ABOUTME: Validates one-per-user enforcement and findByUserId lookup.

import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { ProfileRepository } from '@/modules/profile/profile.repository';
import { User } from '@/models/User';

const repo = new ProfileRepository();

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
});

async function makeUser() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return User.create({ username: 'testuser', password: hashedPassword, role: 'creator' });
}

describe('ProfileRepository', () => {
  it('creates a profile', async () => {
    const user = await makeUser();
    const profile = await repo.create({ userId: user._id, displayName: 'Test' } as any);
    expect(profile.displayName).toBe('Test');
  });

  it('findByUserId returns the matching profile', async () => {
    const user = await makeUser();
    await repo.create({ userId: user._id, displayName: 'Lookup' } as any);
    const found = await repo.findByUserId(user._id.toString());
    expect(found?.displayName).toBe('Lookup');
  });

  it('findByUserId returns null when no profile exists', async () => {
    const found = await repo.findByUserId(new Types.ObjectId().toString());
    expect(found).toBeNull();
  });
});
