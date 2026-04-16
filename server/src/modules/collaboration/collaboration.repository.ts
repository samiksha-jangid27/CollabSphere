// ABOUTME: CollaborationRepository — encapsulates all database queries for collaboration requests.
// ABOUTME: Extends BaseRepository for CRUD; adds domain-specific query methods.

import { BaseRepository } from '../../shared/BaseRepository';
import { CollaborationRequest, ICollaborationRequest } from '../../models/CollaborationRequest';
import { CollaborationFilters, ICollaborationRepository } from './collaboration.interfaces';

export class CollaborationRepository extends BaseRepository<ICollaborationRequest> implements ICollaborationRepository {
  constructor() {
    super(CollaborationRequest);
  }

  async findInbox(userId: string, filters: CollaborationFilters): Promise<{ docs: ICollaborationRequest[]; total: number }> {
    const query: Record<string, unknown> = { userId };

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = ((filters.page || 1) - 1) * (filters.limit || 10);
    const limit = filters.limit || 10;

    const [docs, total] = await Promise.all([
      this.model
        .find(query as any)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(query as any),
    ]);

    return { docs, total };
  }

  async findSent(brandId: string, filters: CollaborationFilters): Promise<{ docs: ICollaborationRequest[]; total: number }> {
    const query: Record<string, unknown> = { brandId };

    if (filters.status) {
      query.status = filters.status;
    }

    const skip = ((filters.page || 1) - 1) * (filters.limit || 10);
    const limit = filters.limit || 10;

    const [docs, total] = await Promise.all([
      this.model
        .find(query as any)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(query as any),
    ]);

    return { docs, total };
  }
}
