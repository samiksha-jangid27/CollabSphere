// ABOUTME: MessagingController — HTTP handlers for /api/v1/messages endpoints.
// ABOUTME: Thin layer: parses req, delegates to service, formats response via sendSuccess.

import { Request, Response, NextFunction } from 'express';
import { IMessagingService } from './messaging.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';
import { broadcastNewMessage, broadcastMessagesRead, broadcastMessageNotification } from '../../config/socket';
import logger from '../../shared/logger';

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

  getConversationByCollab = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await this.service.getOrCreateConversationByCollab(
        req.params.collabId as string,
        req.user!.userId,
      );
      sendSuccess(res, { conversation }, 'Conversation retrieved');
    } catch (err) {
      next(err);
    }
  };

  getConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await this.service.getConversation(req.params.id as string, req.user!.userId);
      sendSuccess(res, { conversation }, 'Conversation retrieved');
    } catch (err) {
      next(err);
    }
  };

  getMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getMessages(req.params.id as string, req.user!.userId, req.query as any);
      sendSuccess(res, result, 'Messages retrieved');
    } catch (err) {
      next(err);
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = req.params.id as string;
      const senderId = req.user!.userId;
      const message = await this.service.sendMessage(conversationId, senderId, req.body);

      const payload = {
        _id: message._id.toString(),
        conversationId,
        senderId,
        content: req.body.content,
        createdAt: message.createdAt.toISOString(),
      };

      // Broadcast to the conversation room (live chat view)
      broadcastNewMessage(conversationId, payload);

      // Notify each recipient on their personal room so they get an in-app
      // toast even when they are not viewing the conversation.
      try {
        const conv = await this.service.getConversation(conversationId, senderId);
        const senderName =
          conv.participants
            .map((p: any) => ({
              id: p._id?.toString() ?? p.toString(),
              username: p.username as string | undefined,
            }))
            .find((p) => p.id === senderId)?.username ?? null;

        const recipientIds = conv.participants
          .map((p: any) => p._id?.toString() ?? p.toString())
          .filter((id: string) => id !== senderId);

        broadcastMessageNotification(recipientIds, { ...payload, senderName });
      } catch (notifyErr) {
        logger.error('Failed to broadcast message notification', { notifyErr, conversationId });
      }

      sendSuccess(res, { message }, 'Message sent', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

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
}
