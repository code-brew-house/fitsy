import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClubService } from './club.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ClubService', () => {
  let service: ClubService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      club: {
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
        ClubService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClubService>(ClubService);
  });

  describe('createClub', () => {
    it('should create a club, promote user to admin, and seed activities', async () => {
      const mockClub = {
        id: 'club-1',
        name: 'Test Club',
        inviteCode: 'ABCD1234',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clubId: null,
      });
      prisma.club.create.mockResolvedValue(mockClub);
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        role: 'ADMIN',
        clubId: 'club-1',
      });
      prisma.activityType.createMany.mockResolvedValue({ count: 6 });

      const result = await service.createClub('user-1', { name: 'Test Club' });

      expect(result).toEqual(mockClub);
      expect(prisma.club.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Club',
          inviteCode: expect.any(String),
        }),
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { clubId: 'club-1', role: 'ADMIN' },
      });
      expect(prisma.activityType.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Running', clubId: 'club-1' }),
        ]),
      });
    });

    it('should throw ConflictException if user already has a club', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clubId: 'existing-club',
      });

      await expect(
        service.createClub('user-1', { name: 'New Club' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('joinClub', () => {
    it('should join a club by invite code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        clubId: null,
      });
      prisma.club.findFirst.mockResolvedValue({
        id: 'club-1',
        name: 'Test Club',
        inviteCode: 'ABCD1234',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-2',
        clubId: 'club-1',
        role: 'MEMBER',
      });

      const result = await service.joinClub('user-2', { inviteCode: 'ABCD1234' });

      expect(result.id).toBe('club-1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { clubId: 'club-1' },
      });
    });

    it('should throw ConflictException if user already in a club', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        clubId: 'existing-club',
      });

      await expect(
        service.joinClub('user-2', { inviteCode: 'ABCD1234' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if invite code is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        clubId: null,
      });
      prisma.club.findFirst.mockResolvedValue(null);

      await expect(
        service.joinClub('user-2', { inviteCode: 'INVALID' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMembers', () => {
    it('should return all members of a club', async () => {
      const members = [
        { id: 'user-1', name: 'Alice', email: 'a@test.com', role: 'ADMIN', image: null, totalPoints: 100, createdAt: new Date() },
        { id: 'user-2', name: 'Bob', email: 'b@test.com', role: 'MEMBER', image: null, totalPoints: 50, createdAt: new Date() },
      ];
      prisma.user.findMany.mockResolvedValue(members);

      const result = await service.getMembers('club-1');

      expect(result).toEqual(members);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { clubId: 'club-1' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          totalPoints: true,
          createdAt: true,
        },
      });
    });
  });

  describe('removeMember', () => {
    it('should throw BadRequestException if trying to remove self', async () => {
      await expect(
        service.removeMember('club-1', 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if member not in club', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        clubId: 'other-club',
      });

      await expect(
        service.removeMember('club-1', 'user-2', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove member from club', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        clubId: 'club-1',
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-2',
        clubId: null,
        role: 'MEMBER',
      });

      await service.removeMember('club-1', 'user-2', 'user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { clubId: null, role: 'MEMBER' },
      });
    });
  });

  describe('getUserClubId', () => {
    it('should throw NotFoundException if user has no club', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clubId: null,
      });

      await expect(
        service.getUserClubId('user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return clubId if user has one', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        clubId: 'club-1',
      });

      const result = await service.getUserClubId('user-1');
      expect(result).toBe('club-1');
    });
  });
});
