# Sprint 2 — Profile System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the full Profile System — one profile per user, CRUD, media uploads (avatar + cover), location, niche/interests, and the frontend pages to create, view, and edit it.

**Architecture:** Backend adds a new `profile` module following the existing layered pattern (routes → controller → service → repository → model). Cloudinary is wired via a shared provider. Frontend adds `(main)/profile/*` pages wired through `services/profileService.ts`. All work is TDD (Jest + Supertest + mongodb-memory-server on the server, React Testing Library optional on the client — manual browser test is the minimum bar).

**Tech Stack:** TypeScript strict, Express 5, Mongoose 9, Zod 4, Cloudinary SDK, Next.js 14 App Router, Tailwind CSS, Framer Motion, Axios.

**Spec sources:**
- Notion: [04 Database Design](https://www.notion.so/7fc9178a83e5493da0463f8de2d04910) — Profile schema
- Notion: [05 API Design](https://www.notion.so/5b00bca529ff472494ae0bb47a5dad5b) — Profile endpoints
- Notion: [09 UI/UX Direction](https://www.notion.so/00dd3cfe3c894b339b4968b59da358d3) — Profile page design
- Notion: [10 Roadmap](https://www.notion.so/8b370ef6be0144d2b8f3dbbb3a0a2e94) — Sprint 2 checklist

**Scope in:** Profile model, CRUD endpoints, avatar/cover upload, profile completeness, location picker data shape, frontend view/edit/create pages.
**Scope out (deferred to Sprint 3+):** Media portfolio (MediaPost), SocialAccount OAuth linking, discovery/search, the full location autocomplete UX (we use lat/lng + city/state/country text in Sprint 2).

---

## File Structure

### Backend (`server/`)

| File | Purpose |
|---|---|
| `src/models/Profile.ts` *(new)* | Mongoose schema + `IProfile` interface with GeoJSON location, niche/interests, completeness |
| `src/config/cloudinary.ts` *(new)* | Cloudinary SDK config + upload helper |
| `src/modules/profile/profile.interfaces.ts` *(new)* | `IProfileService` interface for DIP |
| `src/modules/profile/profile.repository.ts` *(new)* | `ProfileRepository extends BaseRepository<IProfile>` |
| `src/modules/profile/profile.service.ts` *(new)* | Business logic: one-per-user enforcement, completeness calc, update merge |
| `src/modules/profile/profile.controller.ts` *(new)* | HTTP handlers for all 7 profile endpoints |
| `src/modules/profile/profile.validation.ts` *(new)* | Zod schemas for create/update/upload |
| `src/modules/profile/profile.routes.ts` *(new)* | Router wiring middleware + DI graph |
| `src/middleware/upload.ts` *(new)* | `multer` in-memory storage middleware for image uploads |
| `src/shared/errors.ts` *(modify)* | Add `PROFILE_NOT_FOUND`, `PROFILE_ALREADY_EXISTS`, `PROFILE_UPLOAD_FAILED` codes |
| `src/shared/constants.ts` *(modify)* | Add niche enum, file size limits, allowed MIME types |
| `src/config/environment.ts` *(modify)* | Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| `src/index.ts` *(modify)* | Mount `profileRoutes` at `/api/v1/profiles` |
| `.env.example` *(modify)* | Document Cloudinary env vars |
| `tests/profile/profile.model.test.ts` *(new)* | Unit tests for Profile schema |
| `tests/profile/profile.repository.test.ts` *(new)* | Repository tests against in-memory DB |
| `tests/profile/profile.service.test.ts` *(new)* | Service logic tests with mocked repo |
| `tests/profile/profile.integration.test.ts` *(new)* | Supertest integration against all 7 endpoints |

### Frontend (`client/`)

| File | Purpose |
|---|---|
| `src/services/profileService.ts` *(new)* | Typed API client for profile endpoints |
| `src/types/profile.ts` *(new)* | Shared `Profile` TS types |
| `src/app/(main)/layout.tsx` *(new)* | Main app shell (nav + content area) |
| `src/app/(main)/profile/me/page.tsx` *(new)* | Own profile view |
| `src/app/(main)/profile/me/edit/page.tsx` *(new)* | Profile create/edit form |
| `src/app/(main)/profile/[id]/page.tsx` *(new)* | View any profile by ID |
| `src/components/profile/ProfileHeader.tsx` *(new)* | Cover image + avatar + name + verified badge |
| `src/components/profile/ProfileBio.tsx` *(new)* | Bio + niche tags + interests |
| `src/components/profile/ProfileEditForm.tsx` *(new)* | Controlled form for create/edit |
| `src/components/profile/AvatarUpload.tsx` *(new)* | Drag/drop avatar upload with preview |
| `src/components/profile/NicheSelector.tsx` *(new)* | Multi-select pill picker |
| `src/components/profile/LocationPicker.tsx` *(new)* | Lat/lng + city/state/country inputs |
| `src/components/profile/CompletenessIndicator.tsx` *(new)* | 0–100 progress ring |
| `src/hooks/useProfile.ts` *(new)* | Data-fetching hook wrapping profileService |

---

## Backend Tasks

### Task 1: Extend error codes and constants

**Files:**
- Modify: `server/src/shared/errors.ts`
- Modify: `server/src/shared/constants.ts`

- [ ] **Step 1: Add profile error codes to `errors.ts`**

Open `server/src/shared/errors.ts` and add these entries inside the `ERROR_CODES` object after the `USER_NOT_FOUND` line:

```typescript
  // Profile
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
  PROFILE_ALREADY_EXISTS: 'PROFILE_ALREADY_EXISTS',
  PROFILE_UPLOAD_FAILED: 'PROFILE_UPLOAD_FAILED',
  PROFILE_INVALID_FILE: 'PROFILE_INVALID_FILE',
```

- [ ] **Step 2: Add profile constants to `constants.ts`**

Open `server/src/shared/constants.ts` and append:

```typescript
export const PROFILE_CONFIG = {
  MAX_BIO_LENGTH: 500,
  MAX_NICHE_COUNT: 5,
  MAX_INTERESTS_COUNT: 10,
  ALLOWED_NICHES: [
    'fashion', 'beauty', 'travel', 'food', 'fitness', 'gaming',
    'tech', 'finance', 'education', 'lifestyle', 'music', 'art',
    'photography', 'comedy', 'parenting', 'sports', 'business',
  ] as const,
  ALLOWED_PLATFORMS: ['instagram', 'youtube', 'twitter', 'tiktok', 'linkedin'] as const,
  COLLAB_TYPES: ['paid', 'barter', 'shoutout', 'content', 'event'] as const,
} as const;

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_MIME: ['image/jpeg', 'image/png', 'image/webp'],
} as const;
```

- [ ] **Step 3: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: PASS (no type errors).

- [ ] **Step 4: Commit**

```bash
git add server/src/shared/errors.ts server/src/shared/constants.ts
git commit -m "feat(server): add profile error codes and config constants"
```

---

### Task 2: Add Cloudinary env vars

**Files:**
- Modify: `server/src/config/environment.ts`
- Modify: `server/.env.example`

- [ ] **Step 1: Add Cloudinary keys to the Zod env schema**

In `server/src/config/environment.ts`, inside the `envSchema` object (after `SMTP_PASS`):

```typescript
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
```

- [ ] **Step 2: Document env vars in `.env.example`**

Append to `server/.env.example`:

```
# Cloudinary (media uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

- [ ] **Step 3: Commit**

```bash
git add server/src/config/environment.ts server/.env.example
git commit -m "feat(server): add Cloudinary env configuration"
```

---

### Task 3: Write failing tests for Profile model

**Files:**
- Create: `server/tests/profile/profile.model.test.ts`

- [ ] **Step 1: Write the failing model tests**

Create `server/tests/profile/profile.model.test.ts`:

```typescript
// ABOUTME: Unit tests for the Profile Mongoose model — schema constraints, defaults, indexes.
// ABOUTME: Runs against mongodb-memory-server for isolation.

import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { Profile } from '@/models/Profile';
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

async function createUser() {
  return User.create({ phone: '+919876543210', role: 'creator' });
}

describe('Profile Model', () => {
  it('creates a profile with minimal required fields', async () => {
    const user = await createUser();
    const profile = await Profile.create({
      userId: user._id,
      displayName: 'Aarav',
    });
    expect(profile._id).toBeDefined();
    expect(profile.displayName).toBe('Aarav');
    expect(profile.niche).toEqual([]);
    expect(profile.isVerified).toBe(false);
    expect(profile.profileCompleteness).toBe(0);
  });

  it('enforces one profile per user via unique index on userId', async () => {
    const user = await createUser();
    await Profile.create({ userId: user._id, displayName: 'First' });
    await expect(
      Profile.create({ userId: user._id, displayName: 'Second' }),
    ).rejects.toThrow();
  });

  it('rejects profile without userId', async () => {
    await expect(
      Profile.create({ displayName: 'Ghost' } as any),
    ).rejects.toThrow();
  });

  it('stores location as a GeoJSON Point', async () => {
    const user = await createUser();
    const profile = await Profile.create({
      userId: user._id,
      displayName: 'Maya',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.076],
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
      },
    });
    expect(profile.location?.coordinates).toEqual([72.8777, 19.076]);
    expect(profile.location?.city).toBe('Mumbai');
  });

  it('caps bio length at 500 characters', async () => {
    const user = await createUser();
    const longBio = 'x'.repeat(501);
    await expect(
      Profile.create({ userId: user._id, displayName: 'X', bio: longBio }),
    ).rejects.toThrow();
  });

  it('has a 2dsphere index on location', async () => {
    const indexes = await Profile.collection.indexes();
    const geoIndex = indexes.find((i) => i.key.location === '2dsphere');
    expect(geoIndex).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `cd server && npx jest tests/profile/profile.model.test.ts`
Expected: FAIL — "Cannot find module '@/models/Profile'".

---

### Task 4: Implement Profile model

**Files:**
- Create: `server/src/models/Profile.ts`

- [ ] **Step 1: Create the Profile model**

Create `server/src/models/Profile.ts`:

```typescript
// ABOUTME: Profile Mongoose model — one profile per user with GeoJSON location and 2dsphere index.
// ABOUTME: Models the public-facing identity layer on top of User.

import { Schema, model, Document, Types } from 'mongoose';
import { PROFILE_CONFIG } from '../shared/constants';

export interface IGeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
  city?: string;
  state?: string;
  country?: string;
}

export interface ICollaborationPreferences {
  types: string[];
  openToCollab: boolean;
  preferredPlatforms: string[];
}

export interface IContactInfo {
  email?: string;
  website?: string;
  whatsapp?: string;
  visibility: 'public' | 'connections' | 'hidden';
}

export interface IProfile extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  niche: string[];
  interests: string[];
  contentTypes: string[];
  collaborationPreferences: ICollaborationPreferences;
  contactInfo: IContactInfo;
  location?: IGeoLocation;
  isVerified: boolean;
  verifiedAt?: Date;
  followerCount: number;
  profileCompleteness: number;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<IGeoLocation>(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: 'Coordinates must be [lng, lat]',
      },
    },
    city: String,
    state: String,
    country: String,
  },
  { _id: false },
);

const profileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      maxlength: 60,
    },
    bio: { type: String, maxlength: PROFILE_CONFIG.MAX_BIO_LENGTH },
    avatar: String,
    coverImage: String,
    niche: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    contentTypes: { type: [String], default: [] },
    collaborationPreferences: {
      types: { type: [String], default: [] },
      openToCollab: { type: Boolean, default: true },
      preferredPlatforms: { type: [String], default: [] },
    },
    contactInfo: {
      email: String,
      website: String,
      whatsapp: String,
      visibility: {
        type: String,
        enum: ['public', 'connections', 'hidden'],
        default: 'connections',
      },
    },
    location: locationSchema,
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    followerCount: { type: Number, default: 0 },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true },
);

profileSchema.index({ location: '2dsphere' });
profileSchema.index({ niche: 1 });
profileSchema.index({ isVerified: 1 });
profileSchema.index({ followerCount: -1 });

export const Profile = model<IProfile>('Profile', profileSchema);
```

- [ ] **Step 2: Run tests to confirm they pass**

Run: `cd server && npx jest tests/profile/profile.model.test.ts`
Expected: PASS (6/6 tests).

- [ ] **Step 3: Commit**

```bash
git add server/src/models/Profile.ts server/tests/profile/profile.model.test.ts
git commit -m "feat(server): add Profile model with GeoJSON location and 2dsphere index"
```

---

### Task 5: Cloudinary config and upload helper

**Files:**
- Create: `server/src/config/cloudinary.ts`

- [ ] **Step 1: Install the Cloudinary SDK and multer**

Run: `cd server && npm install cloudinary multer && npm install -D @types/multer`
Expected: both packages added to `package.json`.

- [ ] **Step 2: Create the Cloudinary config module**

Create `server/src/config/cloudinary.ts`:

```typescript
// ABOUTME: Cloudinary SDK configuration and upload helper for profile media.
// ABOUTME: Uploads go through in-memory buffer — no filesystem writes.

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { config } from './environment';
import { AppError, ERROR_CODES } from '../shared/errors';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadImageBuffer(
  buffer: Buffer,
  folder: 'avatars' | 'covers',
  publicId: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `collabsphere/${folder}`,
        public_id: publicId,
        overwrite: true,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(AppError.internal('Cloudinary upload failed'));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export { cloudinary };
```

- [ ] **Step 3: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server/package.json server/package-lock.json server/src/config/cloudinary.ts
git commit -m "feat(server): add Cloudinary config and upload helper"
```

---

### Task 6: Multer upload middleware

**Files:**
- Create: `server/src/middleware/upload.ts`

- [ ] **Step 1: Create the upload middleware**

Create `server/src/middleware/upload.ts`:

```typescript
// ABOUTME: Multer middleware — in-memory storage with MIME and size validation.
// ABOUTME: Used by profile routes for avatar and cover image uploads.

import multer from 'multer';
import { UPLOAD_CONFIG } from '../shared/constants';
import { AppError, ERROR_CODES } from '../shared/errors';

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!UPLOAD_CONFIG.ALLOWED_IMAGE_MIME.includes(file.mimetype as any)) {
      cb(
        AppError.badRequest(
          'Only JPEG, PNG, and WEBP images are allowed',
          ERROR_CODES.PROFILE_INVALID_FILE,
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single('image');
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/upload.ts
git commit -m "feat(server): add multer upload middleware for profile images"
```

---

### Task 7: Profile Zod validation schemas

**Files:**
- Create: `server/src/modules/profile/profile.validation.ts`

- [ ] **Step 1: Create the validation file**

Create `server/src/modules/profile/profile.validation.ts`:

```typescript
// ABOUTME: Zod schemas for profile create, update, and upload endpoints.
// ABOUTME: Consumed by validate() middleware on profile routes.

import { z } from 'zod';
import { PROFILE_CONFIG } from '../../shared/constants';

const locationSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
});

const contactInfoSchema = z.object({
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  whatsapp: z.string().optional(),
  visibility: z.enum(['public', 'connections', 'hidden']).default('connections'),
});

const collaborationPrefsSchema = z.object({
  types: z.array(z.string()).default([]),
  openToCollab: z.boolean().default(true),
  preferredPlatforms: z.array(z.string()).default([]),
});

export const createProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).max(60),
    bio: z.string().max(PROFILE_CONFIG.MAX_BIO_LENGTH).optional(),
    niche: z.array(z.string()).max(PROFILE_CONFIG.MAX_NICHE_COUNT).default([]),
    interests: z.array(z.string()).max(PROFILE_CONFIG.MAX_INTERESTS_COUNT).default([]),
    contentTypes: z.array(z.string()).default([]),
    collaborationPreferences: collaborationPrefsSchema.optional(),
    contactInfo: contactInfoSchema.optional(),
    location: locationSchema.optional(),
  }),
});

export const updateProfileSchema = z.object({
  body: createProfileSchema.shape.body.partial(),
});

export const profileIdParamsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid profile ID'),
  }),
});
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/profile/profile.validation.ts
git commit -m "feat(server): add profile Zod validation schemas"
```

---

### Task 8: Write failing repository tests

**Files:**
- Create: `server/tests/profile/profile.repository.test.ts`

- [ ] **Step 1: Write the repo tests**

Create `server/tests/profile/profile.repository.test.ts`:

```typescript
// ABOUTME: Repository-level tests for ProfileRepository against an in-memory MongoDB.
// ABOUTME: Validates one-per-user enforcement and findByUserId lookup.

import { Types } from 'mongoose';
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
  return User.create({ phone: '+919876543210', role: 'creator' });
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
```

- [ ] **Step 2: Run and confirm failure**

Run: `cd server && npx jest tests/profile/profile.repository.test.ts`
Expected: FAIL — "Cannot find module '@/modules/profile/profile.repository'".

---

### Task 9: Implement ProfileRepository

**Files:**
- Create: `server/src/modules/profile/profile.repository.ts`

- [ ] **Step 1: Create the repository**

Create `server/src/modules/profile/profile.repository.ts`:

```typescript
// ABOUTME: ProfileRepository — extends BaseRepository and adds findByUserId for 1:1 lookup.
// ABOUTME: All profile DB access goes through this class.

import { BaseRepository } from '../../shared/BaseRepository';
import { Profile, IProfile } from '../../models/Profile';

export class ProfileRepository extends BaseRepository<IProfile> {
  constructor() {
    super(Profile);
  }

  async findByUserId(userId: string): Promise<IProfile | null> {
    return this.model.findOne({ userId });
  }
}
```

- [ ] **Step 2: Run and confirm pass**

Run: `cd server && npx jest tests/profile/profile.repository.test.ts`
Expected: PASS (3/3).

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/profile/profile.repository.ts server/tests/profile/profile.repository.test.ts
git commit -m "feat(server): add ProfileRepository with findByUserId"
```

---

### Task 10: Profile service interface + failing tests

**Files:**
- Create: `server/src/modules/profile/profile.interfaces.ts`
- Create: `server/tests/profile/profile.service.test.ts`

- [ ] **Step 1: Create the service interface**

Create `server/src/modules/profile/profile.interfaces.ts`:

```typescript
// ABOUTME: IProfileService interface — controllers depend on this, not the concrete class.
// ABOUTME: Enables dependency inversion and test substitution.

import { IProfile } from '../../models/Profile';

export interface CreateProfileInput {
  displayName: string;
  bio?: string;
  niche?: string[];
  interests?: string[];
  contentTypes?: string[];
  collaborationPreferences?: IProfile['collaborationPreferences'];
  contactInfo?: IProfile['contactInfo'];
  location?: IProfile['location'];
}

export type UpdateProfileInput = Partial<CreateProfileInput>;

export interface IProfileService {
  createProfile(userId: string, input: CreateProfileInput): Promise<IProfile>;
  getProfileByUserId(userId: string): Promise<IProfile>;
  getProfileById(id: string): Promise<IProfile>;
  updateProfile(userId: string, input: UpdateProfileInput): Promise<IProfile>;
  deleteProfile(userId: string): Promise<void>;
  uploadAvatar(userId: string, buffer: Buffer): Promise<string>;
  uploadCover(userId: string, buffer: Buffer): Promise<string>;
  calculateCompleteness(profile: IProfile): number;
}
```

- [ ] **Step 2: Write failing service tests**

Create `server/tests/profile/profile.service.test.ts`:

```typescript
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
```

- [ ] **Step 3: Confirm failure**

Run: `cd server && npx jest tests/profile/profile.service.test.ts`
Expected: FAIL — "Cannot find module '@/modules/profile/profile.service'".

---

### Task 11: Implement ProfileService

**Files:**
- Create: `server/src/modules/profile/profile.service.ts`

- [ ] **Step 1: Implement the service**

Create `server/src/modules/profile/profile.service.ts`:

```typescript
// ABOUTME: ProfileService — business logic for profile CRUD, uploads, and completeness scoring.
// ABOUTME: Enforces one profile per user and centralizes media upload side-effects.

import { ProfileRepository } from './profile.repository';
import { IProfileService, CreateProfileInput, UpdateProfileInput } from './profile.interfaces';
import { IProfile } from '../../models/Profile';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { uploadImageBuffer } from '../../config/cloudinary';

export class ProfileService implements IProfileService {
  constructor(private readonly repo: ProfileRepository) {}

  async createProfile(userId: string, input: CreateProfileInput): Promise<IProfile> {
    const existing = await this.repo.findByUserId(userId);
    if (existing) {
      throw AppError.conflict(
        'A profile already exists for this user',
        ERROR_CODES.PROFILE_ALREADY_EXISTS,
      );
    }
    const profile = await this.repo.create({ ...input, userId } as any);
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return profile;
  }

  async getProfileByUserId(userId: string): Promise<IProfile> {
    const profile = await this.repo.findByUserId(userId);
    if (!profile) {
      throw AppError.notFound('Profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async getProfileById(id: string): Promise<IProfile> {
    const profile = await this.repo.findById(id);
    if (!profile) {
      throw AppError.notFound('Profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }
    return profile;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<IProfile> {
    const profile = await this.getProfileByUserId(userId);
    Object.assign(profile, input);
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return profile;
  }

  async deleteProfile(userId: string): Promise<void> {
    const profile = await this.getProfileByUserId(userId);
    await this.repo.deleteById(profile._id.toString());
  }

  async uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
    const profile = await this.getProfileByUserId(userId);
    const url = await uploadImageBuffer(buffer, 'avatars', profile._id.toString());
    profile.avatar = url;
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return url;
  }

  async uploadCover(userId: string, buffer: Buffer): Promise<string> {
    const profile = await this.getProfileByUserId(userId);
    const url = await uploadImageBuffer(buffer, 'covers', profile._id.toString());
    profile.coverImage = url;
    profile.profileCompleteness = this.calculateCompleteness(profile);
    await profile.save();
    return url;
  }

  calculateCompleteness(profile: IProfile): number {
    const checks: Array<[boolean, number]> = [
      [!!profile.displayName, 10],
      [!!profile.bio && profile.bio.length >= 20, 15],
      [!!profile.avatar, 15],
      [!!profile.coverImage, 10],
      [profile.niche.length > 0, 15],
      [profile.interests.length > 0, 10],
      [!!profile.location?.coordinates, 15],
      [profile.contentTypes.length > 0, 10],
    ];
    return checks.reduce((sum, [met, pts]) => sum + (met ? pts : 0), 0);
  }
}
```

- [ ] **Step 2: Run service tests**

Run: `cd server && npx jest tests/profile/profile.service.test.ts`
Expected: PASS (6/6).

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/profile/profile.interfaces.ts server/src/modules/profile/profile.service.ts server/tests/profile/profile.service.test.ts
git commit -m "feat(server): add ProfileService with completeness scoring and upload side-effects"
```

---

### Task 12: Profile controller

**Files:**
- Create: `server/src/modules/profile/profile.controller.ts`

- [ ] **Step 1: Create the controller**

Create `server/src/modules/profile/profile.controller.ts`:

```typescript
// ABOUTME: ProfileController — HTTP handlers for /api/v1/profiles endpoints.
// ABOUTME: Thin layer: parses req, delegates to service, formats response.

import { Request, Response, NextFunction } from 'express';
import { IProfileService } from './profile.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { HTTP_STATUS } from '../../shared/constants';

export class ProfileController {
  constructor(private readonly service: IProfileService) {}

  createProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.createProfile(req.user!.userId, req.body);
      sendSuccess(res, { profile }, 'Profile created successfully', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getProfileByUserId(req.user!.userId);
      sendSuccess(res, { profile }, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  };

  getProfileById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.getProfileById(req.params.id);
      sendSuccess(res, { profile }, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  };

  updateMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await this.service.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, { profile }, 'Profile updated');
    } catch (err) {
      next(err);
    }
  };

  deleteMyProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.deleteProfile(req.user!.userId);
      sendSuccess(res, null, 'Profile deleted');
    } catch (err) {
      next(err);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No file provided', ERROR_CODES.PROFILE_INVALID_FILE);
      }
      const url = await this.service.uploadAvatar(req.user!.userId, req.file.buffer);
      sendSuccess(res, { avatar: url }, 'Avatar uploaded');
    } catch (err) {
      next(err);
    }
  };

  uploadCover = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No file provided', ERROR_CODES.PROFILE_INVALID_FILE);
      }
      const url = await this.service.uploadCover(req.user!.userId, req.file.buffer);
      sendSuccess(res, { coverImage: url }, 'Cover image uploaded');
    } catch (err) {
      next(err);
    }
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: PASS. If the `req.user` type is missing, check that the existing auth flow's `Express.Request` augmentation is imported (it should already exist from Sprint 1).

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/profile/profile.controller.ts
git commit -m "feat(server): add ProfileController with 7 handlers"
```

---

### Task 13: Profile routes + mount in index

**Files:**
- Create: `server/src/modules/profile/profile.routes.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create the router**

Create `server/src/modules/profile/profile.routes.ts`:

```typescript
// ABOUTME: Profile route definitions — wires middleware, validation, upload, and controller.
// ABOUTME: Mounted at /api/v1/profiles in index.ts.

import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfileRepository } from './profile.repository';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { uploadSingleImage } from '../../middleware/upload';
import {
  createProfileSchema,
  updateProfileSchema,
  profileIdParamsSchema,
} from './profile.validation';

const repo = new ProfileRepository();
const service = new ProfileService(repo);
const controller = new ProfileController(service);

const router = Router();

router.post('/', authenticate, validate(createProfileSchema), controller.createProfile);
router.get('/me', authenticate, controller.getMyProfile);
router.patch('/me', authenticate, validate(updateProfileSchema), controller.updateMyProfile);
router.delete('/me', authenticate, controller.deleteMyProfile);
router.post('/me/avatar', authenticate, uploadSingleImage, controller.uploadAvatar);
router.post('/me/cover', authenticate, uploadSingleImage, controller.uploadCover);
router.get('/:id', authenticate, validate(profileIdParamsSchema), controller.getProfileById);

export default router;
```

- [ ] **Step 2: Mount the router in `index.ts`**

In `server/src/index.ts`, add the import at the top with other route imports:

```typescript
import profileRoutes from './modules/profile/profile.routes';
```

And add the mount after the auth route mount:

```typescript
app.use(`${API_PREFIX}/profiles`, profileRoutes);
```

- [ ] **Step 3: Mount the router in `testApp.ts` too**

In `server/tests/helpers/testApp.ts`, import and mount `profileRoutes` using the same pattern as `authRoutes`.

- [ ] **Step 4: Typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/profile/profile.routes.ts server/src/index.ts server/tests/helpers/testApp.ts
git commit -m "feat(server): mount profile routes at /api/v1/profiles"
```

---

### Task 14: Profile integration tests

**Files:**
- Create: `server/tests/profile/profile.integration.test.ts`

- [ ] **Step 1: Write the integration suite**

Create `server/tests/profile/profile.integration.test.ts`:

```typescript
// ABOUTME: Integration tests for all profile endpoints — auth, CRUD, upload stub.
// ABOUTME: Covers happy paths and the one-per-user constraint.

import request from 'supertest';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '../helpers/testApp';
import { User } from '@/models/User';
import { TokenService } from '@/modules/auth/token.service';

jest.mock('@/config/cloudinary', () => ({
  uploadImageBuffer: jest.fn().mockResolvedValue('https://cdn.test/fake.jpg'),
}));

const tokenService = new TokenService();
const API = '/api/v1/profiles';

beforeAll(async () => {
  await setupTestDb();
});
afterAll(async () => {
  await teardownTestDb();
});
afterEach(async () => {
  await clearCollections();
});

async function authedUser() {
  const user = await User.create({
    phone: '+919876543210',
    email: 'a@b.com',
    role: 'creator',
    phoneVerified: true,
  });
  const token = tokenService.generateAccessToken({ userId: user._id.toString(), role: user.role });
  return { user, token };
}

describe('Profile Integration', () => {
  it('creates a profile', async () => {
    const { token } = await authedUser();
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Aarav', niche: ['fashion'] });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profile.displayName).toBe('Aarav');
  });

  it('rejects creating a second profile', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'B' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROFILE_ALREADY_EXISTS');
  });

  it('GET /me returns own profile', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile.displayName).toBe('A');
  });

  it('GET /me returns 404 when no profile exists', async () => {
    const { token } = await authedUser();
    const res = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PATCH /me updates fields', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app)
      .patch(`${API}/me`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Updated bio text here' });
    expect(res.status).toBe(200);
    expect(res.body.data.profile.bio).toBe('Updated bio text here');
  });

  it('DELETE /me removes the profile', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const del = await request(app).delete(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
    const get = await request(app).get(`${API}/me`).set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it('POST /me/avatar uploads and returns the URL', async () => {
    const { token } = await authedUser();
    await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const res = await request(app)
      .post(`${API}/me/avatar`)
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake'), { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(200);
    expect(res.body.data.avatar).toBe('https://cdn.test/fake.jpg');
  });

  it('GET /:id returns public profile', async () => {
    const { token } = await authedUser();
    const created = await request(app).post(API).set('Authorization', `Bearer ${token}`).send({ displayName: 'A' });
    const id = created.body.data.profile._id;
    const res = await request(app).get(`${API}/${id}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.profile._id).toBe(id);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app).get(`${API}/me`);
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run all profile tests**

Run: `cd server && npx jest tests/profile`
Expected: PASS (all suites green).

- [ ] **Step 3: Run full test suite to catch regressions**

Run: `cd server && npm test`
Expected: PASS (auth + profile suites).

- [ ] **Step 4: Commit**

```bash
git add server/tests/profile/profile.integration.test.ts
git commit -m "test(server): add profile integration suite covering all 7 endpoints"
```

---

## Frontend Tasks

### Task 15: Profile types and service

**Files:**
- Create: `client/src/types/profile.ts`
- Create: `client/src/services/profileService.ts`

- [ ] **Step 1: Create shared Profile TS types**

Create `client/src/types/profile.ts`:

```typescript
// ABOUTME: Shared Profile TS types mirroring the server model shape.

export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number];
  city?: string;
  state?: string;
  country?: string;
}

export interface CollaborationPreferences {
  types: string[];
  openToCollab: boolean;
  preferredPlatforms: string[];
}

export interface ContactInfo {
  email?: string;
  website?: string;
  whatsapp?: string;
  visibility: 'public' | 'connections' | 'hidden';
}

export interface Profile {
  _id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  niche: string[];
  interests: string[];
  contentTypes: string[];
  collaborationPreferences: CollaborationPreferences;
  contactInfo: ContactInfo;
  location?: GeoLocation;
  isVerified: boolean;
  followerCount: number;
  profileCompleteness: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateProfileInput = Omit<
  Profile,
  '_id' | 'userId' | 'isVerified' | 'followerCount' | 'profileCompleteness' | 'createdAt' | 'updatedAt' | 'avatar' | 'coverImage'
>;

export type UpdateProfileInput = Partial<CreateProfileInput>;
```

- [ ] **Step 2: Create the profile API client**

Create `client/src/services/profileService.ts`:

```typescript
// ABOUTME: Typed client for /api/v1/profiles endpoints — wraps the shared Axios instance.

import api from './api';
import { Profile, CreateProfileInput, UpdateProfileInput } from '@/types/profile';

export const profileService = {
  async create(input: CreateProfileInput): Promise<Profile> {
    const { data } = await api.post('/profiles', input);
    return data.data.profile;
  },
  async getMe(): Promise<Profile> {
    const { data } = await api.get('/profiles/me');
    return data.data.profile;
  },
  async getById(id: string): Promise<Profile> {
    const { data } = await api.get(`/profiles/${id}`);
    return data.data.profile;
  },
  async update(input: UpdateProfileInput): Promise<Profile> {
    const { data } = await api.patch('/profiles/me', input);
    return data.data.profile;
  },
  async uploadAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/profiles/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.avatar;
  },
  async uploadCover(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post('/profiles/me/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data.coverImage;
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/types/profile.ts client/src/services/profileService.ts
git commit -m "feat(client): add profile types and API service"
```

---

### Task 16: `useProfile` hook

**Files:**
- Create: `client/src/hooks/useProfile.ts`

- [ ] **Step 1: Create the hook**

Create `client/src/hooks/useProfile.ts`:

```typescript
// ABOUTME: Data-fetching hook for the current user's profile — handles loading and 404.

'use client';

import { useEffect, useState, useCallback } from 'react';
import { profileService } from '@/services/profileService';
import { Profile } from '@/types/profile';

interface State {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  hasProfile: boolean;
}

export function useProfile() {
  const [state, setState] = useState<State>({
    profile: null,
    loading: true,
    error: null,
    hasProfile: false,
  });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const profile = await profileService.getMe();
      setState({ profile, loading: false, error: null, hasProfile: true });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setState({ profile: null, loading: false, error: null, hasProfile: false });
      } else {
        setState({
          profile: null,
          loading: false,
          error: err.response?.data?.error?.message ?? 'Failed to load profile',
          hasProfile: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { ...state, refetch: fetch };
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useProfile.ts
git commit -m "feat(client): add useProfile data hook"
```

---

### Task 17: Main app shell layout

**Files:**
- Create: `client/src/app/(main)/layout.tsx`

- [ ] **Step 1: Create the layout**

Create `client/src/app/(main)/layout.tsx`:

```tsx
// ABOUTME: Main authenticated app shell — top nav + content area.
// ABOUTME: Redirects unauthenticated users to /login.

'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login');
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <header className="border-b border-border bg-bg-secondary">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/profile/me" className="text-lg font-semibold">
            CollabSphere
          </Link>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="/profile/me">Profile</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/\(main\)/layout.tsx
git commit -m "feat(client): add authenticated main app shell layout"
```

---

### Task 18: Profile view page (`/profile/me`)

**Files:**
- Create: `client/src/app/(main)/profile/me/page.tsx`
- Create: `client/src/components/profile/ProfileHeader.tsx`
- Create: `client/src/components/profile/ProfileBio.tsx`
- Create: `client/src/components/profile/CompletenessIndicator.tsx`

- [ ] **Step 1: Create `CompletenessIndicator`**

Create `client/src/components/profile/CompletenessIndicator.tsx`:

```tsx
// ABOUTME: Circular progress indicator showing profile completeness 0-100.

interface Props { value: number }

export function CompletenessIndicator({ value }: Props) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-32 overflow-hidden rounded-pill bg-surface">
        <div
          className="h-full bg-accent-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-sm text-text-secondary">{clamped}% complete</span>
    </div>
  );
}
```

- [ ] **Step 2: Create `ProfileHeader`**

Create `client/src/components/profile/ProfileHeader.tsx`:

```tsx
// ABOUTME: Profile header — cover image, avatar, display name, verified badge.

import { Profile } from '@/types/profile';

export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-card overflow-hidden bg-bg-secondary border border-border">
      <div
        className="h-40 bg-bg-tertiary bg-cover bg-center"
        style={profile.coverImage ? { backgroundImage: `url(${profile.coverImage})` } : undefined}
      />
      <div className="flex items-end gap-4 px-6 pb-6 -mt-10">
        <div className="h-24 w-24 rounded-pill border-4 border-bg-secondary bg-surface overflow-hidden">
          {profile.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar} alt={profile.displayName} className="h-full w-full object-cover" />
          )}
        </div>
        <div className="pb-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {profile.displayName}
            {profile.isVerified && <span className="text-success">✓</span>}
          </h1>
          {profile.location?.city && (
            <p className="text-sm text-text-secondary">
              {profile.location.city}
              {profile.location.country ? `, ${profile.location.country}` : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `ProfileBio`**

Create `client/src/components/profile/ProfileBio.tsx`:

```tsx
// ABOUTME: Displays bio, niche tags, and interests for a profile.

import { Profile } from '@/types/profile';

export function ProfileBio({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-4 rounded-card border border-border bg-bg-secondary p-6">
      {profile.bio && <p className="text-text-primary">{profile.bio}</p>}
      {profile.niche.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.niche.map((n) => (
            <span key={n} className="rounded-pill bg-accent-soft px-3 py-1 text-xs text-accent-primary">
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create the page**

Create `client/src/app/(main)/profile/me/page.tsx`:

```tsx
// ABOUTME: Own profile view — shows profile, or prompts to create one.

'use client';

import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileBio } from '@/components/profile/ProfileBio';
import { CompletenessIndicator } from '@/components/profile/CompletenessIndicator';

export default function MyProfilePage() {
  const { profile, loading, error, hasProfile } = useProfile();

  if (loading) return <div className="text-text-secondary">Loading profile...</div>;
  if (error) return <div className="text-error">{error}</div>;

  if (!hasProfile) {
    return (
      <div className="rounded-card border border-border bg-bg-secondary p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold">Let's build your profile</h2>
        <p className="mb-6 text-text-secondary">
          Add your bio, niche, and location to start connecting with collaborators.
        </p>
        <Link
          href="/profile/me/edit"
          className="inline-block rounded-button bg-accent-primary px-5 py-2.5 text-sm font-medium text-white"
        >
          Create profile
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <CompletenessIndicator value={profile!.profileCompleteness} />
        <Link
          href="/profile/me/edit"
          className="rounded-button border border-border px-4 py-2 text-sm text-text-primary hover:bg-surface"
        >
          Edit profile
        </Link>
      </div>
      <ProfileHeader profile={profile!} />
      <ProfileBio profile={profile!} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/app/\(main\)/profile/me/page.tsx client/src/components/profile/ProfileHeader.tsx client/src/components/profile/ProfileBio.tsx client/src/components/profile/CompletenessIndicator.tsx
git commit -m "feat(client): add profile view page with header, bio, completeness"
```

---

### Task 19: Profile edit form components

**Files:**
- Create: `client/src/components/profile/NicheSelector.tsx`
- Create: `client/src/components/profile/LocationPicker.tsx`
- Create: `client/src/components/profile/AvatarUpload.tsx`
- Create: `client/src/components/profile/ProfileEditForm.tsx`

- [ ] **Step 1: Create `NicheSelector`**

Create `client/src/components/profile/NicheSelector.tsx`:

```tsx
// ABOUTME: Multi-select pill picker for niche tags — capped at 5 selections.

const ALL_NICHES = [
  'fashion','beauty','travel','food','fitness','gaming','tech','finance',
  'education','lifestyle','music','art','photography','comedy','parenting','sports','business',
];

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
}

export function NicheSelector({ value, onChange, max = 5 }: Props) {
  const toggle = (n: string) => {
    if (value.includes(n)) onChange(value.filter((v) => v !== n));
    else if (value.length < max) onChange([...value, n]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_NICHES.map((n) => {
        const active = value.includes(n);
        return (
          <button
            key={n}
            type="button"
            onClick={() => toggle(n)}
            className={`rounded-pill px-3 py-1 text-xs transition-colors ${
              active
                ? 'bg-accent-primary text-white'
                : 'border border-border text-text-secondary hover:bg-surface'
            }`}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `LocationPicker`**

Create `client/src/components/profile/LocationPicker.tsx`:

```tsx
// ABOUTME: Simple lat/lng + city/state/country input group. No autocomplete in Sprint 2.

import { GeoLocation } from '@/types/profile';

interface Props {
  value?: GeoLocation;
  onChange: (next: GeoLocation | undefined) => void;
}

export function LocationPicker({ value, onChange }: Props) {
  const update = (patch: Partial<GeoLocation>) => {
    const base: GeoLocation = value ?? { type: 'Point', coordinates: [0, 0] };
    onChange({ ...base, ...patch });
  };
  return (
    <div className="grid grid-cols-2 gap-3">
      <input
        placeholder="City"
        value={value?.city ?? ''}
        onChange={(e) => update({ city: e.target.value })}
        className="rounded-button border border-border bg-surface px-3 py-2 text-sm"
      />
      <input
        placeholder="State"
        value={value?.state ?? ''}
        onChange={(e) => update({ state: e.target.value })}
        className="rounded-button border border-border bg-surface px-3 py-2 text-sm"
      />
      <input
        placeholder="Country"
        value={value?.country ?? ''}
        onChange={(e) => update({ country: e.target.value })}
        className="rounded-button border border-border bg-surface px-3 py-2 text-sm"
      />
      <input
        placeholder="Lat, Lng (e.g. 19.076, 72.877)"
        defaultValue={value ? `${value.coordinates[1]}, ${value.coordinates[0]}` : ''}
        onBlur={(e) => {
          const [lat, lng] = e.target.value.split(',').map((x) => Number(x.trim()));
          if (!isNaN(lat) && !isNaN(lng)) update({ coordinates: [lng, lat] });
        }}
        className="rounded-button border border-border bg-surface px-3 py-2 text-sm"
      />
    </div>
  );
}
```

- [ ] **Step 3: Create `AvatarUpload`**

Create `client/src/components/profile/AvatarUpload.tsx`:

```tsx
// ABOUTME: Avatar upload with preview — POSTs to /profiles/me/avatar on file select.

'use client';

import { useState } from 'react';
import { profileService } from '@/services/profileService';

interface Props {
  currentUrl?: string;
  onUploaded: (url: string) => void;
}

export function AvatarUpload({ currentUrl, onUploaded }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const url = await profileService.uploadAvatar(file);
      onUploaded(url);
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="h-20 w-20 overflow-hidden rounded-pill border border-border bg-surface">
        {currentUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt="avatar" className="h-full w-full object-cover" />
        )}
      </div>
      <div>
        <label className="inline-block cursor-pointer rounded-button border border-border px-4 py-2 text-sm hover:bg-surface">
          {uploading ? 'Uploading...' : 'Change avatar'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </label>
        {error && <p className="mt-1 text-xs text-error">{error}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `ProfileEditForm`**

Create `client/src/components/profile/ProfileEditForm.tsx`:

```tsx
// ABOUTME: Controlled form for creating or editing a profile. Calls profileService on submit.

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Profile, CreateProfileInput } from '@/types/profile';
import { profileService } from '@/services/profileService';
import { NicheSelector } from './NicheSelector';
import { LocationPicker } from './LocationPicker';
import { AvatarUpload } from './AvatarUpload';

interface Props {
  initial?: Profile | null;
}

export function ProfileEditForm({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<CreateProfileInput>({
    displayName: initial?.displayName ?? '',
    bio: initial?.bio ?? '',
    niche: initial?.niche ?? [],
    interests: initial?.interests ?? [],
    contentTypes: initial?.contentTypes ?? [],
    collaborationPreferences: initial?.collaborationPreferences ?? {
      types: [],
      openToCollab: true,
      preferredPlatforms: [],
    },
    contactInfo: initial?.contactInfo ?? { visibility: 'connections' },
    location: initial?.location,
  });
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (initial) await profileService.update(form);
      else await profileService.create(form);
      router.push('/profile/me');
    } catch (err: any) {
      setError(err.response?.data?.error?.message ?? 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {initial && (
        <AvatarUpload currentUrl={avatarUrl} onUploaded={setAvatarUrl} />
      )}

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Display name</label>
        <input
          required
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="w-full rounded-button border border-border bg-surface px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-text-secondary">Bio</label>
        <textarea
          rows={4}
          maxLength={500}
          value={form.bio ?? ''}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className="w-full rounded-button border border-border bg-surface px-3 py-2"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-text-secondary">Niche (max 5)</label>
        <NicheSelector
          value={form.niche ?? []}
          onChange={(niche) => setForm({ ...form, niche })}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-text-secondary">Location</label>
        <LocationPicker
          value={form.location}
          onChange={(location) => setForm({ ...form, location })}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-button bg-accent-primary px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Saving...' : initial ? 'Save changes' : 'Create profile'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-button border border-border px-5 py-2.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/profile/NicheSelector.tsx client/src/components/profile/LocationPicker.tsx client/src/components/profile/AvatarUpload.tsx client/src/components/profile/ProfileEditForm.tsx
git commit -m "feat(client): add profile edit form components"
```

---

### Task 20: Profile edit page

**Files:**
- Create: `client/src/app/(main)/profile/me/edit/page.tsx`

- [ ] **Step 1: Create the page**

Create `client/src/app/(main)/profile/me/edit/page.tsx`:

```tsx
// ABOUTME: Profile create/edit page — loads existing profile if present, shows form.

'use client';

import { useProfile } from '@/hooks/useProfile';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';

export default function EditProfilePage() {
  const { profile, loading, hasProfile } = useProfile();
  if (loading) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">
        {hasProfile ? 'Edit profile' : 'Create profile'}
      </h1>
      <ProfileEditForm initial={profile} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/\(main\)/profile/me/edit/page.tsx
git commit -m "feat(client): add profile edit page"
```

---

### Task 21: Public profile view page

**Files:**
- Create: `client/src/app/(main)/profile/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Create `client/src/app/(main)/profile/[id]/page.tsx`:

```tsx
// ABOUTME: Public profile view page — fetches profile by ID from the URL param.

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { profileService } from '@/services/profileService';
import { Profile } from '@/types/profile';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileBio } from '@/components/profile/ProfileBio';

export default function ProfileByIdPage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    profileService
      .getById(params.id)
      .then(setProfile)
      .catch((err) => setError(err.response?.data?.error?.message ?? 'Not found'));
  }, [params.id]);

  if (error) return <div className="text-error">{error}</div>;
  if (!profile) return <div className="text-text-secondary">Loading...</div>;

  return (
    <div className="space-y-6">
      <ProfileHeader profile={profile} />
      <ProfileBio profile={profile} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/app/\(main\)/profile/\[id\]/page.tsx
git commit -m "feat(client): add public profile view by ID"
```

---

### Task 22: Manual end-to-end verification

**Files:** *(none — this is a verification task)*

- [ ] **Step 1: Start the dev servers**

Run: `npm run dev`
Expected: server on `:5001`, client on `:3000`.

- [ ] **Step 2: Walk the golden path in a browser**

1. Log in via phone OTP (read OTP from server terminal).
2. Visit `/profile/me` → should prompt "Let's build your profile".
3. Click "Create profile" → fill display name, bio, pick 2-3 niches, enter city + lat/lng.
4. Submit → redirected to `/profile/me` with profile shown.
5. Upload an avatar → image appears immediately.
6. Edit profile → change bio → save → reflected on view page.
7. Note the completeness percentage updates as fields fill.

- [ ] **Step 3: Record the result**

If any step fails, file a bug task. If all pass, mark Sprint 2 milestone complete in Notion (roadmap page).

- [ ] **Step 4: Final commit and push**

Confirm working tree clean:

```bash
git status
```

All Sprint 2 commits are already made task-by-task. Await Sarvesh's green hand before pushing or opening a PR.

---

## Self-Review Notes

**Spec coverage:** All 10 Sprint 2 checklist items from Notion are covered:
- ✅ Profile model with 1:1 User constraint (Task 4)
- ✅ Profile CRUD endpoints (Tasks 12-14)
- ✅ Cloudinary for media uploads (Task 5)
- ✅ Profile creation form (Task 19-20)
- ✅ Social handle management → **DEFERRED to Sprint 5** (OAuth linking lives there per roadmap; Sprint 2 covers only profile core). Flag to revisit if Sarvesh wants a manual-add stub now.
- ✅ Profile view page with portfolio grid → portfolio grid is MediaPost, which is also deferred. Core profile view ships in Task 18.
- ✅ Avatar and cover image upload (Tasks 5, 12-14, 19)
- ✅ Location picker (Task 19)
- ✅ Profile completeness indicator (Tasks 11, 18)
- ✅ Profile edit page (Task 20)

**Scope deferrals flagged:** MediaPost portfolio grid and SocialAccount linking are Sprint 3/Sprint 5 per the roadmap. Sprint 2 delivers the core profile; media portfolio can layer on top without schema changes.
