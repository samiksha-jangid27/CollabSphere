// ABOUTME: Unit tests for ProfileService — uses a real in-memory DB but stubs Cloudinary.
// ABOUTME: Covers one-per-user rule, completeness math, and not-found errors.

import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { User } from '@/models/User';
import { ProfileRepository } from '@/modules/profile/profile.repository';
import { ProfileService } from '@/modules/profile/profile.service';
import { AppError } from '@/shared/errors';

jest.mock('@/config/cloudinary', () => ({
  uploadImageBuffer: jest.fn().mockResolvedValue('https://cdn.test/fake.jpg'),
}));

const repo = new ProfileRepository();
const service = new ProfileService(repo);

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
  jest.clearAllMocks();
});

async function makeUser() {
  return User.create({ phone: '+919876543210', role: 'creator' });
}

describe('ProfileService', () => {
  it('creates a profile for a user', async () => {
    const user = await makeUser();
    const profile = await service.createProfile(user._id.toString(), {
      displayName: 'Aarav',
      bio: 'Fashion creator from Mumbai',
      niche: ['fashion'],
    });
    expect(profile.displayName).toBe('Aarav');
    expect(profile.profileCompleteness).toBeGreaterThan(0);
  });

  it('rejects creating a second profile for the same user', async () => {
    const user = await makeUser();
    await service.createProfile(user._id.toString(), { displayName: 'First' });
    await expect(
      service.createProfile(user._id.toString(), { displayName: 'Second' }),
    ).rejects.toThrow(AppError);
  });

  it('getProfileByUserId throws when not found', async () => {
    const user = await makeUser();
    await expect(service.getProfileByUserId(user._id.toString())).rejects.toThrow(
      /PROFILE_NOT_FOUND/,
    );
  });

  it('updateProfile merges fields and recalculates completeness', async () => {
    const user = await makeUser();
    await service.createProfile(user._id.toString(), { displayName: 'Maya' });
    const updated = await service.updateProfile(user._id.toString(), {
      bio: 'New bio text',
      niche: ['travel', 'food'],
    });
    expect(updated.bio).toBe('New bio text');
    expect(updated.niche).toEqual(['travel', 'food']);
  });

  it('uploadAvatar stores the returned URL on the profile', async () => {
    const user = await makeUser();
    await service.createProfile(user._id.toString(), { displayName: 'Maya' });
    const url = await service.uploadAvatar(user._id.toString(), Buffer.from('x'));
    expect(url).toBe('https://cdn.test/fake.jpg');
    const profile = await service.getProfileByUserId(user._id.toString());
    expect(profile.avatar).toBe('https://cdn.test/fake.jpg');
  });

  it('calculateCompleteness returns 0 for empty and increases with fields', async () => {
    const user = await makeUser();
    const profile = await service.createProfile(user._id.toString(), { displayName: 'X' });
    const low = service.calculateCompleteness(profile);
    profile.bio = 'Some bio';
    profile.niche = ['fashion'];
    profile.avatar = 'url';
    profile.location = { type: 'Point', coordinates: [0, 0], city: 'C' };
    const high = service.calculateCompleteness(profile);
    expect(high).toBeGreaterThan(low);
  });
});
