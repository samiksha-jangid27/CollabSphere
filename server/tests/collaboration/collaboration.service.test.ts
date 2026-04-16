// ABOUTME: Unit tests for CollaborationService — validates business logic and authorization.
// ABOUTME: Uses in-memory DB for repository tests.

import bcrypt from 'bcryptjs';
import { setupTestDb, teardownTestDb, clearCollections } from '../helpers/testDb';
import { User, IUser } from '@/models/User';
import { CollaborationRequest } from '@/models/CollaborationRequest';
import { CollaborationRepository } from '@/modules/collaboration/collaboration.repository';
import { CollaborationService } from '@/modules/collaboration/collaboration.service';
import { AppError, ERROR_CODES } from '@/shared/errors';

const repo = new CollaborationRepository();
const service = new CollaborationService(repo);

let creatorUser: IUser;
let brandUser: IUser;

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

afterEach(async () => {
  await clearCollections();
});

async function createTestUsers() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  creatorUser = await User.create({
    username: 'creator1',
    password: hashedPassword,
    role: 'creator',
  });
  brandUser = await User.create({
    username: 'brand1',
    password: hashedPassword,
    role: 'brand',
  });
}

describe('CollaborationService', () => {
  describe('createRequest', () => {
    beforeEach(async () => {
      await createTestUsers();
    });

    it('creates a request with valid input', async () => {
      const input = {
        recipientId: creatorUser._id.toString(),
        title: 'Fashion Collaboration',
        description: 'Looking for a fashion influencer',
        budget: 50000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const result = await service.createRequest(brandUser._id.toString(), input);

      expect(result).toBeDefined();
      expect(result.userId.toString()).toBe(creatorUser._id.toString());
      expect(result.brandId.toString()).toBe(brandUser._id.toString());
      expect(result.title).toBe('Fashion Collaboration');
      expect(result.status).toBe('Open');
    });

    it('throws error if deadline is in the past', async () => {
      const input = {
        recipientId: creatorUser._id.toString(),
        title: 'Fashion Collaboration',
        description: 'Looking for a fashion influencer',
        budget: 50000,
        deadline: new Date(Date.now() - 1000),
      };

      await expect(service.createRequest(brandUser._id.toString(), input)).rejects.toMatchObject({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: expect.stringContaining('future'),
      });
    });

    it('accepts deadline as string and parses it', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const input = {
        recipientId: creatorUser._id.toString(),
        title: 'Tech Collab',
        description: 'Tech influencer needed',
        budget: 100000,
        deadline: futureDate.toISOString(),
      };

      const result = await service.createRequest(brandUser._id.toString(), input);

      expect(result).toBeDefined();
      expect(result.status).toBe('Open');
    });
  });

  describe('getInbox', () => {
    beforeEach(async () => {
      await createTestUsers();
    });

    it('returns requests for creator with pagination', async () => {
      for (let i = 0; i < 15; i++) {
        await CollaborationRequest.create({
          userId: creatorUser._id,
          brandId: brandUser._id,
          title: `Request ${i}`,
          description: `Description ${i}`,
          budget: 10000,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'Open',
        });
      }

      const result = await service.getInbox(creatorUser._id.toString(), { page: 1, limit: 10 });

      expect(result.data.length).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.hasNext).toBe(true);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });

    it('filters by status', async () => {
      await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Open Request',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });

      await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Accepted Request',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Accepted',
      });

      const result = await service.getInbox(creatorUser._id.toString(), { status: 'Open' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe('Open Request');
    });

    it('returns empty array for creator with no requests', async () => {
      const result = await service.getInbox(creatorUser._id.toString(), {});

      expect(result.data.length).toBe(0);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getSent', () => {
    beforeEach(async () => {
      await createTestUsers();
    });

    it('returns sent requests for brand with pagination', async () => {
      for (let i = 0; i < 12; i++) {
        await CollaborationRequest.create({
          userId: creatorUser._id,
          brandId: brandUser._id,
          title: `Sent ${i}`,
          description: `Description ${i}`,
          budget: 10000,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'Open',
        });
      }

      const result = await service.getSent(brandUser._id.toString(), { page: 1, limit: 10 });

      expect(result.data.length).toBe(10);
      expect(result.pagination.total).toBe(12);
      expect(result.pagination.hasNext).toBe(true);
    });

    it('filters sent by status', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const secondBrand = await User.create({
        username: 'brand2',
        password: hashedPassword,
        role: 'brand',
      });

      await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Open',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });

      await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: secondBrand._id,
        title: 'Accepted',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Accepted',
      });

      const result = await service.getSent(brandUser._id.toString(), { status: 'Open' });

      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe('Open');
    });
  });

  describe('acceptRequest', () => {
    beforeEach(async () => {
      await createTestUsers();
    });

    it('creator accepts an open request', async () => {
      const request = await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Test',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });

      const result = await service.acceptRequest(request._id.toString(), creatorUser._id.toString());

      expect(result.status).toBe('Accepted');
    });

    it('throws error if creator is not the recipient', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherCreator = await User.create({
        username: 'creator2',
        password: hashedPassword,
        role: 'creator',
      });

      const request = await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Test',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });

      await expect(
        service.acceptRequest(request._id.toString(), otherCreator._id.toString())
      ).rejects.toMatchObject({
        code: ERROR_CODES.COLLAB_UNAUTHORIZED,
      });
    });

    it('throws error if request not found', async () => {
      const fakeId = new (require('mongoose')).Types.ObjectId();

      await expect(service.acceptRequest(fakeId.toString(), creatorUser._id.toString())).rejects.toMatchObject({
        code: ERROR_CODES.COLLAB_REQUEST_NOT_FOUND,
      });
    });

    it('throws error if request is already declined', async () => {
      const request = await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Test',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Declined',
      });

      await expect(service.acceptRequest(request._id.toString(), creatorUser._id.toString())).rejects.toMatchObject({
        code: ERROR_CODES.COLLAB_INVALID_STATUS_TRANSITION,
      });
    });
  });

  describe('declineRequest', () => {
    beforeEach(async () => {
      await createTestUsers();
    });

    it('creator declines an open request', async () => {
      const request = await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Test',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });

      const result = await service.declineRequest(request._id.toString(), creatorUser._id.toString());

      expect(result.status).toBe('Declined');
    });

    it('throws error if creator is not the recipient', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const otherCreator = await User.create({
        username: 'creator2',
        password: hashedPassword,
        role: 'creator',
      });

      const request = await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Test',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Open',
      });

      await expect(
        service.declineRequest(request._id.toString(), otherCreator._id.toString())
      ).rejects.toMatchObject({
        code: ERROR_CODES.COLLAB_UNAUTHORIZED,
      });
    });

    it('throws error if request is already accepted', async () => {
      const request = await CollaborationRequest.create({
        userId: creatorUser._id,
        brandId: brandUser._id,
        title: 'Test',
        description: 'Desc',
        budget: 10000,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'Accepted',
      });

      await expect(service.declineRequest(request._id.toString(), creatorUser._id.toString())).rejects.toMatchObject({
        code: ERROR_CODES.COLLAB_INVALID_STATUS_TRANSITION,
      });
    });
  });
});
