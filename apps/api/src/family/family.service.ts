import { randomBytes } from 'crypto';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFamilyDto, JoinFamilyDto, UpdateFamilyDto } from '@fitsy/shared';

const DEFAULT_ACTIVITIES = [
  { name: 'Running', icon: '\u{1F3C3}', measurementType: 'DISTANCE' as const, pointsPerUnit: 1, unit: 'km' },
  { name: 'Cycling', icon: '\u{1F6B4}', measurementType: 'DISTANCE' as const, pointsPerUnit: 0.4, unit: 'km' },
  { name: 'Incline Treadmill', icon: '\u{26F0}\u{FE0F}', measurementType: 'DISTANCE' as const, pointsPerUnit: 2, unit: 'km' },
  { name: 'Home Treadmill', icon: '\u{1F3E0}', measurementType: 'DISTANCE' as const, pointsPerUnit: 1, unit: 'km' },
  { name: 'Gym Workout', icon: '\u{1F3CB}\u{FE0F}', measurementType: 'EFFORT' as const, pointsLow: 4, pointsMedium: 6, pointsHigh: 8, pointsExtreme: 12 },
  { name: 'Outdoor Park Walk', icon: '\u{1F333}', measurementType: 'FLAT' as const, flatPoints: 5 },
];

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  async createFamily(userId: string, dto: CreateFamilyDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.familyId) {
        throw new ConflictException('User already belongs to a family');
      }

      const family = await tx.family.create({
        data: {
          name: dto.name,
          inviteCode: generateInviteCode(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { familyId: family.id, role: 'ADMIN' },
      });

      await tx.activityType.createMany({
        data: DEFAULT_ACTIVITIES.map((activity) => ({
          ...activity,
          familyId: family.id,
        })),
      });

      return family;
    });
  }

  async joinFamily(userId: string, dto: JoinFamilyDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.familyId) {
      throw new ConflictException('User already belongs to a family');
    }

    const family = await this.prisma.family.findFirst({
      where: { inviteCode: dto.inviteCode },
    });
    if (!family) {
      throw new NotFoundException('Invalid invite code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { familyId: family.id },
    });

    return family;
  }

  async getFamily(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    return family;
  }

  async updateFamily(familyId: string, dto: UpdateFamilyDto) {
    return this.prisma.family.update({
      where: { id: familyId },
      data: { name: dto.name },
    });
  }

  async regenerateInviteCode(familyId: string) {
    return this.prisma.family.update({
      where: { id: familyId },
      data: { inviteCode: generateInviteCode() },
    });
  }

  async getMembers(familyId: string) {
    return this.prisma.user.findMany({
      where: { familyId },
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
  }

  async removeMember(familyId: string, memberId: string, requesterId: string) {
    if (memberId === requesterId) {
      throw new BadRequestException('Cannot remove yourself from the family');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });
    if (!member || member.familyId !== familyId) {
      throw new NotFoundException('Member not found in this family');
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { familyId: null, role: 'MEMBER' },
    });
  }

  async getUserFamilyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.familyId) {
      throw new NotFoundException('User does not belong to a family');
    }
    return user.familyId;
  }
}
