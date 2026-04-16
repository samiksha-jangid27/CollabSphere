# CollabSphere — API Specification (Sprints 1–4)

Base URL: `http://localhost:5001/api/v1`

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

# Sprint 2 — Profile System

## 8. POST `/profiles`

Create a profile for the authenticated user. One profile per user is enforced.

**Auth:** Bearer token required
**Rate Limit:** Standard

### Request
```json
{
  "displayName": "Aarav Sharma",
  "bio": "Travel photographer and adventure vlogger",
  "niche": ["travel", "photography"],
  "interests": ["hiking", "camping"],
  "contentTypes": ["reels", "stories"],
  "collaborationPreferences": {
    "types": ["paid", "barter"],
    "openToCollab": true,
    "preferredPlatforms": ["instagram", "youtube"]
  },
  "contactInfo": {
    "email": "aarav@example.com",
    "website": "https://aarav.com",
    "visibility": "public"
  },
  "location": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "coordinates": [72.8777, 19.076]
  }
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| displayName | string | Yes | Max 60 characters |
| bio | string | No | Max 500 characters |
| niche | array | No | Array of niche strings |
| interests | array | No | Array of interest strings |
| contentTypes | array | No | Array of content type strings |
| collaborationPreferences | object | No | Collab configuration |
| contactInfo | object | No | Contact visibility settings |
| location | object | No | GeoJSON Point with city/state/country |

### Response — 201 Created
```json
{
  "success": true,
  "data": {
    "profile": {
      "_id": "664b2c3d4e5f6a7b8c9d0e1f",
      "userId": "664a1b2c3d4e5f6a7b8c9d0e",
      "displayName": "Aarav Sharma",
      "bio": "Travel photographer and adventure vlogger",
      "avatar": null,
      "coverImage": null,
      "niche": ["travel", "photography"],
      "interests": ["hiking", "camping"],
      "contentTypes": ["reels", "stories"],
      "collaborationPreferences": {
        "types": ["paid", "barter"],
        "openToCollab": true,
        "preferredPlatforms": ["instagram", "youtube"]
      },
      "contactInfo": {
        "email": "aarav@example.com",
        "website": "https://aarav.com",
        "visibility": "public"
      },
      "location": {
        "type": "Point",
        "coordinates": [72.8777, 19.076],
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "isVerified": false,
      "followerCount": 0,
      "profileCompleteness": 45,
      "createdAt": "2026-04-15T10:30:00.000Z",
      "updatedAt": "2026-04-15T10:30:00.000Z"
    }
  },
  "message": "Profile created successfully"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Required fields missing or invalid format |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 409 | `PROFILE_ALREADY_EXISTS` | User already has a profile |

---

## 9. GET `/profiles/me`

Get the authenticated user's profile.

**Auth:** Bearer token required
**Rate Limit:** Standard

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "profile": {
      "_id": "664b2c3d4e5f6a7b8c9d0e1f",
      "userId": "664a1b2c3d4e5f6a7b8c9d0e",
      "displayName": "Aarav Sharma",
      "bio": "Travel photographer and adventure vlogger",
      "avatar": "https://res.cloudinary.com/...",
      "coverImage": "https://res.cloudinary.com/...",
      "niche": ["travel", "photography"],
      "interests": ["hiking", "camping"],
      "contentTypes": ["reels", "stories"],
      "collaborationPreferences": { },
      "contactInfo": { },
      "location": { },
      "isVerified": false,
      "followerCount": 0,
      "profileCompleteness": 75,
      "createdAt": "2026-04-15T10:30:00.000Z",
      "updatedAt": "2026-04-15T10:35:00.000Z"
    }
  },
  "message": "Profile retrieved"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `PROFILE_NOT_FOUND` | User has not created a profile yet |

---

## 10. PATCH `/profiles/me`

Update the authenticated user's profile.

**Auth:** Bearer token required
**Rate Limit:** Standard

### Request
Same structure as POST `/profiles`, all fields optional.

### Response — 200 OK
Returns updated profile object (same shape as GET `/profiles/me`).

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid field values |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `PROFILE_NOT_FOUND` | User has no profile |

---

## 11. DELETE `/profiles/me`

Delete the authenticated user's profile.

**Auth:** Bearer token required
**Rate Limit:** Standard

### Response — 200 OK
```json
{
  "success": true,
  "data": null,
  "message": "Profile deleted"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `PROFILE_NOT_FOUND` | User has no profile |

---

## 12. POST `/profiles/me/avatar`

Upload or replace the user's avatar image.

**Auth:** Bearer token required
**Rate Limit:** Standard
**Content-Type:** `multipart/form-data`

### Request
- Form field: `file` (binary image file)
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "avatar": "https://res.cloudinary.com/collabsphere/image/upload/v1234567890/collabsphere/avatars/user123.jpg"
  },
  "message": "Avatar uploaded"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `PROFILE_INVALID_FILE` | No file provided or invalid MIME type |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `PROFILE_NOT_FOUND` | User has no profile |
| 413 | `VALIDATION_ERROR` | File exceeds 5 MB size limit |

---

## 13. POST `/profiles/me/cover`

Upload or replace the user's cover image.

**Auth:** Bearer token required
**Rate Limit:** Standard
**Content-Type:** `multipart/form-data`

### Request
- Form field: `file` (binary image file)
- Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`
- Max file size: 5 MB

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "coverImage": "https://res.cloudinary.com/collabsphere/image/upload/v1234567890/collabsphere/covers/user123.jpg"
  },
  "message": "Cover image uploaded"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `PROFILE_INVALID_FILE` | No file provided or invalid MIME type |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `PROFILE_NOT_FOUND` | User has no profile |
| 413 | `VALIDATION_ERROR` | File exceeds 5 MB size limit |

---

## 14. GET `/profiles/:id`

Get a profile by profile ID.

**Auth:** Bearer token required
**Rate Limit:** Standard

### URL Parameters
| Param | Type | Validation |
|-------|------|------------|
| id | string | Valid MongoDB ObjectId |

### Response — 200 OK
Returns profile object (same shape as GET `/profiles/me`).

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 404 | `PROFILE_NOT_FOUND` | Profile with ID doesn't exist |

---

## 15. GET `/geocode`


## 15. GET `/geocode`

**Auth:** Bearer token required
**Rate Limit:** 30 requests / minute per client

### Headers
```
Authorization: Bearer <accessToken>
```

### Query Parameters

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| q | string | Yes | 2 to 120 characters |

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "displayName": "Mumbai, Maharashtra, India",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "lat": 19.076,
        "lng": 72.8777
      }
    ]
  },
  "message": "Geocode results"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | `q` missing or fewer than 2 characters |
| 401 | `AUTH_INVALID_TOKEN` | Missing or invalid access token |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded (30 per minute) |
| 502 | `GEOCODE_UPSTREAM_ERROR` | Nominatim unavailable or returned a non 2xx response |

---

## 16. GET `/search/profiles`

**Auth:** None (public endpoint)
**Rate Limit:** 100 requests / minute per client

### Query Parameters

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| city | string | Conditional | 1 to 80 characters |
| niche | string | Conditional | 1 to 80 characters |
| platform | string | Conditional | 1 to 80 characters |

*At least one of `city`, `niche`, or `platform` is required.*

### Response — 200 OK
```json
{
  "success": true,
  "data": [
    {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "userId": "664a1b2c3d4e5f6a7b8c9d0a",
      "displayName": "Aarav Shah",
      "bio": "Fashion creator from Mumbai",
      "avatar": "https://res.cloudinary.com/...",
      "niche": ["fashion", "lifestyle"],
      "location": {
        "type": "Point",
        "coordinates": [72.8479, 19.0176],
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      },
      "profileCompleteness": 85,
      "isVerified": false
    }
  ],
  "message": "Found 5 profiles"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `INVALID_SEARCH_FILTERS` | No filters provided (city, niche, platform all missing) |
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |

---

## 17. GET `/search/cities`

**Auth:** None (public endpoint)
**Rate Limit:** 100 requests / minute per client

### Query Parameters

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| q | string | No | 0 to 80 characters (prefix search) |

*If `q` is not provided, returns all cities.*

### Response — 200 OK
```json
{
  "success": true,
  "data": ["Mumbai", "Delhi", "Bangalore", "Kolkata", "Chennai"],
  "message": "Cities retrieved"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 429 | `TOO_MANY_REQUESTS` | Rate limit exceeded |

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
| `USER_NOT_FOUND` | 404 | User does not exist |
| `PROFILE_NOT_FOUND` | 404 | Profile does not exist or not created yet |
| `PROFILE_ALREADY_EXISTS` | 409 | User already has a profile |
| `PROFILE_INVALID_FILE` | 400 | Invalid file or MIME type for upload |
| `PROFILE_UPLOAD_FAILED` | 400 | Cloudinary upload error |
| `TOO_MANY_REQUESTS` | 429 | General rate limit exceeded |
| `GEOCODE_UPSTREAM_ERROR` | 502 | Nominatim geocode service unavailable |
| `INVALID_SEARCH_FILTERS` | 400 | No search filters provided (city, niche, platform all missing) |
| `SEARCH_FAILED` | 500 | Search service error |
| `COLLAB_REQUEST_NOT_FOUND` | 404 | Collaboration request does not exist |
| `COLLAB_UNAUTHORIZED` | 403 | User is not authorized (not recipient or sender, or invalid role) |
| `COLLAB_INVALID_STATUS_TRANSITION` | 400 | Cannot perform action on request with current status |
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

---

## 18. POST `/collaborations`

Create a collaboration request (brand sends to creator).

**Auth:** Required (brand role only)

### Request
```json
{
  "userId": "664a1b2c3d4e5f6a7b8c9d0e",
  "title": "Fashion Campaign",
  "description": "Looking for fashion influencers for summer campaign",
  "budget": 50000,
  "deadline": "2026-05-16T00:00:00.000Z"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| userId | string | Yes | Valid MongoDB ObjectId (creator receiving) |
| title | string | Yes | 1–200 characters |
| description | string | Yes | 1–2000 characters |
| budget | number | Yes | Positive integer |
| deadline | string | Yes | ISO 8601 date, must be in future |

### Response — 201 Created
```json
{
  "success": true,
  "data": {
    "collaboration": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "userId": "664a1b2c3d4e5f6a7b8c9d0f",
      "brandId": "664a1b2c3d4e5f6a7b8c9d0e",
      "title": "Fashion Campaign",
      "description": "Looking for fashion influencers for summer campaign",
      "budget": 50000,
      "deadline": "2026-05-16T00:00:00.000Z",
      "status": "Open",
      "createdAt": "2026-04-16T10:30:00.000Z",
      "updatedAt": "2026-04-16T10:30:00.000Z"
    }
  },
  "message": "Request created"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 400 | `VALIDATION_ERROR` | Deadline is in the past |
| 401 | `AUTH_INVALID_TOKEN` | Invalid JWT |
| 403 | `COLLAB_UNAUTHORIZED` | User is not a brand |

---

## 19. GET `/collaborations/inbox`

Get collaboration requests received by creator (paginated).

**Auth:** Required (creator role only)

### Query Parameters
```
?page=1&status=Open
```

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| page | number | 1 | 1–∞ |
| status | string | (all) | `Open`, `Accepted`, `Declined`, `Closed` (optional) |
| limit | number | 10 | 1–100 |

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "664a1b2c3d4e5f6a7b8c9d0e",
        "userId": "664a1b2c3d4e5f6a7b8c9d0f",
        "brandId": "664a1b2c3d4e5f6a7b8c9d0e",
        "title": "Fashion Campaign",
        "description": "...",
        "budget": 50000,
        "deadline": "2026-05-16T00:00:00.000Z",
        "status": "Open",
        "createdAt": "2026-04-16T10:30:00.000Z",
        "updatedAt": "2026-04-16T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "hasNext": false
    }
  },
  "message": "Inbox retrieved"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Invalid JWT |
| 403 | `COLLAB_UNAUTHORIZED` | User is not a creator |

---

## 20. GET `/collaborations/sent`

Get collaboration requests sent by brand (paginated).

**Auth:** Required (brand role only)

### Query Parameters
```
?page=1&status=Open
```

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| page | number | 1 | 1–∞ |
| status | string | (all) | `Open`, `Pending`, `Accepted`, `Declined`, `Closed` (optional) |
| limit | number | 10 | 1–100 |

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "664a1b2c3d4e5f6a7b8c9d0e",
        "userId": "664a1b2c3d4e5f6a7b8c9d0f",
        "brandId": "664a1b2c3d4e5f6a7b8c9d0e",
        "title": "Fashion Campaign",
        "description": "...",
        "budget": 50000,
        "deadline": "2026-05-16T00:00:00.000Z",
        "status": "Open",
        "createdAt": "2026-04-16T10:30:00.000Z",
        "updatedAt": "2026-04-16T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "hasNext": true
    }
  },
  "message": "Sent requests retrieved"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Invalid JWT |
| 403 | `COLLAB_UNAUTHORIZED` | User is not a brand |

---

## 21. PATCH `/collaborations/:id/accept`

Accept a collaboration request (creator only).

**Auth:** Required (creator role, must be recipient)

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "collaboration": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "userId": "664a1b2c3d4e5f6a7b8c9d0f",
      "brandId": "664a1b2c3d4e5f6a7b8c9d0e",
      "title": "Fashion Campaign",
      "description": "...",
      "budget": 50000,
      "deadline": "2026-05-16T00:00:00.000Z",
      "status": "Accepted",
      "createdAt": "2026-04-16T10:30:00.000Z",
      "updatedAt": "2026-04-16T11:45:00.000Z"
    }
  },
  "message": "Request accepted"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Invalid JWT |
| 404 | `COLLAB_REQUEST_NOT_FOUND` | Request not found |
| 403 | `COLLAB_UNAUTHORIZED` | User is not the recipient or request already declined |
| 400 | `COLLAB_INVALID_STATUS_TRANSITION` | Request status doesn't allow accept |

---

## 22. PATCH `/collaborations/:id/decline`

Decline a collaboration request (creator only).

**Auth:** Required (creator role, must be recipient)

### Response — 200 OK
```json
{
  "success": true,
  "data": {
    "collaboration": {
      "_id": "664a1b2c3d4e5f6a7b8c9d0e",
      "userId": "664a1b2c3d4e5f6a7b8c9d0f",
      "brandId": "664a1b2c3d4e5f6a7b8c9d0e",
      "title": "Fashion Campaign",
      "description": "...",
      "budget": 50000,
      "deadline": "2026-05-16T00:00:00.000Z",
      "status": "Declined",
      "createdAt": "2026-04-16T10:30:00.000Z",
      "updatedAt": "2026-04-16T11:45:00.000Z"
    }
  },
  "message": "Request declined"
}
```

### Errors
| Status | Code | When |
|--------|------|------|
| 401 | `AUTH_INVALID_TOKEN` | Invalid JWT |
| 404 | `COLLAB_REQUEST_NOT_FOUND` | Request not found |
| 403 | `COLLAB_UNAUTHORIZED` | User is not the recipient or request already accepted |
| 400 | `COLLAB_INVALID_STATUS_TRANSITION` | Request status doesn't allow decline |
