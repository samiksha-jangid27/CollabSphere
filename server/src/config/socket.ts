// ABOUTME: Socket.io server setup — attaches to HTTP server with JWT auth middleware.
// ABOUTME: Exports setupSocketServer, getIO, and broadcast helpers for the messaging controller.

import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { TokenService } from '../modules/auth/token.service';
import { config } from './environment';
import logger from '../shared/logger';

let io: SocketServer | undefined;
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

    // Auto-join a personal room so the user receives direct notifications
    // regardless of which conversation rooms they have joined.
    socket.join(`user:${socket.data.user.userId}`);

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

export function broadcastNewMessage(conversationId: string, message: Record<string, unknown>): void {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('new_message', message);
}

export function broadcastMessagesRead(conversationId: string, data: Record<string, unknown>): void {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('messages_read', data);
}

export function broadcastMessageNotification(recipientUserIds: string[], data: Record<string, unknown>): void {
  if (!io || recipientUserIds.length === 0) return;
  const rooms = recipientUserIds.map((id) => `user:${id}`);
  io.to(rooms).emit('message_notification', data);
}
