# CollabSphere — Sprint 1 Data Model

## Overview

Sprint 1 uses a single MongoDB collection: **`users`**. The document design prioritizes atomic OTP operations (embedded subdocument) and clean separation between auth data and future profile data (separate collection in Sprint 2).

---

## User Collection Schema

```typescript
interface IUser extends Document {
  _id: Types.ObjectId;

  // Identity
  phone: string;
  email: string;

  // Verification status
  phoneVerified: boolean;
  emailVerified: boolean;

  // Access control
  role: 'creator' | 'brand' | 'admin';
  isActive: boolean;
  isBanned: boolean;

  // Session
  refreshToken?: string;  // bcrypt hashed

  // OTP (embedded subdocument)
  otp?: {
    code: string;          // bcrypt hashed
    expiresAt: Date;
    attempts: number;      // failed verification attempts
    requestCount: number;  // OTP send requests in current window
    lastRequestAt: Date;   // timestamp of last OTP request
    lockedUntil?: Date;    // set after 5 failed attempts
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Field Specifications

### Identity Fields

| Field | Type | Required | Unique | Default | Validation |
|-------|------|----------|--------|---------|------------|
| `phone` | String | Yes | Yes | — | E.164 format: `^\+[1-9]\d{1,14}$` |
| `email` | String | Yes | Yes | — | Standard email regex |

**Notes:**
- Phone is the primary login identifier (OTP-based, no passwords)
- Email is required for account completion but can be set after initial OTP login
- Both fields are indexed for fast lookup

### Verification Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `phoneVerified` | Boolean | No | `false` | Set to `true` after first successful OTP verification |
| `emailVerified` | Boolean | No | `false` | Set to `true` after email link confirmation |

### Access Control Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `role` | String (enum) | Yes | — | `'creator'`, `'brand'`, or `'admin'` |
| `isActive` | Boolean | No | `true` | Soft delete flag — set to `false` to deactivate |
| `isBanned` | Boolean | No | `false` | Admin ban flag — banned users cannot log in |

**Role enum values:**
- `creator` — Content creators and influencers
- `brand` — Companies and agencies
- `admin` — Platform moderators (created manually or seeded)

### Session Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `refreshToken` | String | No | `undefined` | bcrypt hash of the active refresh JWT. Cleared on logout. `undefined` = no active session |

### OTP Subdocument

The OTP is embedded directly in the user document (not a separate collection) for atomic operations.

| Field | Type | Description |
|-------|------|-------------|
| `otp.code` | String | bcrypt hash of the 6-digit OTP |
| `otp.expiresAt` | Date | OTP expiry timestamp (current time + 5 minutes) |
| `otp.attempts` | Number | Failed verification attempts (resets on success or new OTP) |
| `otp.requestCount` | Number | Number of OTP send requests in the current rate window |
| `otp.lastRequestAt` | Date | Timestamp of the most recent OTP request |
| `otp.lockedUntil` | Date | If set and in the future, user cannot attempt OTP verification |

**OTP lifecycle:**
1. `sendOtp` → generate code, hash it, set `expiresAt`, increment `requestCount`
2. `verifyOtp` (success) → clear entire `otp` subdocument, set `phoneVerified = true`
3. `verifyOtp` (failure) → increment `attempts`. If `attempts >= 5`, set `lockedUntil` to now + 30 minutes
4. Rate window resets when `lastRequestAt` is older than 15 minutes

### Timestamps

| Field | Type | Description |
|-------|------|-------------|
| `createdAt` | Date | Auto-set by Mongoose `timestamps: true` |
| `updatedAt` | Date | Auto-updated by Mongoose `timestamps: true` |

---

## Indexes

| Index | Type | Purpose |
|-------|------|---------|
| `{ phone: 1 }` | Unique | Login lookup by phone, uniqueness enforcement |
| `{ email: 1 }` | Unique, Sparse | Email verification lookup. Sparse because email may be null initially |

**Why sparse on email:** During initial OTP signup, the user may not have provided an email yet. A sparse unique index allows multiple documents with `null` email while still enforcing uniqueness when email is set.

---

## Mongoose Schema Definition

```typescript
const userSchema = new Schema<IUser>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
      validate: /^\+[1-9]\d{1,14}$/,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['creator', 'brand', 'admin'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    otp: {
      code: String,
      expiresAt: Date,
      attempts: { type: Number, default: 0 },
      requestCount: { type: Number, default: 0 },
      lastRequestAt: Date,
      lockedUntil: Date,
    },
  },
  {
    timestamps: true,
  }
);
```

---

## toJSON Override

The User model overrides `toJSON()` to strip sensitive fields from API responses:

```typescript
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.otp;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};
```

This ensures that OTP codes, refresh tokens, and version keys are never accidentally exposed in API responses.

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| OTP embedded in User doc | Atomic operations — no cross-collection transactions needed. OTP is always read/written alongside the user |
| bcrypt for OTP hashing | Prevents plaintext OTP exposure if database is compromised. Same approach as password hashing |
| Refresh token hashed in User | Single active session per user (simple for Sprint 1). Multi-device support would require a separate Sessions collection |
| Separate User and Profile collections | Auth logic stays isolated from public profile data. Profile collection added in Sprint 2 with a 1:1 `userId` reference |
| Email as sparse unique | Allows OTP signup without email, while preventing duplicate emails when set |
| Role as required field | Set during OTP verification based on user selection or defaulted to 'creator'. Admin role is seeded/assigned manually |

---

## Migration Notes (for Sprint 2)

When Sprint 2 adds the Profile collection:
- Profile will reference `userId` with a unique constraint (1:1 relationship)
- User collection will NOT store profile data — clean separation
- The `2dsphere` index for geospatial queries goes on Profile.location, not User
