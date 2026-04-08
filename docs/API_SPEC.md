# CollabSphere — Sprint 1 API Specification

Base URL: `http://localhost:5000/api/v1`

## Standard Response Shapes

### Success
```json
{
  "success": true,
  "data": { },
  "message": "Operation completed successfully"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description"
  }
}
```

---

## 1. POST `/auth/otp/send`

Send a 6-digit OTP to a phone number. Creates the user if they don't exist.

**Auth:** Public
**Rate Limit:** 10 requests / 15 minutes per IP

### Request
```json
{
  "phone": "+919876543210"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| phone | string | Yes | E.164 format: `^\+[1-9]\d{1,14}$` |

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "phone": "+919876543210",
    "isNewUser": true
  },
  "message": "OTP sent successfully"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid phone format |
| 429 | `OTP_RATE_LIMITED` | 3+ OTP requests in 15 minutes for this phone |
| 403 | `ACCOUNT_LOCKED` | User locked out after 5 failed OTP attempts |
| 403 | `ACCOUNT_BANNED` | User account is banned |

---

## 2. POST `/auth/otp/verify`

Verify the OTP and issue JWT tokens. Sets `phoneVerified = true` on first verification.

**Auth:** Public
**Rate Limit:** 10 requests / 15 minutes per IP

### Request
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| phone | string | Yes | E.164 format |
| otp | string | Yes | Exactly 6 digits: `^\d{6}$` |

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "phone": "+919876543210",
      "email": null,
      "phoneVerified": true,
      "emailVerified": false,
      "role": "creator",
      "isActive": true,
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  },
  "message": "Login successful"
}
```

**Set-Cookie Header:**
```
refreshToken=eyJhbGciOiJIUzI1NiIs...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid phone or OTP format |
| 401 | `AUTH_INVALID_OTP` | OTP does not match |
| 401 | `AUTH_OTP_EXPIRED` | OTP has expired (>5 minutes) |
| 403 | `AUTH_OTP_LOCKED` | Locked after 5 failed attempts |
| 404 | `USER_NOT_FOUND` | No user with this phone (no OTP was sent) |

---

## 3. POST `/auth/email/send`

Send an email verification link to the user's email address.

**Auth:** Bearer token required
**Rate Limit:** Standard

### Request
```json
{
  "email": "creator@example.com"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Valid email format |

### Response — 200 OK
```json
{
  "success": true,
  "data": null,
  "message": "Verification email sent"
}
```

### Headers
```
Authorization: Bearer <accessToken>
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid email format |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 409 | `AUTH_EMAIL_ALREADY_VERIFIED` | Email already verified |
| 429 | `TOO_MANY_REQUESTS` | Re-send attempted within 60 seconds |

---

## 4. GET `/auth/email/verify/:token`

Confirm email verification via the link sent to user's email.

**Auth:** Public (token is in the URL)

### URL Parameters
| Param | Type | Validation |
|-------|------|------------|
| token | string | Non-empty JWT string |

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "emailVerified": true
  },
  "message": "Email verified successfully"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `AUTH_INVALID_TOKEN` | Token is malformed or invalid signature |
| 400 | `AUTH_TOKEN_EXPIRED` | Token has expired (>24 hours) |
| 409 | `AUTH_EMAIL_ALREADY_VERIFIED` | Email was already verified |

---

## 5. POST `/auth/refresh`

Rotate access and refresh tokens using the refresh token cookie.

**Auth:** Refresh token cookie required

### Request
No body required. Refresh token is read from the HTTP-only cookie.

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  },
  "message": "Token refreshed"
}
```

**Set-Cookie Header:** New refresh token cookie (same format as `/otp/verify`).

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | No cookie, invalid JWT, or token doesn't match stored hash |
| 401 | `AUTH_TOKEN_EXPIRED` | Refresh token has expired (>7 days) |
| 403 | `ACCOUNT_BANNED` | User account was banned since last login |

---

## 6. POST `/auth/logout`

Invalidate the refresh token and clear the cookie.

**Auth:** Bearer token required

### Request
No body required.

### Headers
```
Authorization: Bearer <accessToken>
```

### Response — 200 OK
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

**Set-Cookie Header:**
```
refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |

---

## 7. GET `/auth/me`

Get the current authenticated user's data.

**Auth:** Bearer token required

### Headers
```
Authorization: Bearer <accessToken>
```

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "phone": "+919876543210",
      "email": "creator@example.com",
      "phoneVerified": true,
      "emailVerified": true,
      "role": "creator",
      "isActive": true,
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:35:00.000Z"
    }
  },
  "message": "User retrieved"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `USER_NOT_FOUND` | User was deleted since token was issued |

---

## Error Code Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `AUTH_INVALID_OTP` | 401 | OTP doesn't match |
| `AUTH_OTP_EXPIRED` | 401 | OTP TTL exceeded (5 minutes) |
| `AUTH_OTP_LOCKED` | 403 | 5+ failed attempts, locked for 30 minutes |
| `AUTH_INVALID_TOKEN` | 401 | JWT missing, malformed, or signature invalid |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT TTL exceeded |
| `AUTH_EMAIL_ALREADY_VERIFIED` | 409 | Email already verified |
| `OTP_RATE_LIMITED` | 429 | Too many OTP requests for this phone |
| `ACCOUNT_BANNED` | 403 | User is banned by admin |
| `ACCOUNT_LOCKED` | 403 | Account locked due to OTP failures |
| `USER_NOT_FOUND` | 404 | User doesn't exist |
| `TOO_MANY_REQUESTS` | 429 | General rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Middleware Stack (applied in order)

```
1. cors({ origin: CLIENT_URL, credentials: true })
2. helmet()
3. express.json({ limit: '10kb' })
4. cookieParser()
5. rateLimiter (100 req/15min default)
6. [per-route] authLimiter (10 req/15min for auth routes)
7. [per-route] authenticate (JWT verification)
8. [per-route] authorize (role check)
9. [per-route] validate (Zod schema)
10. controller method
11. errorHandler (global catch)
```

---

## JWT Token Payloads

### Access Token
```json
{
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "role": "creator",
  "iat": 1712567400,
  "exp": 1712568300
}
```
Algorithm: HS256, Expiry: 15 minutes

### Refresh Token
```json
{
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "iat": 1712567400,
  "exp": 1713172200
}
```
Algorithm: HS256, Expiry: 7 days

### Email Verification Token
```json
{
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "email": "creator@example.com",
  "purpose": "email_verify",
  "iat": 1712567400,
  "exp": 1712653800
}
```
Algorithm: HS256, Expiry: 24 hours
