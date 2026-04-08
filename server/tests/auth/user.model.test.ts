// ABOUTME: Unit tests for the User Mongoose model — validates schema constraints and defaults.
// ABOUTME: Tests run against mongodb-memory-server for isolation.

import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
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

describe('User Model', () => {
  const validUserData = {
    phone: '+919876543210',
    email: 'test@example.com',
    role: 'creator' as const,
  };

  it('should create a user with valid fields', async () => {
    const user = await User.create(validUserData);

    expect(user._id).toBeDefined();
    expect(user.phone).toBe('+919876543210');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('creator');
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it('should fail without required phone field', async () => {
    await expect(
      User.create({ email: 'test@example.com', role: 'creator' }),
    ).rejects.toThrow();
  });

  it('should fail without required role field', async () => {
    await expect(
      User.create({ phone: '+919876543210', email: 'test@example.com' }),
    ).rejects.toThrow();
  });

  it('should enforce unique phone constraint', async () => {
    await User.create(validUserData);
    await expect(
      User.create({ ...validUserData, email: 'other@example.com' }),
    ).rejects.toThrow();
  });

  it('should enforce unique email constraint', async () => {
    await User.create(validUserData);
    await expect(
      User.create({ ...validUserData, phone: '+919876543211' }),
    ).rejects.toThrow();
  });

  it('should default phoneVerified to false', async () => {
    const user = await User.create(validUserData);
    expect(user.phoneVerified).toBe(false);
  });

  it('should default emailVerified to false', async () => {
    const user = await User.create(validUserData);
    expect(user.emailVerified).toBe(false);
  });

  it('should default isActive to true', async () => {
    const user = await User.create(validUserData);
    expect(user.isActive).toBe(true);
  });

  it('should default isBanned to false', async () => {
    const user = await User.create(validUserData);
    expect(user.isBanned).toBe(false);
  });

  it('should strip otp, refreshToken, and __v from toJSON', async () => {
    const user = await User.create(validUserData);
    const json = user.toJSON();

    expect(json).not.toHaveProperty('otp');
    expect(json).not.toHaveProperty('refreshToken');
    expect(json).not.toHaveProperty('__v');
  });

  it('should accept valid E.164 phone numbers', async () => {
    const user = await User.create({
      ...validUserData,
      phone: '+14155552671',
    });
    expect(user.phone).toBe('+14155552671');
  });

  it('should lowercase email', async () => {
    const user = await User.create({
      ...validUserData,
      email: 'Test@EXAMPLE.com',
    });
    expect(user.email).toBe('test@example.com');
  });

  it('should allow null email for sparse unique index', async () => {
    const user = await User.create({
      phone: '+919876543210',
      role: 'creator',
    });
    expect(user.email).toBeUndefined();
  });
});
