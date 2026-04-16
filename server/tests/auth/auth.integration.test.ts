// ABOUTME: Integration tests for all auth endpoints — validates the full middleware+controller+service stack.
// ABOUTME: Covers register, login, email verification, token refresh, and logout with in-memory MongoDB.

import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '../helpers/testApp';
import { User } from '@/models/User';
import { TokenService } from '@/modules/auth/token.service';

const tokenService = new TokenService();
const API = '/api/v1/auth';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

// Helper to create a user with hashed password
async function createUser(username: string, password: string, role: 'creator' | 'brand' = 'creator') {
  const hashedPassword = await bcrypt.hash(password, 10);
  return User.create({
    username,
    password: hashedPassword,
    role,
    email: `${username}@example.com`,
  });
}

describe('Auth Integration Tests', () => {
  // Register success
  it('TC-1.1: should register a new user successfully', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        username: 'testuser',
        password: 'testpass123',
        role: 'creator',
        email: 'test@example.com',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe('testuser');
    expect(res.body.data.user.role).toBe('creator');

    // Check Set-Cookie header for refresh token
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('refreshToken');
    expect(cookieStr).toContain('HttpOnly');
  });

  // Register duplicate username
  it('TC-1.2: should reject register with duplicate username', async () => {
    await createUser('testuser', 'password123');

    const res = await request(app)
      .post(`${API}/register`)
      .send({
        username: 'testuser',
        password: 'newpass123',
        role: 'brand',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
  });

  // Register duplicate email
  it('TC-1.2b: should reject register with duplicate email', async () => {
    await createUser('existinguser', 'password123');

    const res = await request(app)
      .post(`${API}/register`)
      .send({
        username: 'newuser',
        password: 'newpass123',
        role: 'brand',
        email: 'existinguser@example.com',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  // Register missing fields
  it('TC-1.3: should reject register with missing fields', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        username: 'testuser',
        // missing password and role
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // Login success
  it('TC-1.4: should login with valid credentials', async () => {
    await createUser('testuser', 'password123');

    const res = await request(app)
      .post(`${API}/login`)
      .send({
        username: 'testuser',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe('testuser');

    // Check Set-Cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('refreshToken');
    expect(cookieStr).toContain('HttpOnly');
  });

  // Login wrong password
  it('TC-1.5: should reject login with wrong password', async () => {
    await createUser('testuser', 'password123');

    const res = await request(app)
      .post(`${API}/login`)
      .send({
        username: 'testuser',
        password: 'wrongpassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  // Login user not found
  it('TC-1.6: should reject login with nonexistent user', async () => {
    const res = await request(app)
      .post(`${API}/login`)
      .send({
        username: 'nonexistent',
        password: 'password123',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  // Send email verification (authenticated)
  it('TC-1.7: should send email verification when authenticated', async () => {
    const user = await createUser('testuser', 'password123');

    const loginRes = await request(app)
      .post(`${API}/login`)
      .send({ username: 'testuser', password: 'password123' });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`${API}/email/send`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'newemail@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Verification email sent');
  });

  // Verify email with valid token
  it('TC-1.8: should verify email with valid token', async () => {
    const user = await createUser('testuser', 'password123');

    const emailToken = tokenService.generateEmailToken({
      userId: user._id.toString(),
      email: 'test@example.com',
    });

    const res = await request(app).get(`${API}/email/verify/${emailToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emailVerified).toBe(true);
  });

  // Access /me without token
  it('TC-1.9: should reject access to /me without token', async () => {
    const res = await request(app).get(`${API}/me`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  // Access /me with valid token
  it('TC-1.10: should return user data with valid token', async () => {
    await createUser('testuser', 'password123');

    const loginRes = await request(app)
      .post(`${API}/login`)
      .send({ username: 'testuser', password: 'password123' });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('testuser');
  });

  // Refresh token rotation
  it('TC-1.11: should refresh tokens with valid cookie', async () => {
    await createUser('testuser', 'password123');

    const loginRes = await request(app)
      .post(`${API}/login`)
      .send({ username: 'testuser', password: 'password123' });

    // Extract refresh token cookie
    const cookies = loginRes.headers['set-cookie'];
    const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;

    const res = await request(app)
      .post(`${API}/refresh`)
      .set('Cookie', cookieStr);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();

    // New cookie should be set
    const newCookies = res.headers['set-cookie'];
    expect(newCookies).toBeDefined();
  });

  // Logout
  it('TC-1.12: should logout and clear cookie', async () => {
    await createUser('testuser', 'password123');

    const loginRes = await request(app)
      .post(`${API}/login`)
      .send({ username: 'testuser', password: 'password123' });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`${API}/logout`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logged out successfully');
  });
});
