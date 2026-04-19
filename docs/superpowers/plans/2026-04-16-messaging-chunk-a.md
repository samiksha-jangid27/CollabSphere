# Sprint 5 Chunk A: Messaging Models + Backend Module + Tests

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create Conversation and Message Mongoose models, a full messaging REST module (6 files), and comprehensive unit + integration tests. Five endpoints: list conversations, get conversation, get messages, send message, mark read.

**Architecture:** Standard CollabSphere layered module — Route → Middleware → Controller → Service → Repository → Model. Repository extends BaseRepository. Service implements IMessagingService. All responses use sendSuccess/sendError. Auth via authenticate middleware. Both participants (creator + brand) can access all messaging endpoints.

**Tech Stack:** Express, Mongoose, Zod, Jest, Supertest, mongodb-memory-server

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `server/src/models/Conversation.ts` | Mongoose schema: participants, collaborationRequestId, lastMessage |
| Create | `server/src/models/Message.ts` | Mongoose schema: conversationId, senderId, content, readAt |
| Create | `server/src/modules/messaging/messaging.interfaces.ts` | IMessagingService, IMessagingRepository, DTOs |
| Create | `server/src/modules/messaging/messaging.validation.ts` | Zod schemas for all 5 endpoints |
| Create | `server/src/modules/messaging/messaging.repository.ts` | Extends BaseRepository, conversation + message queries |
| Create | `server/src/modules/messaging/messaging.service.ts` | Business logic, authorization, pagination |
| Create | `server/src/modules/messaging/messaging.controller.ts` | HTTP handlers for 5 endpoints |
| Create | `server/src/modules/messaging/messaging.routes.ts` | Route definitions with auth middleware |
| Modify | `server/src/shared/errors.ts` | Add messaging error codes |
| Modify | `server/src/index.ts` | Wire messaging routes |
| Create | `server/tests/messaging/messaging.service.test.ts` | Unit tests for service layer |
| Create | `server/tests/messaging/messaging.integration.test.ts` | Integration tests for HTTP endpoints |

---

### Task 1: Add Messaging Error Codes

**Files:**
- Modify: `server/src/shared/errors.ts`

- [ ] **Step 1: Add error codes to errors.ts**

In `server/src/shared/errors.ts`, add these codes inside the `ERROR_CODES` object, after the Collaboration section:

```typescript
  // Messaging
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
  CONVERSATION_UNAUTHORIZED: 'CONVERSATION_UNAUTHORIZED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/src/shared/errors.ts
git commit -m "feat(messaging): add messaging error codes to shared errors"
```

---

### Task 2: Create Conversation Model

**Files:**
- Create: `server/src/models/Conversation.ts`

- [ ] **Step 1: Write a minimal test to verify the model exists**

Create `server/tests/messaging/messaging.service.test.ts`:

```typescript
// ABOUTME: Unit tests for MessagingService — validates conversation/message business logic.
// ABOUTME: Uses in-memory MongoDB for repository tests.

import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { Conversation } from '@/models/Conversation';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

describe('Conversation Model', () => {
  it('creates a conversation with valid fields', async () => {
    const mongoose = await import('mongoose');
    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();
    const collabId = new mongoose.Types.ObjectId();

    const conv = await Conversation.create({
      participants: [userId1, userId2],
      collaborationRequestId: collabId,
    });

    expect(conv._id).toBeDefined();
    expect(conv.participants).toHaveLength(2);
    expect(conv.collaborationRequestId.toString()).toBe(collabId.toString());
    expect(conv.createdAt).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: FAIL — `Cannot find module '@/models/Conversation'`

- [ ] **Step 3: Create the Conversation model**

Create `server/src/models/Conversation.ts`:

```typescript
// ABOUTME: Conversation Mongoose model — represents a direct message thread between two users.
// ABOUTME: Created automatically when a collaboration request is accepted (one conversation per collab).

import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  collaborationRequestId: Types.ObjectId;
  lastMessage?: {
    content: string;
    senderId: Types.ObjectId;
    createdAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      required: [true, 'Participants are required'],
      validate: {
        validator: (v: Types.ObjectId[]) => v.length === 2,
        message: 'A conversation must have exactly 2 participants',
      },
    },
    collaborationRequestId: {
      type: Schema.Types.ObjectId,
      ref: 'CollaborationRequest',
      required: [true, 'Collaboration request ID is required'],
      unique: true,
    },
    lastMessage: {
      type: {
        content: { type: String, required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        createdAt: { type: Date, required: true },
      },
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ participants: 1 });

export const Conversation = model<IConversation>('Conversation', conversationSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: PASS — 1 test passing

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Conversation.ts server/tests/messaging/messaging.service.test.ts
git commit -m "feat(messaging): add Conversation model with participants and collab link"
```

---

### Task 3: Create Message Model

**Files:**
- Create: `server/src/models/Message.ts`

- [ ] **Step 1: Add Message model test to the test file**

Append to `server/tests/messaging/messaging.service.test.ts`, after the Conversation Model describe block:

```typescript
import { Message } from '@/models/Message';

describe('Message Model', () => {
  it('creates a message with valid fields', async () => {
    const mongoose = await import('mongoose');
    const convId = new mongoose.Types.ObjectId();
    const senderId = new mongoose.Types.ObjectId();

    const msg = await Message.create({
      conversationId: convId,
      senderId: senderId,
      content: 'Hello there',
    });

    expect(msg._id).toBeDefined();
    expect(msg.conversationId.toString()).toBe(convId.toString());
    expect(msg.senderId.toString()).toBe(senderId.toString());
    expect(msg.content).toBe('Hello there');
    expect(msg.readAt).toBeUndefined();
    expect(msg.createdAt).toBeDefined();
  });
});
```

Note: The `Message` import must be added at the top of the file alongside the `Conversation` import.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: FAIL — `Cannot find module '@/models/Message'`

- [ ] **Step 3: Create the Message model**

Create `server/src/models/Message.ts`:

```typescript
// ABOUTME: Message Mongoose model — a single chat message within a conversation.
// ABOUTME: Tracks sender, content, and read status; indexed for efficient conversation queries.

import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversationId: Types.ObjectId;
  senderId: Types.ObjectId;
  content: string;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    readAt: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, senderId: 1, readAt: 1 });

export const Message = model<IMessage>('Message', messageSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: PASS — 2 tests passing

- [ ] **Step 5: Commit**

```bash
git add server/src/models/Message.ts server/tests/messaging/messaging.service.test.ts
git commit -m "feat(messaging): add Message model with conversation and read indexes"
```

---

### Task 4: Create Messaging Interfaces

**Files:**
- Create: `server/src/modules/messaging/messaging.interfaces.ts`

- [ ] **Step 1: Create the interfaces file**

Create `server/src/modules/messaging/messaging.interfaces.ts`:

```typescript
// ABOUTME: IMessagingService and IMessagingRepository interfaces for the messaging module.
// ABOUTME: Defines DTOs, pagination types, and contracts for dependency inversion.

import { IConversation } from '../../models/Conversation';
import { IMessage } from '../../models/Message';

export interface SendMessageInput {
  content: string;
}

export interface MessageFilters {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

export interface IMessagingService {
  getConversations(userId: string, filters: MessageFilters): Promise<PaginatedResponse<IConversation>>;
  getConversation(conversationId: string, userId: string): Promise<IConversation>;
  getMessages(conversationId: string, userId: string, filters: MessageFilters): Promise<PaginatedResponse<IMessage>>;
  sendMessage(conversationId: string, senderId: string, input: SendMessageInput): Promise<IMessage>;
  markAsRead(conversationId: string, userId: string): Promise<void>;
}

export interface IMessagingRepository {
  findConversationsByUser(userId: string, filters: MessageFilters): Promise<{ docs: IConversation[]; total: number }>;
  findConversationById(id: string): Promise<IConversation | null>;
  findConversationByCollabId(collabRequestId: string): Promise<IConversation | null>;
  createConversation(data: Partial<IConversation>): Promise<IConversation>;
  findMessages(conversationId: string, filters: MessageFilters): Promise<{ docs: IMessage[]; total: number }>;
  createMessage(data: Partial<IMessage>): Promise<IMessage>;
  updateConversationLastMessage(conversationId: string, message: { content: string; senderId: string; createdAt: Date }): Promise<void>;
  markMessagesAsRead(conversationId: string, recipientId: string): Promise<number>;
  countUnread(conversationId: string, userId: string): Promise<number>;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd server && npx tsc --noEmit`
Expected: No errors (file is types-only)

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/messaging/messaging.interfaces.ts
git commit -m "feat(messaging): add messaging interfaces and DTOs"
```

---

### Task 5: Create Messaging Validation Schemas

**Files:**
- Create: `server/src/modules/messaging/messaging.validation.ts`

- [ ] **Step 1: Create the validation file**

Create `server/src/modules/messaging/messaging.validation.ts`:

```typescript
// ABOUTME: Zod validation schemas for messaging endpoints.
// ABOUTME: Validates params, query, and body at the route middleware layer.

import { z } from 'zod';

export const getConversationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(50).default(20),
  }),
});

export const conversationIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
});

export const getMessagesSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
  }),
});

export const sendMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
  body: z.object({
    content: z.string().min(1, 'Message content is required').max(5000, 'Message cannot exceed 5000 characters'),
  }),
});

export const markReadSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Conversation ID is required'),
  }),
});
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/messaging/messaging.validation.ts
git commit -m "feat(messaging): add Zod validation schemas for messaging endpoints"
```

---

### Task 6: Create Messaging Repository

**Files:**
- Create: `server/src/modules/messaging/messaging.repository.ts`

- [ ] **Step 1: Write repository tests**

Replace the entire content of `server/tests/messaging/messaging.service.test.ts` with the following (keeps model tests, adds repository tests):

```typescript
// ABOUTME: Unit tests for MessagingService — validates conversation/message business logic.
// ABOUTME: Uses in-memory MongoDB for repository tests.

import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { MessagingRepository } from '@/modules/messaging/messaging.repository';

const repo = new MessagingRepository();

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

describe('Conversation Model', () => {
  it('creates a conversation with valid fields', async () => {
    const userId1 = new mongoose.Types.ObjectId();
    const userId2 = new mongoose.Types.ObjectId();
    const collabId = new mongoose.Types.ObjectId();

    const conv = await Conversation.create({
      participants: [userId1, userId2],
      collaborationRequestId: collabId,
    });

    expect(conv._id).toBeDefined();
    expect(conv.participants).toHaveLength(2);
    expect(conv.collaborationRequestId.toString()).toBe(collabId.toString());
    expect(conv.createdAt).toBeDefined();
  });
});

describe('Message Model', () => {
  it('creates a message with valid fields', async () => {
    const convId = new mongoose.Types.ObjectId();
    const senderId = new mongoose.Types.ObjectId();

    const msg = await Message.create({
      conversationId: convId,
      senderId: senderId,
      content: 'Hello there',
    });

    expect(msg._id).toBeDefined();
    expect(msg.conversationId.toString()).toBe(convId.toString());
    expect(msg.senderId.toString()).toBe(senderId.toString());
    expect(msg.content).toBe('Hello there');
    expect(msg.readAt).toBeUndefined();
    expect(msg.createdAt).toBeDefined();
  });
});

describe('MessagingRepository', () => {
  let user1Id: mongoose.Types.ObjectId;
  let user2Id: mongoose.Types.ObjectId;
  let collabId: mongoose.Types.ObjectId;

  beforeEach(() => {
    user1Id = new mongoose.Types.ObjectId();
    user2Id = new mongoose.Types.ObjectId();
    collabId = new mongoose.Types.ObjectId();
  });

  describe('createConversation', () => {
    it('creates a conversation', async () => {
      const conv = await repo.createConversation({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      expect(conv._id).toBeDefined();
      expect(conv.participants).toHaveLength(2);
    });
  });

  describe('findConversationsByUser', () => {
    it('returns conversations for a user sorted by updatedAt desc', async () => {
      await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const collabId2 = new mongoose.Types.ObjectId();
      const user3Id = new mongoose.Types.ObjectId();
      await Conversation.create({
        participants: [user1Id, user3Id],
        collaborationRequestId: collabId2,
      });

      const result = await repo.findConversationsByUser(user1Id.toString(), { page: 1, limit: 10 });

      expect(result.docs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('does not return conversations the user is not in', async () => {
      const otherUser = new mongoose.Types.ObjectId();
      await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const result = await repo.findConversationsByUser(otherUser.toString(), { page: 1, limit: 10 });

      expect(result.docs).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('paginates results', async () => {
      for (let i = 0; i < 5; i++) {
        await Conversation.create({
          participants: [user1Id, new mongoose.Types.ObjectId()],
          collaborationRequestId: new mongoose.Types.ObjectId(),
        });
      }

      const result = await repo.findConversationsByUser(user1Id.toString(), { page: 1, limit: 2 });

      expect(result.docs).toHaveLength(2);
      expect(result.total).toBe(5);
    });
  });

  describe('findConversationById', () => {
    it('returns a conversation by ID', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const found = await repo.findConversationById(conv._id.toString());

      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(conv._id.toString());
    });

    it('returns null for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const found = await repo.findConversationById(fakeId.toString());

      expect(found).toBeNull();
    });
  });

  describe('createMessage + findMessages', () => {
    it('creates a message and retrieves it', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await repo.createMessage({
        conversationId: conv._id,
        senderId: user1Id,
        content: 'Test message',
      });

      const result = await repo.findMessages(conv._id.toString(), { page: 1, limit: 50 });

      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].content).toBe('Test message');
      expect(result.total).toBe(1);
    });

    it('returns messages sorted by createdAt desc', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await repo.createMessage({ conversationId: conv._id, senderId: user1Id, content: 'First' });
      await repo.createMessage({ conversationId: conv._id, senderId: user2Id, content: 'Second' });
      await repo.createMessage({ conversationId: conv._id, senderId: user1Id, content: 'Third' });

      const result = await repo.findMessages(conv._id.toString(), { page: 1, limit: 50 });

      expect(result.docs).toHaveLength(3);
      expect(result.docs[0].content).toBe('Third');
      expect(result.docs[2].content).toBe('First');
    });
  });

  describe('updateConversationLastMessage', () => {
    it('updates the lastMessage field on a conversation', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      const now = new Date();
      await repo.updateConversationLastMessage(conv._id.toString(), {
        content: 'Latest message',
        senderId: user1Id.toString(),
        createdAt: now,
      });

      const updated = await Conversation.findById(conv._id);
      expect(updated!.lastMessage).toBeDefined();
      expect(updated!.lastMessage!.content).toBe('Latest message');
    });
  });

  describe('markMessagesAsRead', () => {
    it('marks unread messages from the other user as read', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 1' });
      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 2' });
      await Message.create({ conversationId: conv._id, senderId: user1Id, content: 'My msg' });

      const count = await repo.markMessagesAsRead(conv._id.toString(), user1Id.toString());

      expect(count).toBe(2);

      const msgs = await Message.find({ conversationId: conv._id, senderId: user2Id });
      expect(msgs[0].readAt).toBeDefined();
      expect(msgs[1].readAt).toBeDefined();
    });
  });

  describe('countUnread', () => {
    it('counts unread messages for a user', async () => {
      const conv = await Conversation.create({
        participants: [user1Id, user2Id],
        collaborationRequestId: collabId,
      });

      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 1' });
      await Message.create({ conversationId: conv._id, senderId: user2Id, content: 'Msg 2' });
      await Message.create({ conversationId: conv._id, senderId: user1Id, content: 'My msg' });

      const count = await repo.countUnread(conv._id.toString(), user1Id.toString());

      expect(count).toBe(2);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: FAIL — `Cannot find module '@/modules/messaging/messaging.repository'`

- [ ] **Step 3: Create the repository**

Create `server/src/modules/messaging/messaging.repository.ts`:

```typescript
// ABOUTME: MessagingRepository — encapsulates all database queries for conversations and messages.
// ABOUTME: Extends BaseRepository for Conversation CRUD; adds message and read-status queries.

import { Types } from 'mongoose';
import { BaseRepository } from '../../shared/BaseRepository';
import { Conversation, IConversation } from '../../models/Conversation';
import { Message, IMessage } from '../../models/Message';
import { IMessagingRepository, MessageFilters } from './messaging.interfaces';

export class MessagingRepository extends BaseRepository<IConversation> implements IMessagingRepository {
  constructor() {
    super(Conversation);
  }

  async findConversationsByUser(
    userId: string,
    filters: MessageFilters,
  ): Promise<{ docs: IConversation[]; total: number }> {
    const query = { participants: new Types.ObjectId(userId) };
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Conversation.find(query)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('participants', 'username role'),
      Conversation.countDocuments(query),
    ]);

    return { docs, total };
  }

  async findConversationById(id: string): Promise<IConversation | null> {
    return Conversation.findById(id).populate('participants', 'username role');
  }

  async findConversationByCollabId(collabRequestId: string): Promise<IConversation | null> {
    return Conversation.findOne({ collaborationRequestId: new Types.ObjectId(collabRequestId) });
  }

  async createConversation(data: Partial<IConversation>): Promise<IConversation> {
    return Conversation.create(data);
  }

  async findMessages(
    conversationId: string,
    filters: MessageFilters,
  ): Promise<{ docs: IMessage[]; total: number }> {
    const query = { conversationId: new Types.ObjectId(conversationId) };
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      Message.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Message.countDocuments(query),
    ]);

    return { docs, total };
  }

  async createMessage(data: Partial<IMessage>): Promise<IMessage> {
    return Message.create(data);
  }

  async updateConversationLastMessage(
    conversationId: string,
    message: { content: string; senderId: string; createdAt: Date },
  ): Promise<void> {
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: {
        content: message.content,
        senderId: new Types.ObjectId(message.senderId),
        createdAt: message.createdAt,
      },
    });
  }

  async markMessagesAsRead(conversationId: string, recipientId: string): Promise<number> {
    const result = await Message.updateMany(
      {
        conversationId: new Types.ObjectId(conversationId),
        senderId: { $ne: new Types.ObjectId(recipientId) },
        readAt: { $exists: false },
      },
      { $set: { readAt: new Date() } },
    );

    return result.modifiedCount;
  }

  async countUnread(conversationId: string, userId: string): Promise<number> {
    return Message.countDocuments({
      conversationId: new Types.ObjectId(conversationId),
      senderId: { $ne: new Types.ObjectId(userId) },
      readAt: { $exists: false },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: PASS — all tests passing (model tests + repository tests)

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/messaging/messaging.repository.ts server/tests/messaging/messaging.service.test.ts
git commit -m "feat(messaging): add MessagingRepository with conversation and message queries"
```

---

### Task 7: Create Messaging Service

**Files:**
- Create: `server/src/modules/messaging/messaging.service.ts`

- [ ] **Step 1: Add service tests to the test file**

Append the following to `server/tests/messaging/messaging.service.test.ts`, after the MessagingRepository describe block. Also add the necessary imports at the top of the file:

Add these imports at the top:

```typescript
import bcrypt from 'bcryptjs';
import { User, IUser } from '@/models/User';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { AppError, ERROR_CODES } from '@/shared/errors';
```

And add this describe block at the bottom:

```typescript
describe('MessagingService', () => {
  const service = new MessagingService(repo);
  let creatorUser: IUser;
  let brandUser: IUser;
  let conversationId: string;

  async function createTestUsersAndConversation() {
    const hashedPassword = await bcrypt.hash('password123', 10);
    creatorUser = await User.create({
      username: 'msg_creator',
      password: hashedPassword,
      role: 'creator',
    });
    brandUser = await User.create({
      username: 'msg_brand',
      password: hashedPassword,
      role: 'brand',
    });

    const collabId = new mongoose.Types.ObjectId();
    const conv = await Conversation.create({
      participants: [creatorUser._id, brandUser._id],
      collaborationRequestId: collabId,
    });
    conversationId = conv._id.toString();
  }

  describe('getConversations', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('returns paginated conversations for a user', async () => {
      const result = await service.getConversations(creatorUser._id.toString(), { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.hasNext).toBe(false);
    });
  });

  describe('getConversation', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('returns conversation when user is a participant', async () => {
      const conv = await service.getConversation(conversationId, creatorUser._id.toString());

      expect(conv._id.toString()).toBe(conversationId);
    });

    it('throws CONVERSATION_NOT_FOUND for invalid ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      await expect(service.getConversation(fakeId, creatorUser._id.toString()))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_NOT_FOUND });
    });

    it('throws CONVERSATION_UNAUTHORIZED when user is not a participant', async () => {
      const outsider = await User.create({
        username: 'outsider',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.getConversation(conversationId, outsider._id.toString()))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('sends a message and updates lastMessage', async () => {
      const msg = await service.sendMessage(conversationId, creatorUser._id.toString(), { content: 'Hello brand!' });

      expect(msg.content).toBe('Hello brand!');
      expect(msg.senderId.toString()).toBe(creatorUser._id.toString());
      expect(msg.conversationId.toString()).toBe(conversationId);

      const conv = await Conversation.findById(conversationId);
      expect(conv!.lastMessage).toBeDefined();
      expect(conv!.lastMessage!.content).toBe('Hello brand!');
    });

    it('rejects message from non-participant', async () => {
      const outsider = await User.create({
        username: 'outsider2',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.sendMessage(conversationId, outsider._id.toString(), { content: 'Intruder!' }))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('getMessages', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('returns paginated messages for a conversation', async () => {
      await Message.create({ conversationId, senderId: creatorUser._id, content: 'Msg 1' });
      await Message.create({ conversationId, senderId: brandUser._id, content: 'Msg 2' });

      const result = await service.getMessages(conversationId, creatorUser._id.toString(), { page: 1, limit: 50 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('rejects non-participant', async () => {
      const outsider = await User.create({
        username: 'outsider3',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.getMessages(conversationId, outsider._id.toString(), { page: 1, limit: 50 }))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });

  describe('markAsRead', () => {
    beforeEach(async () => {
      await createTestUsersAndConversation();
    });

    it('marks unread messages as read', async () => {
      await Message.create({ conversationId, senderId: brandUser._id, content: 'Unread 1' });
      await Message.create({ conversationId, senderId: brandUser._id, content: 'Unread 2' });

      await service.markAsRead(conversationId, creatorUser._id.toString());

      const msgs = await Message.find({ conversationId, senderId: brandUser._id });
      expect(msgs[0].readAt).toBeDefined();
      expect(msgs[1].readAt).toBeDefined();
    });

    it('rejects non-participant', async () => {
      const outsider = await User.create({
        username: 'outsider4',
        password: await bcrypt.hash('password123', 10),
        role: 'creator',
      });

      await expect(service.markAsRead(conversationId, outsider._id.toString()))
        .rejects.toMatchObject({ code: ERROR_CODES.CONVERSATION_UNAUTHORIZED });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: FAIL — `Cannot find module '@/modules/messaging/messaging.service'`

- [ ] **Step 3: Create the service**

Create `server/src/modules/messaging/messaging.service.ts`:

```typescript
// ABOUTME: MessagingService — orchestrates business logic for conversations and messages.
// ABOUTME: Handles authorization (participant check), message sending, read marking, and pagination.

import { IConversation } from '../../models/Conversation';
import { IMessage } from '../../models/Message';
import { AppError, ERROR_CODES } from '../../shared/errors';
import {
  IMessagingService,
  IMessagingRepository,
  SendMessageInput,
  MessageFilters,
  PaginatedResponse,
} from './messaging.interfaces';

export class MessagingService implements IMessagingService {
  constructor(private readonly repository: IMessagingRepository) {}

  async getConversations(userId: string, filters: MessageFilters): Promise<PaginatedResponse<IConversation>> {
    const { docs, total } = await this.repository.findConversationsByUser(userId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return {
      data: docs,
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async getConversation(conversationId: string, userId: string): Promise<IConversation> {
    const conv = await this.repository.findConversationById(conversationId);

    if (!conv) {
      throw AppError.notFound('Conversation not found', ERROR_CODES.CONVERSATION_NOT_FOUND);
    }

    const isParticipant = conv.participants.some(
      (p) => p._id?.toString() === userId || p.toString() === userId,
    );

    if (!isParticipant) {
      throw AppError.forbidden('You are not a participant in this conversation', ERROR_CODES.CONVERSATION_UNAUTHORIZED);
    }

    return conv;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    filters: MessageFilters,
  ): Promise<PaginatedResponse<IMessage>> {
    await this.getConversation(conversationId, userId);

    const { docs, total } = await this.repository.findMessages(conversationId, filters);
    const page = filters.page || 1;
    const limit = filters.limit || 50;

    return {
      data: docs,
      pagination: { page, limit, total, hasNext: page * limit < total },
    };
  }

  async sendMessage(conversationId: string, senderId: string, input: SendMessageInput): Promise<IMessage> {
    await this.getConversation(conversationId, senderId);

    const message = await this.repository.createMessage({
      conversationId: conversationId as any,
      senderId: senderId as any,
      content: input.content,
    });

    await this.repository.updateConversationLastMessage(conversationId, {
      content: input.content,
      senderId,
      createdAt: message.createdAt,
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.getConversation(conversationId, userId);
    await this.repository.markMessagesAsRead(conversationId, userId);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npx jest tests/messaging/messaging.service.test.ts --verbose`
Expected: PASS — all tests passing

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/messaging/messaging.service.ts server/tests/messaging/messaging.service.test.ts
git commit -m "feat(messaging): add MessagingService with auth, send, read, and pagination"
```

---

### Task 8: Create Messaging Controller

**Files:**
- Create: `server/src/modules/messaging/messaging.controller.ts`

- [ ] **Step 1: Create the controller**

Create `server/src/modules/messaging/messaging.controller.ts`:

```typescript
// ABOUTME: MessagingController — HTTP handlers for /api/v1/messages endpoints.
// ABOUTME: Thin layer: parses req, delegates to service, formats response via sendSuccess.

import { Request, Response, NextFunction } from 'express';
import { IMessagingService } from './messaging.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';

export class MessagingController {
  constructor(private readonly service: IMessagingService) {}

  getConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getConversations(req.user!.userId, req.query as any);
      sendSuccess(res, result, 'Conversations retrieved');
    } catch (err) {
      next(err);
    }
  };

  getConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await this.service.getConversation(req.params.id, req.user!.userId);
      sendSuccess(res, { conversation }, 'Conversation retrieved');
    } catch (err) {
      next(err);
    }
  };

  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getMessages(req.params.id, req.user!.userId, req.query as any);
      sendSuccess(res, result, 'Messages retrieved');
    } catch (err) {
      next(err);
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await this.service.sendMessage(req.params.id, req.user!.userId, req.body);
      sendSuccess(res, { message }, 'Message sent', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.markAsRead(req.params.id, req.user!.userId);
      sendSuccess(res, null, 'Messages marked as read');
    } catch (err) {
      next(err);
    }
  };
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/src/modules/messaging/messaging.controller.ts
git commit -m "feat(messaging): add MessagingController with 5 endpoint handlers"
```

---

### Task 9: Create Messaging Routes + Wire in index.ts

**Files:**
- Create: `server/src/modules/messaging/messaging.routes.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create the routes file**

Create `server/src/modules/messaging/messaging.routes.ts`:

```typescript
// ABOUTME: Messaging route definitions — wires middleware, validation, and controller.
// ABOUTME: Mounted at /api/v1/messages in index.ts.

import { Router } from 'express';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingRepository } from './messaging.repository';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import {
  getConversationsSchema,
  conversationIdSchema,
  getMessagesSchema,
  sendMessageSchema,
  markReadSchema,
} from './messaging.validation';

const repo = new MessagingRepository();
const service = new MessagingService(repo);
const controller = new MessagingController(service);

const router = Router();

// GET /api/v1/messages/conversations — list user's conversations
router.get('/conversations', authenticate, validate(getConversationsSchema), controller.getConversations);

// GET /api/v1/messages/conversations/:id — get single conversation
router.get('/conversations/:id', authenticate, validate(conversationIdSchema), controller.getConversation);

// GET /api/v1/messages/conversations/:id/messages — get messages in conversation
router.get('/conversations/:id/messages', authenticate, validate(getMessagesSchema), controller.getMessages);

// POST /api/v1/messages/conversations/:id/messages — send a message
router.post('/conversations/:id/messages', authenticate, validate(sendMessageSchema), controller.sendMessage);

// PATCH /api/v1/messages/conversations/:id/read — mark conversation as read
router.patch('/conversations/:id/read', authenticate, validate(markReadSchema), controller.markAsRead);

export default router;
```

- [ ] **Step 2: Wire routes in index.ts**

In `server/src/index.ts`, add the import after the collaboration import:

```typescript
import messagingRoutes from './modules/messaging/messaging.routes';
```

And add the route mount after the collaboration route mount:

```typescript
app.use(`${API_PREFIX}/messages`, messagingRoutes);
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd server && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add server/src/modules/messaging/messaging.routes.ts server/src/index.ts
git commit -m "feat(messaging): add routes and wire messaging module in index.ts"
```

---

### Task 10: Integration Tests

**Files:**
- Create: `server/tests/messaging/messaging.integration.test.ts`

- [ ] **Step 1: Create the integration test file**

Create `server/tests/messaging/messaging.integration.test.ts`:

```typescript
// ABOUTME: Integration tests for messaging endpoints — tests full HTTP request/response cycle.
// ABOUTME: Uses supertest and in-memory MongoDB for isolated, repeatable tests.

import request from 'supertest';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '@/index';
import { User } from '@/models/User';
import { Conversation } from '@/models/Conversation';
import { Message } from '@/models/Message';
import { TokenService } from '@/modules/auth/token.service';

const tokenService = new TokenService();

let creatorToken: string;
let brandToken: string;
let creatorId: string;
let brandId: string;
let conversationId: string;
let collabId: string;

async function createUser(username: string, role: 'creator' | 'brand') {
  const hashedPassword = await bcrypt.hash('password123', 10);
  return User.create({
    username,
    password: hashedPassword,
    role,
    email: `${username}@example.com`,
  });
}

async function setupConversation() {
  collabId = new mongoose.Types.ObjectId().toString();
  const conv = await Conversation.create({
    participants: [creatorId, brandId],
    collaborationRequestId: collabId,
  });
  conversationId = conv._id.toString();
}

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearCollections();

  const creatorUser = await createUser('msg_creator', 'creator');
  creatorId = creatorUser._id.toString();
  creatorToken = tokenService.generateAccessToken({ userId: creatorId, role: 'creator' });

  const brandUser = await createUser('msg_brand', 'brand');
  brandId = brandUser._id.toString();
  brandToken = tokenService.generateAccessToken({ userId: brandId, role: 'brand' });
});

describe('GET /api/v1/messages/conversations', () => {
  it('returns empty list when user has no conversations', async () => {
    const res = await request(app)
      .get('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(0);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('returns conversations the user participates in', async () => {
    await setupConversation();

    const res = await request(app)
      .get('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('rejects unauthenticated requests', async () => {
    const res = await request(app)
      .get('/api/v1/messages/conversations');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('paginates results', async () => {
    for (let i = 0; i < 5; i++) {
      await Conversation.create({
        participants: [creatorId, new mongoose.Types.ObjectId()],
        collaborationRequestId: new mongoose.Types.ObjectId(),
      });
    }

    const res = await request(app)
      .get('/api/v1/messages/conversations?page=1&limit=2')
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.hasNext).toBe(true);
  });
});

describe('GET /api/v1/messages/conversations/:id', () => {
  it('returns a conversation when user is participant', async () => {
    await setupConversation();

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversation._id).toBe(conversationId);
  });

  it('returns 404 for non-existent conversation', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${fakeId}`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when user is not a participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider', 'creator');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'creator',
    });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/v1/messages/conversations/:id/messages', () => {
  it('sends a message successfully', async () => {
    await setupConversation();

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ content: 'Hello from creator!' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.content).toBe('Hello from creator!');
    expect(res.body.data.message.senderId).toBe(creatorId);
    expect(res.body.message).toBe('Message sent');
  });

  it('updates lastMessage on conversation after sending', async () => {
    await setupConversation();

    await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({ content: 'Brand says hi' });

    const conv = await Conversation.findById(conversationId);
    expect(conv!.lastMessage!.content).toBe('Brand says hi');
  });

  it('rejects empty content', async () => {
    await setupConversation();

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider2', 'brand');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'brand',
    });

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`)
      .send({ content: 'Intruder message' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects unauthenticated requests', async () => {
    await setupConversation();

    const res = await request(app)
      .post(`/api/v1/messages/conversations/${conversationId}/messages`)
      .send({ content: 'No auth' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/messages/conversations/:id/messages', () => {
  it('returns messages for a conversation', async () => {
    await setupConversation();

    await Message.create({ conversationId, senderId: creatorId, content: 'Msg 1' });
    await Message.create({ conversationId, senderId: brandId, content: 'Msg 2' });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('paginates messages', async () => {
    await setupConversation();

    for (let i = 0; i < 5; i++) {
      await Message.create({ conversationId, senderId: creatorId, content: `Msg ${i}` });
    }

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}/messages?page=1&limit=2`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.data).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(5);
    expect(res.body.data.pagination.hasNext).toBe(true);
  });

  it('rejects non-participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider3', 'creator');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'creator',
    });

    const res = await request(app)
      .get(`/api/v1/messages/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/v1/messages/conversations/:id/read', () => {
  it('marks unread messages as read', async () => {
    await setupConversation();

    await Message.create({ conversationId, senderId: brandId, content: 'Unread 1' });
    await Message.create({ conversationId, senderId: brandId, content: 'Unread 2' });

    const res = await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${creatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const msgs = await Message.find({ conversationId, senderId: brandId });
    expect(msgs[0].readAt).toBeDefined();
    expect(msgs[1].readAt).toBeDefined();
  });

  it('does not mark own messages as read', async () => {
    await setupConversation();

    await Message.create({ conversationId, senderId: creatorId, content: 'My own msg' });

    await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${creatorToken}`);

    const msgs = await Message.find({ conversationId, senderId: creatorId });
    expect(msgs[0].readAt).toBeUndefined();
  });

  it('rejects non-participant', async () => {
    await setupConversation();

    const outsider = await createUser('outsider4', 'brand');
    const outsiderToken = tokenService.generateAccessToken({
      userId: outsider._id.toString(),
      role: 'brand',
    });

    const res = await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`)
      .set('Authorization', `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });

  it('rejects unauthenticated requests', async () => {
    await setupConversation();

    const res = await request(app)
      .patch(`/api/v1/messages/conversations/${conversationId}/read`);

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run integration tests**

Run: `cd server && npx jest tests/messaging/messaging.integration.test.ts --verbose`
Expected: PASS — all integration tests passing

- [ ] **Step 3: Commit**

```bash
git add server/tests/messaging/messaging.integration.test.ts
git commit -m "test(messaging): add integration tests for all 5 messaging endpoints"
```

---

### Task 11: Run Full Test Suite

- [ ] **Step 1: Run all tests to verify no regressions**

Run: `cd server && npx jest --verbose`
Expected: ALL tests pass — no regressions in auth, profile, search, or collaboration tests.

- [ ] **Step 2: If any test fails, fix the issue before proceeding**

If failures are in messaging tests, debug and fix. If failures are in other modules, investigate whether the messaging changes caused a regression.

- [ ] **Step 3: Final commit if any fixes were needed**

Only if fixes were applied:
```bash
git add -A
git commit -m "fix(messaging): resolve test regressions from messaging module"
```
