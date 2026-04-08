# CollabSphere — Sprint 1 Authentication Flows

## Overview

CollabSphere uses a passwordless authentication system with 4 core flows:
1. **Phone OTP Login** — primary authentication
2. **Email Verification** — secondary identity confirmation
3. **Token Refresh** — silent session extension
4. **Logout** — session termination

---

## Flow 1: Phone OTP Login

### Step 1 — Send OTP

```
Client                          Server                         SMS Provider
  │                               │                               │
  │  POST /auth/otp/send          │                               │
  │  { phone: "+91..." }          │                               │
  │──────────────────────────────>│                               │
  │                               │  1. Validate phone (Zod)      │
  │                               │  2. Check rate limit           │
  │                               │     (3 requests / 15min)      │
  │                               │  3. Check lockout status       │
  │                               │  4. Find or create user        │
  │                               │  5. Generate 6-digit OTP       │
  │                               │  6. Hash OTP (bcrypt)          │
  │                               │  7. Store in user.otp subdoc   │
  │                               │     { code, expiresAt,         │
  │                               │       attempts: 0,             │
  │                               │       requestCount++ }         │
  │                               │                               │
  │                               │  [DEV] Log OTP to console     │
  │                               │  [PROD] Send SMS ────────────>│
  │                               │                               │
  │  200 { message: "OTP sent" }  │                               │
  │<──────────────────────────────│                               │
```

**Error paths:**
- Invalid phone format → 400 `VALIDATION_ERROR`
- Rate limited (3+ requests in 15min) → 429 `OTP_RATE_LIMITED`
- Account locked → 403 `ACCOUNT_LOCKED`
- Account banned → 403 `ACCOUNT_BANNED`

### Step 2 — Verify OTP

```
Client                          Server                         Database
  │                               │                               │
  │  POST /auth/otp/verify        │                               │
  │  { phone, otp: "123456" }     │                               │
  │──────────────────────────────>│                               │
  │                               │  1. Validate input (Zod)      │
  │                               │  2. Find user by phone ──────>│
  │                               │  3. Check lockedUntil          │
  │                               │  4. Check otp.expiresAt        │
  │                               │  5. bcrypt.compare(otp, hash)  │
  │                               │                               │
  │                               │  ── ON SUCCESS ──             │
  │                               │  6. Clear otp subdocument ──>│
  │                               │  7. Set phoneVerified = true  │
  │                               │  8. Generate access JWT        │
  │                               │     { userId, role } 15min    │
  │                               │  9. Generate refresh JWT       │
  │                               │     { userId } 7 days         │
  │                               │  10. Hash refresh token        │
  │                               │  11. Store hash in user ─────>│
  │                               │                               │
  │  200 { accessToken, user }    │                               │
  │  Set-Cookie: refreshToken     │                               │
  │<──────────────────────────────│                               │
  │                               │                               │
  │                               │  ── ON FAILURE ──             │
  │                               │  6. Increment otp.attempts    │
  │                               │  7. If attempts >= 5:          │
  │                               │     Set lockedUntil ─────────>│
  │                               │     (now + 30 minutes)        │
  │                               │                               │
  │  401 { error: INVALID_OTP }   │                               │
  │<──────────────────────────────│                               │
```

**Error paths:**
- Invalid input → 400 `VALIDATION_ERROR`
- No user found → 404 `USER_NOT_FOUND`
- Account locked → 403 `AUTH_OTP_LOCKED`
- OTP expired → 401 `AUTH_OTP_EXPIRED`
- Wrong OTP → 401 `AUTH_INVALID_OTP`
- Wrong OTP (5th attempt) → 403 `AUTH_OTP_LOCKED` (locks account)

### Security measures:
- OTP is **never** stored in plaintext — always bcrypt hashed
- OTP has a 5-minute TTL — expired OTPs cannot be verified
- Rate limiting prevents brute force: max 3 requests per phone per 15 minutes
- Lockout after 5 failed attempts for 30 minutes
- Phone uniqueness enforced at database level

---

## Flow 2: Email Verification

### Step 1 — Send Verification Email

```
Client                          Server                         Email Provider
  │                               │                               │
  │  POST /auth/email/send        │                               │
  │  Authorization: Bearer <jwt>  │                               │
  │  { email: "user@example.com" }│                               │
  │──────────────────────────────>│                               │
  │                               │  1. Verify access token        │
  │                               │  2. Find user by userId        │
  │                               │  3. Check not already verified │
  │                               │  4. Check re-send cooldown     │
  │                               │     (60 seconds)              │
  │                               │  5. Update user.email          │
  │                               │  6. Generate email JWT         │
  │                               │     { userId, email,           │
  │                               │       purpose: "email_verify" }│
  │                               │     Expiry: 24 hours          │
  │                               │  7. Build verification URL     │
  │                               │     CLIENT_URL/verify?token=x │
  │                               │  8. Send email ──────────────>│
  │                               │                               │
  │  200 { message: "Email sent" }│                               │
  │<──────────────────────────────│                               │
```

**Error paths:**
- Not authenticated → 401 `AUTH_INVALID_TOKEN`
- Already verified → 409 `AUTH_EMAIL_ALREADY_VERIFIED`
- Re-send too soon → 429 `TOO_MANY_REQUESTS`
- Invalid email → 400 `VALIDATION_ERROR`

### Step 2 — Confirm Email

```
User clicks email link:
  https://collabsphere.com/verify?token=eyJhbGci...

Client                          Server                         Database
  │                               │                               │
  │  GET /auth/email/verify/:token│                               │
  │──────────────────────────────>│                               │
  │                               │  1. Verify email JWT           │
  │                               │     - Check signature          │
  │                               │     - Check expiry (24h)       │
  │                               │     - Check purpose field      │
  │                               │  2. Extract { userId, email }  │
  │                               │  3. Find user ────────────────>│
  │                               │  4. Check not already verified │
  │                               │  5. Set emailVerified = true  │
  │                               │  6. Update user ──────────────>│
  │                               │                               │
  │  200 { emailVerified: true }  │                               │
  │<──────────────────────────────│                               │
```

**Error paths:**
- Invalid/malformed token → 400 `AUTH_INVALID_TOKEN`
- Expired token (>24h) → 400 `AUTH_TOKEN_EXPIRED`
- Already verified → 409 `AUTH_EMAIL_ALREADY_VERIFIED`

### Security measures:
- Token is a signed JWT — cannot be forged
- 24-hour expiry limits the window of vulnerability
- One-time use: after verification, the same token hitting an already-verified user returns 409
- `purpose: "email_verify"` in the payload prevents token reuse across different JWT types

---

## Flow 3: Token Refresh (Silent)

```
Client (Axios interceptor)      Server                         Database
  │                               │                               │
  │  [Any API call returns 401]   │                               │
  │                               │                               │
  │  POST /auth/refresh           │                               │
  │  Cookie: refreshToken=eyJ...  │                               │
  │──────────────────────────────>│                               │
  │                               │  1. Extract token from cookie  │
  │                               │  2. Verify refresh JWT         │
  │                               │     - Check signature          │
  │                               │     - Check expiry (7 days)    │
  │                               │  3. Extract { userId }         │
  │                               │  4. Find user (with           │
  │                               │     +refreshToken field) ────>│
  │                               │  5. bcrypt.compare(            │
  │                               │     cookie token, stored hash) │
  │                               │  6. Check user.isActive        │
  │                               │  7. Check user.isBanned        │
  │                               │                               │
  │                               │  ── TOKEN ROTATION ──         │
  │                               │  8. Generate new access JWT    │
  │                               │  9. Generate new refresh JWT   │
  │                               │  10. Hash new refresh token    │
  │                               │  11. Store new hash ──────────>│
  │                               │                               │
  │  200 { accessToken: "new..." }│                               │
  │  Set-Cookie: refreshToken=new │                               │
  │<──────────────────────────────│                               │
  │                               │                               │
  │  [Retry original API call     │                               │
  │   with new access token]      │                               │
```

**Error paths:**
- No cookie present → 401 `AUTH_INVALID_TOKEN`
- Invalid JWT signature → 401 `AUTH_INVALID_TOKEN`
- Expired refresh JWT → 401 `AUTH_TOKEN_EXPIRED` → redirect to /login
- Token hash mismatch (stolen/reused) → 401 `AUTH_INVALID_TOKEN` → clear stored token (revoke all sessions)
- User banned since last login → 403 `ACCOUNT_BANNED`
- User deactivated → 401 `AUTH_INVALID_TOKEN`

### Security measures:
- **Token rotation:** Every refresh issues a completely new refresh token. The old one is invalidated
- **Hash comparison:** Even if someone intercepts the refresh JWT, it must match the hash stored in the database
- **Stolen token detection:** If a refresh token is used but doesn't match the stored hash, it means either the legitimate user or an attacker already rotated. Clear the stored token to force re-login
- **HTTP-only cookie:** Refresh token is never accessible to JavaScript — immune to XSS
- **Secure + SameSite:** Cookie only sent over HTTPS and to same-site requests

### Client-side implementation:
```typescript
// Axios response interceptor (simplified)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(error.config);  // retry original request
      } catch (refreshError) {
        // Refresh failed — redirect to login
        clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Flow 4: Logout

```
Client                          Server                         Database
  │                               │                               │
  │  POST /auth/logout            │                               │
  │  Authorization: Bearer <jwt>  │                               │
  │  Cookie: refreshToken=eyJ...  │                               │
  │──────────────────────────────>│                               │
  │                               │  1. Verify access token        │
  │                               │  2. Find user ────────────────>│
  │                               │  3. Clear refreshToken field   │
  │                               │     (set to undefined) ──────>│
  │                               │                               │
  │  200 { message: "Logged out" }│                               │
  │  Set-Cookie: refreshToken=;   │                               │
  │    Max-Age=0 (clear cookie)   │                               │
  │<──────────────────────────────│                               │
  │                               │                               │
  │  [Client clears accessToken   │                               │
  │   from memory, redirects to   │                               │
  │   /login]                     │                               │
```

**Error paths:**
- Not authenticated → 401 `AUTH_INVALID_TOKEN`

### What happens after logout:
- Access token in memory is discarded by the client
- Refresh token cookie is cleared by Set-Cookie with Max-Age=0
- Refresh token hash in database is cleared — even if someone has the old refresh JWT, it won't match any stored hash
- Any attempt to use the old access token will work until it expires (15 minutes max) — this is acceptable because access tokens are short-lived

---

## Complete User Journey (Happy Path)

```
1. User opens /login
2. Enters phone: +919876543210
3. Clicks "Send OTP"
   → POST /auth/otp/send
   → OTP logged to console (dev mode): "OTP for +919876543210: 847291"

4. Enters OTP: 847291
5. Clicks "Verify"
   → POST /auth/otp/verify
   → Receives accessToken + refreshToken cookie
   → Redirected to /verify (email not yet verified)

6. Enters email: creator@example.com
7. Clicks "Send Verification Email"
   → POST /auth/email/send
   → Email sent with link: http://localhost:3000/verify?token=eyJ...

8. Clicks link in email (or pastes token)
   → GET /auth/email/verify/:token
   → emailVerified = true
   → Redirected to / (dashboard)

9. Dashboard shows: "Welcome, +919876543210" with verified status

10. [15 minutes later — access token expires]
    → Axios interceptor catches 401
    → POST /auth/refresh (cookie sent automatically)
    → New accessToken received, original request retried
    → User sees no interruption

11. User clicks "Logout"
    → POST /auth/logout
    → Cookie cleared, token invalidated
    → Redirected to /login
```

---

## Token Lifecycle Summary

```
                    ┌─────────────────────┐
                    │    OTP Verified      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Access Token (15m)  │──── expires ────┐
                    │  Refresh Token (7d)  │                 │
                    └──────────┬──────────┘                 │
                               │                            │
                    ┌──────────▼──────────┐      ┌─────────▼─────────┐
                    │   Normal API calls   │      │  /auth/refresh     │
                    │   (Bearer token)     │      │  (cookie → rotate) │
                    └──────────┬──────────┘      └─────────┬─────────┘
                               │                            │
                               │         ┌──────────────────┘
                               │         │  New tokens issued
                               │         │
                    ┌──────────▼─────────▼┐
                    │      /auth/logout    │
                    │  (clear everything)  │
                    └─────────────────────┘
```

---

## Rate Limiting Summary

| Endpoint | Window | Max Requests | Scope |
|----------|--------|-------------|-------|
| All API routes | 15 min | 100 | Per IP |
| `/auth/otp/send` | 15 min | 10 | Per IP |
| `/auth/otp/send` (per phone) | 15 min | 3 | Per phone number (app-level) |
| `/auth/email/send` | 60 sec | 1 | Per user (app-level cooldown) |
| OTP verification attempts | — | 5 | Per user, then 30-min lockout |
