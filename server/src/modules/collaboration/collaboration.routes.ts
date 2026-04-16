// ABOUTME: Collaboration route definitions — wires middleware, validation, and controller.
// ABOUTME: Mounted at /api/v1/collaborations in index.ts.

import { Router } from 'express';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';
import { CollaborationRepository } from './collaboration.repository';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  createCollaborationSchema,
  getInboxSchema,
  getSentSchema,
  requestIdSchema,
} from './collaboration.validation';

const repo = new CollaborationRepository();
const service = new CollaborationService(repo);
const controller = new CollaborationController(service);

const router = Router();

// POST /api/v1/collaborations — brand creates request
router.post('/', authenticate, authorize('brand'), validate(createCollaborationSchema), controller.createRequest);

// GET /api/v1/collaborations/inbox — creator's received requests
router.get('/inbox', authenticate, authorize('creator'), validate(getInboxSchema), controller.getInbox);

// GET /api/v1/collaborations/sent — brand's sent requests
router.get('/sent', authenticate, authorize('brand'), validate(getSentSchema), controller.getSent);

// PATCH /api/v1/collaborations/:id/accept — creator accepts
router.patch('/:id/accept', authenticate, authorize('creator'), validate(requestIdSchema), controller.acceptRequest);

// PATCH /api/v1/collaborations/:id/decline — creator declines
router.patch('/:id/decline', authenticate, authorize('creator'), validate(requestIdSchema), controller.declineRequest);

export default router;
