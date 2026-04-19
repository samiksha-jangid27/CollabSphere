# Chunk C: Socket.io Server Setup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time WebSocket layer with JWT authentication so that message sends and read receipts can be broadcast to connected clients without page refresh.

**Architecture:** Socket.io attaches to the existing HTTP server alongside Express. A JWT auth middleware on the socket handshake reuses `TokenService.verifyAccessToken`. REST endpoints remain the source of truth for all writes — Socket.io is notification/broadcast only. The controller calls broadcast helpers after successful REST operations.

**Tech Stack:** socket.io (server), socket.io-client (test only), jsonwebtoken (existing), Jest + mongodb-memory-server (existing)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `server/src/config/socket.ts` | **Create** | Socket.io server setup, JWT auth middleware, room handlers, broadcast helpers |
| `server/src/index.ts` | **Modify** | Switch `app.listen()` to `http.createServer(app)` + attach socket.io |
| `server/src/modules/messaging/messaging.controller.ts` | **Modify** | Call broadcast helpers after sendMessage and markAsRead |
| `server/tests/socket/socket.test.ts` | **Create** | Unit + integration tests for socket auth, rooms, and broadcasting |

---

### Task 1: Install socket.io dependencies

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Install socket.io as a production dependency**

```bash
cd server && npm install socket.io
```

- [ ] **Step 2: Install socket.io-client as a dev dependency (for tests)**

```bash
cd server && npm install --save-dev socket.io-client
```

- [ ] **Step 3: Verify installation**

```bash
cd server && node -e "require('socket.io'); require('socket.io-client'); console.log('OK')"
```

Expected: `OK`

---

### Task 2: Socket auth middleware — failing tests first

**Files:**
- Create: `server/tests/socket/socket.test.ts`
- Create: `server/src/config/socket.ts` (stub only)

- [ ] **Step 1: Write failing tests for socket JWT auth**

Create `server/tests/socket/socket.test.ts`:

```typescript
// ABOUTME: Tests for Socket.io server — JWT auth, room management, and broadcast helpers.
// ABOUTME: Uses socket.io-client to connect to a test server and verify real-time behavior.

import { createServer, Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { TokenService } from '@/modules/auth/token.service';
import { setupSocketServer, getIO } from '@/config/socket';

const tokenService = new TokenService();

let httpServer: HttpServer;
let port: number;

function clientUrl() {
  return `http://localhost:${port}`;
}

function connectClient(token?: string): ClientSocket {
  return ioClient(clientUrl(), {
    autoConnect: false,
    auth: token ? { token } : undefined,
    transports: ['websocket'],
  });
}

beforeAll((done) => {
  const app = express();
  httpServer = createServer(app);
  setupSocketServer(httpServer);
  httpServer.listen(0, () => {
    const addr = httpServer.address();
    port = typeof addr === 'object' && addr ? addr.port : 0;
    done();
  });
});

afterAll((done) => {
  const io = getIO();
  io.close();
  httpServer.close(done);
});

describe('Socket.io Auth Middleware', () => {
  it('rejects connection with no token', (done) => {
    const client = connectClient();
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/No token provided/i);
      client.disconnect();
      done();
    });
    client.connect();
  });

  it('rejects connection with invalid token', (done) => {
    const client = connectClient('invalid.jwt.token');
    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Invalid|expired/i);
      client.disconnect();
      done();
    });
    client.connect();
  });

  it('accepts connection with valid token and attaches user data', (done) => {
    const token = tokenService.generateAccessToken({ userId: 'user123', role: 'creator' });
    const client = connectClient(token);
    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });
    client.connect();
  });
});
```

- [ ] **Step 2: Create a minimal stub for socket.ts so the import resolves**

Create `server/src/config/socket.ts`:

```typescript
// ABOUTME: Socket.io server setup — attaches to HTTP server with JWT auth middleware.
// ABOUTME: Exports setupSocketServer, getIO, and broadcast helpers for the messaging controller.

import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer;

export function setupSocketServer(_httpServer: HttpServer): void {
  // TODO: implement
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized — call setupSocketServer first');
  }
  return io;
}
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: All 3 tests FAIL (setupSocketServer does nothing, no io instance created).

---

### Task 3: Implement socket auth middleware — make tests pass

**Files:**
- Modify: `server/src/config/socket.ts`

- [ ] **Step 1: Implement setupSocketServer with JWT auth middleware**

Replace the full contents of `server/src/config/socket.ts`:

```typescript
// ABOUTME: Socket.io server setup — attaches to HTTP server with JWT auth middleware.
// ABOUTME: Exports setupSocketServer, getIO, and broadcast helpers for the messaging controller.

import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { TokenService } from '../modules/auth/token.service';
import { config } from './environment';
import logger from '../shared/logger';

let io: SocketServer;
const tokenService = new TokenService();

export function setupSocketServer(httpServer: HttpServer): void {
  io = new SocketServer(httpServer, {
    cors: {
      origin: config.CLIENT_URL,
      credentials: true,
    },
  });

  // JWT auth middleware — runs on every new connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('No token provided'));
    }

    try {
      const user = tokenService.verifyAccessToken(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected', { userId: socket.data.user.userId });

    socket.on('disconnect', () => {
      logger.info('Socket disconnected', { userId: socket.data.user.userId });
    });
  });
}

export function getIO(): SocketServer {
  if (!io) {
    throw new Error('Socket.io not initialized — call setupSocketServer first');
  }
  return io;
}
```

- [ ] **Step 2: Run tests to verify auth tests pass**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: All 3 tests PASS.

---

### Task 4: Room management — failing tests, then implementation

**Files:**
- Modify: `server/tests/socket/socket.test.ts`
- Modify: `server/src/config/socket.ts`

- [ ] **Step 1: Add failing tests for join_conversation and leave_conversation**

Append to `server/tests/socket/socket.test.ts`, inside the top-level scope (after the auth describe block):

```typescript
describe('Room Management', () => {
  let client: ClientSocket;

  beforeEach((done) => {
    const token = tokenService.generateAccessToken({ userId: 'room_user', role: 'creator' });
    client = connectClient(token);
    client.on('connect', done);
    client.connect();
  });

  afterEach(() => {
    client.disconnect();
  });

  it('joins a conversation room and receives acknowledgement', (done) => {
    client.emit('join_conversation', 'conv123', (response: { ok: boolean }) => {
      expect(response.ok).toBe(true);
      done();
    });
  });

  it('leaves a conversation room and receives acknowledgement', (done) => {
    client.emit('join_conversation', 'conv123', () => {
      client.emit('leave_conversation', 'conv123', (response: { ok: boolean }) => {
        expect(response.ok).toBe(true);
        done();
      });
    });
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: 2 new tests FAIL (no acknowledgement callback, timeout).

- [ ] **Step 3: Add room event handlers to socket.ts**

In `server/src/config/socket.ts`, inside the `io.on('connection', ...)` callback, add room handlers after the existing `logger.info('Socket connected', ...)` line and before `socket.on('disconnect', ...)`:

```typescript
    socket.on('join_conversation', (conversationId: string, callback?: (res: { ok: boolean }) => void) => {
      const room = `conversation:${conversationId}`;
      socket.join(room);
      logger.info('Joined room', { userId: socket.data.user.userId, room });
      if (callback) callback({ ok: true });
    });

    socket.on('leave_conversation', (conversationId: string, callback?: (res: { ok: boolean }) => void) => {
      const room = `conversation:${conversationId}`;
      socket.leave(room);
      logger.info('Left room', { userId: socket.data.user.userId, room });
      if (callback) callback({ ok: true });
    });
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: All 5 tests PASS.

---

### Task 5: Broadcast helpers — failing tests, then implementation

**Files:**
- Modify: `server/tests/socket/socket.test.ts`
- Modify: `server/src/config/socket.ts`

- [ ] **Step 1: Add failing tests for broadcastNewMessage and broadcastMessagesRead**

Append to `server/tests/socket/socket.test.ts`:

```typescript
describe('Broadcast Helpers', () => {
  let sender: ClientSocket;
  let receiver: ClientSocket;

  beforeEach((done) => {
    const senderToken = tokenService.generateAccessToken({ userId: 'sender1', role: 'brand' });
    const receiverToken = tokenService.generateAccessToken({ userId: 'receiver1', role: 'creator' });

    let ready = 0;
    const checkReady = () => { ready++; if (ready === 2) done(); };

    sender = connectClient(senderToken);
    receiver = connectClient(receiverToken);

    sender.on('connect', () => {
      sender.emit('join_conversation', 'bcast_conv', checkReady);
    });
    receiver.on('connect', () => {
      receiver.emit('join_conversation', 'bcast_conv', checkReady);
    });

    sender.connect();
    receiver.connect();
  });

  afterEach(() => {
    sender.disconnect();
    receiver.disconnect();
  });

  it('broadcastNewMessage sends new_message event to conversation room', (done) => {
    const { broadcastNewMessage } = require('@/config/socket');

    const messageData = {
      _id: 'msg1',
      conversationId: 'bcast_conv',
      senderId: 'sender1',
      content: 'Hello there',
      createdAt: new Date().toISOString(),
    };

    receiver.on('new_message', (data) => {
      expect(data._id).toBe('msg1');
      expect(data.content).toBe('Hello there');
      expect(data.conversationId).toBe('bcast_conv');
      done();
    });

    broadcastNewMessage('bcast_conv', messageData);
  });

  it('broadcastMessagesRead sends messages_read event to conversation room', (done) => {
    const { broadcastMessagesRead } = require('@/config/socket');

    const readData = {
      conversationId: 'bcast_conv',
      readBy: 'receiver1',
      readAt: new Date().toISOString(),
    };

    sender.on('messages_read', (data) => {
      expect(data.conversationId).toBe('bcast_conv');
      expect(data.readBy).toBe('receiver1');
      done();
    });

    broadcastMessagesRead('bcast_conv', readData);
  });
});
```

- [ ] **Step 2: Run tests to verify broadcast tests fail**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: 2 new tests FAIL (`broadcastNewMessage` is not a function / not exported).

- [ ] **Step 3: Add broadcast helpers to socket.ts**

Add these exported functions at the bottom of `server/src/config/socket.ts` (before the closing of the file, after `getIO`):

```typescript
export function broadcastNewMessage(conversationId: string, message: Record<string, unknown>): void {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('new_message', message);
}

export function broadcastMessagesRead(conversationId: string, data: Record<string, unknown>): void {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('messages_read', data);
}
```

- [ ] **Step 4: Run tests to verify all pass**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: All 7 tests PASS.

---

### Task 6: Wire Socket.io into index.ts

**Files:**
- Modify: `server/src/index.ts`

- [ ] **Step 1: Refactor index.ts to use http.createServer and attach Socket.io**

In `server/src/index.ts`, make these changes:

1. Add imports at the top (after existing imports):

```typescript
import { createServer } from 'http';
import { setupSocketServer } from './config/socket';
```

2. After `const app = express();` add:

```typescript
const httpServer = createServer(app);
setupSocketServer(httpServer);
```

3. Replace the `app.listen(...)` call in the `start()` function with:

```typescript
httpServer.listen(config.PORT, () => {
  logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
});
```

- [ ] **Step 2: Run existing tests to verify no regressions**

```bash
cd server && npm test
```

Expected: All 157+ existing tests PASS (no regressions). Socket tests also pass.

---

### Task 7: Integrate broadcasting into messaging controller

**Files:**
- Modify: `server/src/modules/messaging/messaging.controller.ts`
- Modify: `server/tests/socket/socket.test.ts`

- [ ] **Step 1: Add failing integration test for controller broadcasting**

Append to `server/tests/socket/socket.test.ts`:

```typescript
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '@/index';
import { User } from '@/models/User';
import { Conversation } from '@/models/Conversation';
```

Move these imports to the top of the file (alongside existing imports). Then add a new describe block at the bottom:

```typescript
describe('Controller Broadcast Integration', () => {
  let senderToken: string;
  let receiverSocket: ClientSocket;
  let senderId: string;
  let receiverId: string;
  let testConvId: string;

  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearCollections();

    const hashedPassword = await bcrypt.hash('password123', 10);
    const sender = await User.create({ username: 'bcast_sender', password: hashedPassword, role: 'brand', email: 'bsender@test.com' });
    const receiver = await User.create({ username: 'bcast_receiver', password: hashedPassword, role: 'creator', email: 'breceiver@test.com' });

    senderId = sender._id.toString();
    receiverId = receiver._id.toString();

    senderToken = tokenService.generateAccessToken({ userId: senderId, role: 'brand' });
    const receiverToken = tokenService.generateAccessToken({ userId: receiverId, role: 'creator' });

    const conv = await Conversation.create({
      participants: [senderId, receiverId],
      collaborationRequestId: new mongoose.Types.ObjectId(),
    });
    testConvId = conv._id.toString();

    // Connect receiver via socket and join the conversation room
    receiverSocket = connectClient(receiverToken);
    await new Promise<void>((resolve) => {
      receiverSocket.on('connect', () => {
        receiverSocket.emit('join_conversation', testConvId, () => resolve());
      });
      receiverSocket.connect();
    });
  });

  afterEach(() => {
    receiverSocket.disconnect();
  });

  it('broadcasts new_message when a message is sent via REST', (done) => {
    receiverSocket.on('new_message', (data) => {
      expect(data.content).toBe('Hello via REST');
      expect(data.conversationId).toBe(testConvId);
      done();
    });

    request(app)
      .post(`/api/v1/messages/conversations/${testConvId}/messages`)
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ content: 'Hello via REST' })
      .expect(201)
      .then(() => {
        // Socket event is tested in the listener above
      });
  });

  it('broadcasts messages_read when messages are marked as read via REST', (done) => {
    // First, send a message so there's something to mark as read
    const senderSocket = connectClient(tokenService.generateAccessToken({ userId: senderId, role: 'brand' }));

    senderSocket.on('connect', () => {
      senderSocket.emit('join_conversation', testConvId, async () => {
        // Send a message first via REST
        await request(app)
          .post(`/api/v1/messages/conversations/${testConvId}/messages`)
          .set('Authorization', `Bearer ${senderToken}`)
          .send({ content: 'Unread message' })
          .expect(201);

        // Listen for the read receipt on sender's socket
        senderSocket.on('messages_read', (data) => {
          expect(data.conversationId).toBe(testConvId);
          expect(data.readBy).toBe(receiverId);
          senderSocket.disconnect();
          done();
        });

        // Mark as read via REST as the receiver
        const receiverToken = tokenService.generateAccessToken({ userId: receiverId, role: 'creator' });
        await request(app)
          .patch(`/api/v1/messages/conversations/${testConvId}/read`)
          .set('Authorization', `Bearer ${receiverToken}`)
          .expect(200);
      });
    });
    senderSocket.connect();
  });
});
```

- [ ] **Step 2: Run tests to verify integration tests fail**

```bash
cd server && npx jest tests/socket/socket.test.ts --verbose
```

Expected: The 2 new integration tests FAIL (no `new_message` or `messages_read` events emitted — controller doesn't broadcast yet).

- [ ] **Step 3: Add broadcasting to the messaging controller**

Modify `server/src/modules/messaging/messaging.controller.ts`:

1. Add import at top:

```typescript
import { broadcastNewMessage, broadcastMessagesRead } from '../../config/socket';
```

2. In `sendMessage`, after the `sendSuccess` call, add broadcasting:

```typescript
  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await this.service.sendMessage(req.params.id as string, req.user!.userId, req.body);
      sendSuccess(res, { message }, 'Message sent', HTTP_STATUS.CREATED);

      // Broadcast to connected clients in the conversation room
      broadcastNewMessage(req.params.id as string, {
        _id: message._id.toString(),
        conversationId: req.params.id as string,
        senderId: req.user!.userId,
        content: req.body.content,
        createdAt: message.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };
```

3. In `markAsRead`, after the `sendSuccess` call, add broadcasting:

```typescript
  markAsRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.markAsRead(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Messages marked as read');

      // Broadcast read receipt to conversation room
      broadcastMessagesRead(req.params.id as string, {
        conversationId: req.params.id as string,
        readBy: req.user!.userId,
        readAt: new Date().toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };
```

- [ ] **Step 4: Run all tests to verify everything passes**

```bash
cd server && npm test
```

Expected: All tests pass including 9 new socket tests. Zero regressions on existing 157 tests.

---

### Task 8: Final verification — full test suite

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd server && npm test
```

Expected: All tests pass. No regressions.

- [ ] **Step 2: Start the server and verify socket connection manually**

```bash
cd server && npx ts-node -e "
const { createServer } = require('http');
const express = require('express');
const { Server } = require('socket.io');
console.log('socket.io loads OK');
"
```

Expected: Prints `socket.io loads OK` — confirms the dependency is correctly installed and importable.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd server && npx tsc --noEmit
```

Expected: No type errors.
