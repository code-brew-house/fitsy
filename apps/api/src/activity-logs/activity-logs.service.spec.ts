import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReactionsService } from '../reactions/reactions.service';
import { EffortLevel } from '@fitsy/shared';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let prisma: any;
  let reactionsService: any;

  beforeEach(async () => {
    prisma = {
      activityType: {
        findUnique: jest.fn(),
      },
      activityLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((args: any[]) => Promise.all(args)),
    };

    reactionsService = {
      getReactionSummariesForLogs: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReactionsService, useValue: reactionsService },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ familyId: 'family-1' });
    });

    it('should calculate DISTANCE points: 5km running at 1pt/km = 5 pts', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        name: 'Running',
        measurementType: 'DISTANCE',
        pointsPerUnit: 1,
        isActive: true,
        familyId: 'family-1',
      });

      const logResult = {
        id: 'log-1',
        userId: 'user-1',
        activityTypeId: 'at-1',
        measurementType: 'DISTANCE',
        distanceKm: 5,
        pointsEarned: 5,
        note: null,
        createdAt: new Date(),
        activityType: { name: 'Running', icon: '\u{1F3C3}' },
        user: { name: 'Alice' },
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
        familyId: 'family-1',
      });

      const logResult = {
        id: 'log-2',
        pointsEarned: 8,
        note: null,
        createdAt: new Date(),
        activityType: { name: 'Gym Workout', icon: '\u{1F3CB}\u{FE0F}' },
        user: { name: 'Alice' },
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
        familyId: 'family-1',
      });

      const logResult = {
        id: 'log-3',
        pointsEarned: 5,
        note: null,
        createdAt: new Date(),
        activityType: { name: 'Outdoor Park Walk', icon: '\u{1F333}' },
        user: { name: 'Alice' },
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
        familyId: 'family-1',
      });

      const logResult = {
        id: 'log-4',
        pointsEarned: 2,
        note: null,
        createdAt: new Date(),
        activityType: { name: 'Yoga', icon: '\u{1F9D8}' },
        user: { name: 'Alice' },
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
        familyId: 'family-1',
      });
      prisma.activityLog.create.mockResolvedValue({ id: 'log-5', pointsEarned: 10, note: null, createdAt: new Date(), activityType: { name: 'Running', icon: '\u{1F3C3}' }, user: { name: 'Alice' } });
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

    it('should throw NotFoundException if user familyId does not match activity type familyId', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        name: 'Running',
        measurementType: 'DISTANCE',
        pointsPerUnit: 1,
        isActive: true,
        familyId: 'other-family',
      });

      await expect(
        service.create('user-1', { activityTypeId: 'at-1', distanceKm: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOwn', () => {
    it('should return paginated activity logs for the user', async () => {
      const now = new Date();
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          activityTypeId: 'at-1',
          measurementType: 'DISTANCE',
          distanceKm: 5,
          effortLevel: null,
          durationMinutes: null,
          pointsEarned: 5,
          note: null,
          createdAt: now,
          activityType: { name: 'Running', icon: '\u{1F3C3}' },
          user: { name: 'Alice' },
          _count: { comments: 2 },
        },
      ];
      prisma.activityLog.findMany.mockResolvedValue(mockLogs);
      prisma.activityLog.count.mockResolvedValue(1);

      const result = await service.findOwn('user-1', 1, 20);

      expect(result).toEqual({
        data: [
          {
            id: 'log-1',
            userId: 'user-1',
            userName: 'Alice',
            activityTypeId: 'at-1',
            activityTypeName: 'Running',
            activityTypeIcon: '\u{1F3C3}',
            measurementType: 'DISTANCE',
            distanceKm: 5,
            effortLevel: null,
            durationMinutes: null,
            pointsEarned: 5,
            note: null,
            commentCount: 2,
            reactions: [],
            createdAt: now.toISOString(),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: {
          activityType: { select: { name: true, icon: true } },
          user: { select: { name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('findFeed', () => {
    it('should return recent activity logs for the whole family', async () => {
      const now = new Date();
      prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
      const mockLogs = [
        {
          id: 'log-1',
          userId: 'user-1',
          activityTypeId: 'at-1',
          measurementType: 'DISTANCE',
          distanceKm: 5,
          effortLevel: null,
          durationMinutes: null,
          pointsEarned: 5,
          note: 'Great run!',
          createdAt: now,
          user: { name: 'Alice' },
          activityType: { name: 'Running', icon: '\u{1F3C3}' },
          _count: { comments: 3 },
        },
      ];
      prisma.activityLog.findMany.mockResolvedValue(mockLogs);
      reactionsService.getReactionSummariesForLogs.mockResolvedValue({
        'log-1': [{ emoji: '\u{1F44D}', count: 2, userReacted: true }],
      });

      const result = await service.findFeed('family-1', 'user-1', 20);

      expect(result).toEqual([
        {
          id: 'log-1',
          userId: 'user-1',
          userName: 'Alice',
          activityTypeId: 'at-1',
          activityTypeName: 'Running',
          activityTypeIcon: '\u{1F3C3}',
          measurementType: 'DISTANCE',
          distanceKm: 5,
          effortLevel: null,
          durationMinutes: null,
          pointsEarned: 5,
          note: 'Great run!',
          commentCount: 3,
          reactions: [{ emoji: '\u{1F44D}', count: 2, userReacted: true }],
          createdAt: now.toISOString(),
        },
      ]);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        select: { id: true },
      });
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { userId: { in: ['user-1', 'user-2'] } },
        include: {
          activityType: { select: { name: true, icon: true } },
          user: { select: { name: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      expect(reactionsService.getReactionSummariesForLogs).toHaveBeenCalledWith(['log-1'], 'user-1');
    });
  });
});
