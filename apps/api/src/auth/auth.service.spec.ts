import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  const mockDate = new Date('2026-01-01T00:00:00.000Z');

  const mockUser = {
    id: 'user-1',
    email: 'test@fitsy.dev',
    name: 'Test User',
    image: 'https://example.com/avatar.png',
    role: 'MEMBER',
    familyId: 'family-1',
    totalPoints: 42,
    createdAt: mockDate,
    family: {
      id: 'family-1',
      name: 'The Tests',
      inviteCode: 'ABC123',
      createdAt: mockDate,
    },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('getMe', () => {
    it('should return a mapped user response with avatarUrl from image field', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { family: true },
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@fitsy.dev',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        role: 'MEMBER',
        familyId: 'family-1',
        totalPoints: 42,
        createdAt: mockDate.toISOString(),
        family: {
          id: 'family-1',
          name: 'The Tests',
          inviteCode: 'ABC123',
          createdAt: mockDate.toISOString(),
        },
      });
    });

    it('should map image to avatarUrl as null when user has no avatar', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        image: null,
        familyId: null,
        family: null,
      });

      const result = await service.getMe('user-1');

      expect(result.avatarUrl).toBeNull();
      expect(result.family).toBeNull();
    });

    it('should return null family when user has no family', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        familyId: null,
        family: null,
      });

      const result = await service.getMe('user-1');

      expect(result.familyId).toBeNull();
      expect(result.family).toBeNull();
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
