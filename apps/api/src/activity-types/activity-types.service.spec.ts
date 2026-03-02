import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivityTypesService } from './activity-types.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeasurementType } from '@fitsy/shared';

describe('ActivityTypesService', () => {
  let service: ActivityTypesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      activityType: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityTypesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ActivityTypesService>(ActivityTypesService);
  });

  describe('findAll', () => {
    it('should return all active activity types for a club', async () => {
      const mockTypes = [
        { id: 'at-1', name: 'Running', icon: '\u{1F3C3}', clubId: 'club-1', isActive: true },
        { id: 'at-2', name: 'Cycling', icon: '\u{1F6B4}', clubId: 'club-1', isActive: true },
      ];
      prisma.activityType.findMany.mockResolvedValue(mockTypes);

      const result = await service.findAll('club-1');

      expect(result).toEqual(mockTypes);
      expect(prisma.activityType.findMany).toHaveBeenCalledWith({
        where: { clubId: 'club-1', isActive: true },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('should create a new activity type linked to a club', async () => {
      const dto = {
        name: 'Swimming',
        icon: '\u{1F3CA}',
        measurementType: MeasurementType.DISTANCE,
        pointsPerUnit: 2,
        unit: 'km',
      };
      const mockCreated = { id: 'at-3', ...dto, clubId: 'club-1', isActive: true };
      prisma.activityType.create.mockResolvedValue(mockCreated);

      const result = await service.create('club-1', dto);

      expect(result).toEqual(mockCreated);
      expect(prisma.activityType.create).toHaveBeenCalledWith({
        data: { ...dto, clubId: 'club-1' },
      });
    });
  });

  describe('update', () => {
    it('should update an activity type that belongs to the club', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        clubId: 'club-1',
        name: 'Running',
      });
      prisma.activityType.update.mockResolvedValue({
        id: 'at-1',
        clubId: 'club-1',
        name: 'Trail Running',
      });

      const result = await service.update('club-1', 'at-1', { name: 'Trail Running' });

      expect(result.name).toBe('Trail Running');
      expect(prisma.activityType.update).toHaveBeenCalledWith({
        where: { id: 'at-1' },
        data: { name: 'Trail Running' },
      });
    });

    it('should throw NotFoundException if activity type belongs to different club', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        clubId: 'other-club',
      });

      await expect(
        service.update('club-1', 'at-1', { name: 'Trail Running' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete an activity type by setting isActive to false', async () => {
      prisma.activityType.findUnique.mockResolvedValue({
        id: 'at-1',
        clubId: 'club-1',
        isActive: true,
      });
      prisma.activityType.update.mockResolvedValue({
        id: 'at-1',
        clubId: 'club-1',
        isActive: false,
      });

      const result = await service.remove('club-1', 'at-1');

      expect(result.isActive).toBe(false);
      expect(prisma.activityType.update).toHaveBeenCalledWith({
        where: { id: 'at-1' },
        data: { isActive: false },
      });
    });

    it('should throw NotFoundException if activity type not found', async () => {
      prisma.activityType.findUnique.mockResolvedValue(null);

      await expect(
        service.remove('club-1', 'at-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
