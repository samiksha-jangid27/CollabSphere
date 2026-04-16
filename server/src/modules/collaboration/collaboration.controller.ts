// ABOUTME: CollaborationController — HTTP handlers for /api/v1/collaborations endpoints.
// ABOUTME: Thin layer: parses req, delegates to service, formats response.

import { Request, Response, NextFunction } from 'express';
import { ICollaborationService } from './collaboration.interfaces';
import { sendSuccess } from '../../shared/responseHelper';
import { HTTP_STATUS } from '../../shared/constants';

export class CollaborationController {
  constructor(private readonly service: ICollaborationService) {}

  createRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collab = await this.service.createRequest(req.user!.userId, req.body);
      sendSuccess(res, { collaboration: collab }, 'Collaboration request created', HTTP_STATUS.CREATED);
    } catch (err) {
      next(err);
    }
  };

  getInbox = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getInbox(req.user!.userId, req.query as any);
      sendSuccess(res, result, 'Inbox retrieved');
    } catch (err) {
      next(err);
    }
  };

  getSent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.getSent(req.user!.userId, req.query as any);
      sendSuccess(res, result, 'Sent requests retrieved');
    } catch (err) {
      next(err);
    }
  };

  acceptRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collab = await this.service.acceptRequest(req.params.id as string, req.user!.userId);
      sendSuccess(res, { collaboration: collab }, 'Request accepted');
    } catch (err) {
      next(err);
    }
  };

  declineRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const collab = await this.service.declineRequest(req.params.id as string, req.user!.userId);
      sendSuccess(res, { collaboration: collab }, 'Request declined');
    } catch (err) {
      next(err);
    }
  };
}
