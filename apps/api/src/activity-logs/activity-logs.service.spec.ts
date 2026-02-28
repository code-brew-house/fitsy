import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { EffortLevel } from '@fitsy/shared';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activityType: {
        findUnique: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      $transaction: jest.fn((args: any[]) => Promise.all(args)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
  });

  describe('create', () => {
    it('should calculate DISTANCE points: 5km running at 1pt/km = 5 pts', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        name: 'Running',
        measurementType: 'DISTANCE',
        pointsPerUnit: 1,
        isActive: true,
      });

      const logResult = {
        id: 'log-1',
        userId: 'user-1',
        activityTypeId: 'at-1',
        measurementType: 'DISTANCE',
        distanceKm: 5,
        pointsEarned: 5,
        activityType: { name: 'Running', icon: '\u{1F3C3}' },
      };
      prisma.activityLog.create.mockResolvedValue(logResult);
      prisma.user.update.mockResolvedValue({ id: 'user-1', totalPoints: 5 });

      const result = await service.create('user-1', {
        activityTypeId: 'at-1',
        distanceKm: 5,
      });

      expect(result.pointsEarned).toBe(5);
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pointsEarned: 5 }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totalPoints: { increment: 5 } },
      });
    });

    it('should calculate EFFORT points: HIGH gym workout = 8 pts', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-2',
        name: 'Gym Workout',
        measurementType: 'EFFORT',
        pointsLow: 4,
        pointsMedium: 6,
        pointsHigh: 8,
        pointsExtreme: 12,
        isActive: true,
      });

      const logResult = {
        id: 'log-2',
        pointsEarned: 8,
        activityType: { name: 'Gym Workout', icon: '\u{1F3CB}\u{FE0F}' },
      };
      prisma.activityLog.create.mockResolvedValue(logResult);
      prisma.user.update.mockResolvedValue({});

      const result = await service.create('user-1', {
        activityTypeId: 'at-2',
        effortLevel: EffortLevel.HIGH,
      });

      expect(result.pointsEarned).toBe(8);
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pointsEarned: 8 }),
        }),
      );
    });

    it('should calculate FLAT points: park walk = 5 pts', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-3',
        name: 'Outdoor Park Walk',
        measurementType: 'FLAT',
        flatPoints: 5,
        isActive: true,
      });

      const logResult = {
        id: 'log-3',
        pointsEarned: 5,
        activityType: { name: 'Outdoor Park Walk', icon: '\u{1F333}' },
      };
      prisma.activityLog.create.mockResolvedValue(logResult);
      prisma.user.update.mockResolvedValue({});

      const result = await service.create('user-1', {
        activityTypeId: 'at-3',
      });

      expect(result.pointsEarned).toBe(5);
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pointsEarned: 5 }),
        }),
      );
    });

    it('should calculate DURATION points: 30min at 0.067 pts/min = 2 pts', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-4',
        name: 'Yoga',
        measurementType: 'DURATION',
        pointsPerMinute: 0.067,
        isActive: true,
      });

      const logResult = {
        id: 'log-4',
        pointsEarned: 2,
        activityType: { name: 'Yoga', icon: '\u{1F9D8}' },
      };
      prisma.activityLog.create.mockResolvedValue(logResult);
      prisma.user.update.mockResolvedValue({});

      const result = await service.create('user-1', {
        activityTypeId: 'at-4',
        durationMinutes: 30,
      });

      expect(result.pointsEarned).toBe(2);
      expect(prisma.activityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pointsEarned: 2 }),
        }),
      );
    });

    it('should increment totalPoints on the user record', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        name: 'Running',
        measurementType: 'DISTANCE',
        pointsPerUnit: 1,
        isActive: true,
      });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-5', pointsEarned: 10 });
      prisma.user.update.mockResolvedValue({ id: 'user-1', totalPoints: 110 });

      await service.create('user-1', {
        activityTypeId: 'at-1',
        distanceKm: 10,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { totalPoints: { increment: 10 } },
      });
    });

    it('should throw NotFoundException if activity type not found', async () => {
      prisma.activityType.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', { activityTypeId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOwn', () => {
    it('should return paginated activity logs for the user', async () => {
      const mockLogs = [
        { id: 'log-1', pointsEarned: 5, activityType: { name: 'Running', icon: '\u{1F3C3}' } },
      ];
      prisma.activityLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findOwn('user-1', 1, 20);

      expect(result).toEqual(mockLogs);
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
        include: {
          activityType: { select: { name: true, icon: true } },
        },
      });
    });
  });

  describe('findFeed', () => {
    it('should return recent activity logs for the whole family', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          pointsEarned: 5,
          user: { name: 'Alice' },
          activityType: { name: 'Running', icon: '\u{1F3C3}' },
        },
      ];
      prisma.activityLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.findFeed('family-1', 20);

      expect(result).toEqual(mockLogs);
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { user: { familyId: 'family-1' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { name: true } },
          activityType: { select: { name: true, icon: true } },
        },
      });
    });
  });
});
