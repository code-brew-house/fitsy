import { randomBytes } from 'crypto';
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClubDto, JoinClubDto, UpdateClubDto } from '@fitsy/shared';

const DEFAULT_ACTIVITIES = [
  { name: 'Running', icon: '\u{1F3C3}', measurementType: 'DISTANCE' as const, pointsPerUnit: 1, unit: 'km' },
  { name: 'Cycling', icon: '\u{1F6B4}', measurementType: 'DISTANCE' as const, pointsPerUnit: 0.4, unit: 'km' },
  { name: 'Incline Treadmill', icon: '\u{26F0}\u{FE0F}', measurementType: 'DISTANCE' as const, pointsPerUnit: 2, unit: 'km' },
  { name: 'Home Treadmill', icon: '\u{1F3E0}', measurementType: 'DISTANCE' as const, pointsPerUnit: 1, unit: 'km' },
  { name: 'Gym Workout', icon: '\u{1F3CB}\u{FE0F}', measurementType: 'EFFORT' as const, pointsLow: 4, pointsMedium: 6, pointsHigh: 8, pointsExtreme: 12 },
  { name: 'Outdoor Park Walk', icon: '\u{1F333}', measurementType: 'FLAT' as const, flatPoints: 5 },
];

function generateInviteCode(): string {
  return randomBytes(8).toString('hex').toUpperCase();
}

@Injectable()
export class ClubService {
  constructor(private prisma: PrismaService) {}

  async createClub(userId: string, dto: CreateClubDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user?.clubId) {
        throw new ConflictException('User already belongs to a club');
      }

      const club = await tx.club.create({
        data: {
          name: dto.name,
          inviteCode: generateInviteCode(),
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { clubId: club.id, role: 'ADMIN' },
      });

      await tx.activityType.createMany({
        data: DEFAULT_ACTIVITIES.map((activity) => ({
          ...activity,
          clubId: club.id,
        })),
      });

      return club;
    });
  }

  async joinClub(userId: string, dto: JoinClubDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.clubId) {
      throw new ConflictException('User already belongs to a club');
    }

    const club = await this.prisma.club.findFirst({
      where: { inviteCode: dto.inviteCode },
    });
    if (!club) {
      throw new NotFoundException('Invalid invite code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { clubId: club.id },
    });

    return club;
  }

  async getClub(clubId: string) {
    const club = await this.prisma.club.findUnique({
      where: { id: clubId },
    });
    if (!club) {
      throw new NotFoundException('Club not found');
    }
    return club;
  }

  async updateClub(clubId: string, dto: UpdateClubDto) {
    return this.prisma.club.update({
      where: { id: clubId },
      data: { name: dto.name },
    });
  }

  async regenerateInviteCode(clubId: string) {
    return this.prisma.club.update({
      where: { id: clubId },
      data: { inviteCode: generateInviteCode() },
    });
  }

  async getMembers(clubId: string) {
    return this.prisma.user.findMany({
      where: { clubId },
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
  }

  async removeMember(clubId: string, memberId: string, requesterId: string) {
    if (memberId === requesterId) {
      throw new BadRequestException('Cannot remove yourself from the club');
    }

    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });
    if (!member || member.clubId !== clubId) {
      throw new NotFoundException('Member not found in this club');
    }

    await this.prisma.user.update({
      where: { id: memberId },
      data: { clubId: null, role: 'MEMBER' },
    });
  }

  async getUserClubId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.clubId) {
      throw new NotFoundException('User does not belong to a club');
    }
    return user.clubId;
  }
}
