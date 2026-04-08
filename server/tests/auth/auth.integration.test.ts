// ABOUTME: Integration tests for all auth endpoints — validates the full middleware+controller+service stack.
// ABOUTME: Covers TC-1.1 through TC-1.11 from the test plan using Supertest and in-memory MongoDB.

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

// Helper to create a user with an OTP and return the raw OTP code
async function createUserWithOtp(phone: string): Promise<{ otpCode: string }> {
  const otpCode = '123456';
  const hashedOtp = await bcrypt.hash(otpCode, 10);

  await User.create({
    phone,
    role: 'creator',
    otp: {
      code: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
      requestCount: 1,
      lastRequestAt: new Date(),
    },
  });

  return { otpCode };
}

describe('Auth Integration Tests', () => {
  // TC-1.1: Send OTP to valid phone
  it('TC-1.1: should send OTP to valid phone', async () => {
    const res = await request(app)
      .post(`${API}/otp/send`)
      .send({ phone: '+919876543210' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.phone).toBe('+919876543210');
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.message).toBe('OTP sent successfully');
  });

  // TC-1.2: Send OTP to invalid phone
  it('TC-1.2: should reject invalid phone format', async () => {
    const res = await request(app)
      .post(`${API}/otp/send`)
      .send({ phone: 'abc123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  // TC-1.3: Verify correct OTP
  it('TC-1.3: should verify correct OTP and return tokens', async () => {
    const { otpCode } = await createUserWithOtp('+919876543210');

    const res = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: otpCode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.phoneVerified).toBe(true);

    // Check Set-Cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    expect(cookieStr).toContain('refreshToken');
    expect(cookieStr).toContain('HttpOnly');
  });

  // TC-1.4: Verify wrong OTP
  it('TC-1.4: should reject incorrect OTP', async () => {
    await createUserWithOtp('+919876543210');

    const res = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: '000000' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_OTP');
  });

  // TC-1.5: Verify expired OTP
  it('TC-1.5: should reject expired OTP', async () => {
    const otpCode = '123456';
    const hashedOtp = await bcrypt.hash(otpCode, 10);

    await User.create({
      phone: '+919876543210',
      role: 'creator',
      otp: {
        code: hashedOtp,
        expiresAt: new Date(Date.now() - 1000), // expired
        attempts: 0,
        requestCount: 1,
        lastRequestAt: new Date(),
      },
    });

    const res = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: otpCode });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_OTP_EXPIRED');
  });

  // TC-1.6: Send email verification (authenticated)
  it('TC-1.6: should send email verification when authenticated', async () => {
    const { otpCode } = await createUserWithOtp('+919876543210');

    // First login to get a token
    const loginRes = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: otpCode });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`${API}/email/send`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Verification email sent');
  });

  // TC-1.7: Verify email with valid token
  it('TC-1.7: should verify email with valid token', async () => {
    const user = await User.create({
      phone: '+919876543210',
      email: 'test@example.com',
      role: 'creator',
    });

    const emailToken = tokenService.generateEmailToken({
      userId: user._id.toString(),
      email: 'test@example.com',
    });

    const res = await request(app).get(`${API}/email/verify/${emailToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.emailVerified).toBe(true);
  });

  // TC-1.8: Access /me without token
  it('TC-1.8: should reject access to /me without token', async () => {
    const res = await request(app).get(`${API}/me`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_INVALID_TOKEN');
  });

  // TC-1.9: Access /me with valid token
  it('TC-1.9: should return user data with valid token', async () => {
    const { otpCode } = await createUserWithOtp('+919876543210');

    const loginRes = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: otpCode });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.phone).toBe('+919876543210');
  });

  // TC-1.10: Refresh token rotation
  it('TC-1.10: should refresh tokens with valid cookie', async () => {
    const { otpCode } = await createUserWithOtp('+919876543210');

    const loginRes = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: otpCode });

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

  // TC-1.11: Logout
  it('TC-1.11: should logout and clear cookie', async () => {
    const { otpCode } = await createUserWithOtp('+919876543210');

    const loginRes = await request(app)
      .post(`${API}/otp/verify`)
      .send({ phone: '+919876543210', otp: otpCode });

    const accessToken = loginRes.body.data.accessToken;

    const res = await request(app)
      .post(`${API}/logout`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Logged out successfully');
  });
});
