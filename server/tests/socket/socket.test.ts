// ABOUTME: Tests for Socket.io server — JWT auth, room management, and broadcast helpers.
// ABOUTME: Uses socket.io-client to connect to a test server and verify real-time behavior.

import { createServer, Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { TokenService } from '@/modules/auth/token.service';
import { setupSocketServer, getIO } from '@/config/socket';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { app } from '@/index';
import { User } from '@/models/User';
import { Conversation } from '@/models/Conversation';

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

describe('Controller Broadcast Integration', () => {
  // NOTE: The socket.ts module uses a single `io` singleton. The top-level beforeAll in this
  // file calls setupSocketServer(standaloneHttpServer) AFTER index.ts calls it with appHttpServer,
  // so getIO() (and therefore broadcastNewMessage/broadcastMessagesRead) resolves to the
  // standalone test server's io. Socket clients connect to the standalone server via connectClient().

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

    // Connect receiver to the standalone socket server (which owns the io singleton used by broadcastNewMessage)
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
    // Connect sender to the standalone socket server to listen for the read receipt
    const senderToken2 = tokenService.generateAccessToken({ userId: senderId, role: 'brand' });
    const senderSocket = connectClient(senderToken2);

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
