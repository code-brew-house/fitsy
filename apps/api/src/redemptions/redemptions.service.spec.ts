import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RedemptionsService } from './redemptions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RedemptionsService', () => {
  let service: RedemptionsService;
  let prisma: any;

  const mockUser = {
    id: 'user-1',
    totalPoints: 100,
    familyId: 'family-1',
  };

  const mockReward = {
    id: 'reward-1',
    familyId: 'family-1',
    name: 'Movie Night',
    pointCost: 50,
    quantity: null,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      reward: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      redemption: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn) =>
        fn({
          redemption: {
            create: jest.fn().mockResolvedValue({
              id: 'redemption-1',
              userId: 'user-1',
              rewardId: 'reward-1',
              pointsSpent: 50,
              status: 'PENDING',
            }),
            update: jest.fn().mockResolvedValue({
              id: 'redemption-1',
              status: 'CANCELLED',
            }),
          },
          user: {
            update: jest.fn(),
          },
          reward: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedemptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RedemptionsService>(RedemptionsService);
  });

  describe('create', () => {
    it('should create a redemption and deduct points', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reward.findUnique.mockResolvedValue(mockReward);

      const result = await service.create('user-1', { rewardId: 'reward-1' });

      expect(result).toEqual({
        id: 'redemption-1',
        userId: 'user-1',
        rewardId: 'reward-1',
        pointsSpent: 50,
        status: 'PENDING',
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient points', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        totalPoints: 10,
      });
      prisma.reward.findUnique.mockResolvedValue(mockReward);

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if reward is inactive', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reward.findUnique.mockResolvedValue({
        ...mockReward,
        isActive: false,
      });

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if reward is out of stock', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reward.findUnique.mockResolvedValue({
        ...mockReward,
        quantity: 0,
      });

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if reward belongs to different family', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.reward.findUnique.mockResolvedValue({
        ...mockReward,
        familyId: 'other-family',
      });

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('fulfill', () => {
    it('should change redemption status to FULFILLED', async () => {
      prisma.redemption.findUnique.mockResolvedValue({
        id: 'redemption-1',
        reward: { familyId: 'family-1' },
      });
      prisma.redemption.update.mockResolvedValue({
        id: 'redemption-1',
        status: 'FULFILLED',
      });

      const result = await service.fulfill('family-1', 'redemption-1');
      expect(result.status).toBe('FULFILLED');
    });

    it('should throw NotFoundException if redemption not in family', async () => {
      prisma.redemption.findUnique.mockResolvedValue({
        id: 'redemption-1',
        reward: { familyId: 'other-family' },
      });

      await expect(
        service.fulfill('family-1', 'redemption-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOwn', () => {
    it('should return user redemptions', async () => {
      const mockRedemptions = [
        {
          id: 'redemption-1',
          reward: { name: 'Movie Night' },
          pointsSpent: 50,
          status: 'PENDING',
        },
      ];
      prisma.redemption.findMany.mockResolvedValue(mockRedemptions);

      const result = await service.findOwn('user-1');
      expect(result).toEqual(mockRedemptions);
      expect(prisma.redemption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });
});
