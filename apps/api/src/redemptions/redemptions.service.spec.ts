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
    clubId: 'club-1',
  };

  const mockReward = {
    id: 'reward-1',
    clubId: 'club-1',
    name: 'Movie Night',
    pointCost: 50,
    quantity: null,
    isActive: true,
  };

  let txUserFindUnique: jest.Mock;
  let txRewardFindUnique: jest.Mock;
  let txRedemptionCreate: jest.Mock;
  let txUserUpdate: jest.Mock;
  let txRewardUpdate: jest.Mock;

  beforeEach(async () => {
    txUserFindUnique = jest.fn();
    txRewardFindUnique = jest.fn();
    txRedemptionCreate = jest.fn().mockResolvedValue({
      id: 'redemption-1',
      userId: 'user-1',
      rewardId: 'reward-1',
      pointsSpent: 50,
      status: 'PENDING',
    });
    txUserUpdate = jest.fn();
    txRewardUpdate = jest.fn();

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
          user: {
            findUnique: txUserFindUnique,
            update: txUserUpdate,
          },
          reward: {
            findUnique: txRewardFindUnique,
            update: txRewardUpdate,
          },
          redemption: {
            create: txRedemptionCreate,
            update: jest.fn().mockResolvedValue({
              id: 'redemption-1',
              status: 'CANCELLED',
            }),
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
      txUserFindUnique.mockResolvedValue(mockUser);
      txRewardFindUnique.mockResolvedValue(mockReward);

      txUserFindUnique.mockResolvedValueOnce(mockUser).mockResolvedValueOnce({ name: 'Test User' });

      const result = await service.create('user-1', { rewardId: 'reward-1' });

      expect(result).toEqual({
        id: 'redemption-1',
        userId: 'user-1',
        rewardId: 'reward-1',
        pointsSpent: 50,
        status: 'PENDING',
        rewardName: 'Movie Night',
        userName: 'Test User',
      });
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if insufficient points', async () => {
      txUserFindUnique.mockResolvedValue({
        ...mockUser,
        totalPoints: 10,
      });
      txRewardFindUnique.mockResolvedValue(mockReward);

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if reward is inactive', async () => {
      txUserFindUnique.mockResolvedValue(mockUser);
      txRewardFindUnique.mockResolvedValue({
        ...mockReward,
        isActive: false,
      });

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if reward is out of stock', async () => {
      txUserFindUnique.mockResolvedValue(mockUser);
      txRewardFindUnique.mockResolvedValue({
        ...mockReward,
        quantity: 0,
      });

      await expect(
        service.create('user-1', { rewardId: 'reward-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if reward belongs to different club', async () => {
      txUserFindUnique.mockResolvedValue(mockUser);
      txRewardFindUnique.mockResolvedValue({
        ...mockReward,
        clubId: 'other-club',
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
        status: 'PENDING',
        reward: { clubId: 'club-1' },
      });
      prisma.redemption.update.mockResolvedValue({
        id: 'redemption-1',
        status: 'FULFILLED',
      });

      const result = await service.fulfill('club-1', 'redemption-1');
      expect(result.status).toBe('FULFILLED');
    });

    it('should throw BadRequestException if redemption is not PENDING', async () => {
      prisma.redemption.findUnique.mockResolvedValue({
        id: 'redemption-1',
        status: 'FULFILLED',
        reward: { clubId: 'club-1' },
      });

      await expect(
        service.fulfill('club-1', 'redemption-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if redemption not in club', async () => {
      prisma.redemption.findUnique.mockResolvedValue({
        id: 'redemption-1',
        status: 'PENDING',
        reward: { clubId: 'other-club' },
      });

      await expect(
        service.fulfill('club-1', 'redemption-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOwn', () => {
    it('should return user redemptions with flattened names', async () => {
      prisma.user.findUnique.mockResolvedValue({ name: 'Test User' });
      prisma.redemption.findMany.mockResolvedValue([
        {
          id: 'redemption-1',
          userId: 'user-1',
          rewardId: 'reward-1',
          reward: { name: 'Movie Night' },
          pointsSpent: 50,
          status: 'PENDING',
          createdAt: '2026-02-28T00:00:00.000Z',
        },
      ]);

      const result = await service.findOwn('user-1');
      expect(result).toEqual([
        {
          id: 'redemption-1',
          userId: 'user-1',
          userName: 'Test User',
          rewardId: 'reward-1',
          rewardName: 'Movie Night',
          pointsSpent: 50,
          status: 'PENDING',
          createdAt: '2026-02-28T00:00:00.000Z',
        },
      ]);
      expect(prisma.redemption.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });
});
