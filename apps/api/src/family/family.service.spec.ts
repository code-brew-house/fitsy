import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FamilyService } from './family.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FamilyService', () => {
  let service: FamilyService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      family: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      activityType: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
  });

  describe('createFamily', () => {
    it('should create a family, promote user to admin, and seed activities', async () => {
      const mockFamily = {
        id: 'family-1',
        name: 'Test Family',
        inviteCode: 'ABCD1234',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        familyId: null,
      });
      prisma.family.create.mockResolvedValue(mockFamily);
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN',
        familyId: 'family-1',
      });
      prisma.activityType.createMany.mockResolvedValue({ count: 6 });

      const result = await service.createFamily('user-1', { name: 'Test Family' });

      expect(result).toEqual(mockFamily);
      expect(prisma.family.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Family',
          inviteCode: expect.any(String),
        }),
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { familyId: 'family-1', role: 'ADMIN' },
      });
      expect(prisma.activityType.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Running', familyId: 'family-1' }),
        ]),
      });
    });

    it('should throw ConflictException if user already has a family', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        familyId: 'existing-family',
      });

      await expect(
        service.createFamily('user-1', { name: 'New Family' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('joinFamily', () => {
    it('should join a family by invite code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        familyId: null,
      });
      prisma.family.findFirst.mockResolvedValue({
        id: 'family-1',
        name: 'Test Family',
        inviteCode: 'ABCD1234',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-2',
        familyId: 'family-1',
        role: 'MEMBER',
      });

      const result = await service.joinFamily('user-2', { inviteCode: 'ABCD1234' });

      expect(result.id).toBe('family-1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { familyId: 'family-1' },
      });
    });

    it('should throw ConflictException if user already in a family', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        familyId: 'existing-family',
      });

      await expect(
        service.joinFamily('user-2', { inviteCode: 'ABCD1234' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if invite code is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        familyId: null,
      });
      prisma.family.findFirst.mockResolvedValue(null);

      await expect(
        service.joinFamily('user-2', { inviteCode: 'INVALID' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    it('should return all members of a family', async () => {
      const members = [
        { id: 'user-1', name: 'Alice', email: 'a@test.com', role: 'ADMIN', avatarUrl: null, totalPoints: 100, createdAt: new Date() },
        { id: 'user-2', name: 'Bob', email: 'b@test.com', role: 'MEMBER', avatarUrl: null, totalPoints: 50, createdAt: new Date() },
      ];
      prisma.user.findMany.mockResolvedValue(members);

      const result = await service.getMembers('family-1');

      expect(result).toEqual(members);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { familyId: 'family-1' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          totalPoints: true,
          createdAt: true,
        },
      });
    });
  });

  describe('removeMember', () => {
    it('should throw BadRequestException if trying to remove self', async () => {
      await expect(
        service.removeMember('family-1', 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if member not in family', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        familyId: 'other-family',
      });

      await expect(
        service.removeMember('family-1', 'user-2', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove member from family', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        familyId: 'family-1',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-2',
        familyId: null,
        role: 'MEMBER',
      });

      await service.removeMember('family-1', 'user-2', 'user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { familyId: null, role: 'MEMBER' },
      });
    });
  });

  describe('getUserFamilyId', () => {
    it('should throw NotFoundException if user has no family', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        familyId: null,
      });

      await expect(
        service.getUserFamilyId('user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return familyId if user has one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        familyId: 'family-1',
      });

      const result = await service.getUserFamilyId('user-1');
      expect(result).toBe('family-1');
    });
  });
});
