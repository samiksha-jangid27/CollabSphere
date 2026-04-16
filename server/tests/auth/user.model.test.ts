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
    username: 'testuser',
    password: 'hashed_password_here',
    email: 'test@example.com',
    role: 'creator' as const,
  };

  it('should create a user with valid fields', async () => {
    const user = await User.create(validUserData);

    expect(user._id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.password).toBe('hashed_password_here');
    expect(user.email).toBe('test@example.com');
    expect(user.role).toBe('creator');
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it('should fail without required username field', async () => {
    await expect(
      User.create({ password: 'pwd123', email: 'test@example.com', role: 'creator' }),
    ).rejects.toThrow();
  });

  it('should fail without required password field', async () => {
    await expect(
      User.create({ username: 'testuser', email: 'test@example.com', role: 'creator' }),
    ).rejects.toThrow();
  });

  it('should fail without required role field', async () => {
    await expect(
      User.create({ username: 'testuser', password: 'pwd123', email: 'test@example.com' }),
    ).rejects.toThrow();
  });

  it('should enforce unique username constraint', async () => {
    await User.create(validUserData);
    await expect(
      User.create({ ...validUserData, email: 'other@example.com' }),
    ).rejects.toThrow();
  });

  it('should enforce unique email constraint', async () => {
    await User.create(validUserData);
    await expect(
      User.create({ ...validUserData, username: 'otheruser' }),
    ).rejects.toThrow();
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

  it('should strip password, refreshToken, and __v from toJSON', async () => {
    const user = await User.create(validUserData);
    const json = user.toJSON();

    expect(json).not.toHaveProperty('password');
    expect(json).not.toHaveProperty('refreshToken');
    expect(json).not.toHaveProperty('__v');
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
      username: 'testuser',
      password: 'hashed_password',
      role: 'creator',
    });
    expect(user.email).toBeUndefined();
  });

  it('should trim username whitespace', async () => {
    const user = await User.create({
      ...validUserData,
      username: '  testuser  ',
    });
    expect(user.username).toBe('testuser');
  });
});
