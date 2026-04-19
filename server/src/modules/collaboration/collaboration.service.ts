// ABOUTME: CollaborationService — orchestrates business logic for collaboration requests.
// ABOUTME: Handles creation, status transitions, and authorization checks for marketplace workflow.

import { ICollaborationRequest } from '../../models/CollaborationRequest';
import { AppError, ERROR_CODES } from '../../shared/errors';
import { eventBus, APP_EVENTS } from '../../shared/EventBus';
import {
  ICollaborationService,
  ICollaborationRepository,
  CreateCollaborationInput,
  CollaborationFilters,
  PaginatedResponse,
} from './collaboration.interfaces';

export class CollaborationService implements ICollaborationService {
  constructor(private readonly repository: ICollaborationRepository) {}

  async createRequest(brandId: string, input: CreateCollaborationInput): Promise<ICollaborationRequest> {
    const deadline = typeof input.deadline === 'string' ? new Date(input.deadline) : input.deadline;

    if (deadline < new Date()) {
      throw AppError.badRequest('Deadline must be in the future', ERROR_CODES.VALIDATION_ERROR);
    }

    const request = await this.repository.create({
      userId: input.recipientId as any,
      brandId: brandId as any,
      title: input.title,
      description: input.description,
      budget: input.budget,
      deadline,
      status: 'Open',
    });

    return request;
  }

  async getInbox(userId: string, filters: CollaborationFilters): Promise<PaginatedResponse<ICollaborationRequest>> {
    const { docs, total } = await this.repository.findInbox(userId, filters);

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const hasNext = page * limit < total;

    return {
      data: docs,
      pagination: {
        page,
        limit,
        total,
        hasNext,
      },
    };
  }

  async getSent(brandId: string, filters: CollaborationFilters): Promise<PaginatedResponse<ICollaborationRequest>> {
    const { docs, total } = await this.repository.findSent(brandId, filters);

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const hasNext = page * limit < total;

    return {
      data: docs,
      pagination: {
        page,
        limit,
        total,
        hasNext,
      },
    };
  }

  async acceptRequest(requestId: string, creatorId: string): Promise<ICollaborationRequest> {
    const request = await this.repository.findById(requestId);

    if (!request) {
      throw AppError.notFound('Request not found', ERROR_CODES.COLLAB_REQUEST_NOT_FOUND);
    }

    if (request.userId.toString() !== creatorId) {
      throw AppError.forbidden('Only the recipient can accept this request', ERROR_CODES.COLLAB_UNAUTHORIZED);
    }

    if (request.status !== 'Open' && request.status !== 'Pending') {
      throw AppError.badRequest(
        `Cannot accept request with status ${request.status}`,
        ERROR_CODES.COLLAB_INVALID_STATUS_TRANSITION
      );
    }

    const updated = await this.repository.updateById(requestId, { status: 'Accepted' });

    if (!updated) {
      throw AppError.internal('Failed to update request');
    }

    await eventBus.emit(APP_EVENTS.COLLAB_ACCEPTED, {
      collabRequestId: requestId,
      creatorId: request.userId.toString(),
      brandId: request.brandId.toString(),
    });

    return updated;
  }

  async declineRequest(requestId: string, creatorId: string): Promise<ICollaborationRequest> {
    const request = await this.repository.findById(requestId);

    if (!request) {
      throw AppError.notFound('Request not found', ERROR_CODES.COLLAB_REQUEST_NOT_FOUND);
    }

    if (request.userId.toString() !== creatorId) {
      throw AppError.forbidden('Only the recipient can decline this request', ERROR_CODES.COLLAB_UNAUTHORIZED);
    }

    if (request.status !== 'Open' && request.status !== 'Pending') {
      throw AppError.badRequest(
        `Cannot decline request with status ${request.status}`,
        ERROR_CODES.COLLAB_INVALID_STATUS_TRANSITION
      );
    }

    const updated = await this.repository.updateById(requestId, { status: 'Declined' });

    if (!updated) {
      throw AppError.internal('Failed to update request');
    }

    return updated;
  }
}
