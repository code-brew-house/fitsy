import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityLogDto } from '@fitsy/shared';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateActivityLogDto) {
    const activityType = await this.prisma.activityType.findUnique({
      where: { id: dto.activityTypeId },
    });
    if (!activityType || !activityType.isActive) {
      throw new NotFoundException('Activity type not found');
    }

    const pointsEarned = this.calculatePoints(activityType, dto);

    const [log] = await this.prisma.$transaction([
      this.prisma.activityLog.create({
        data: {
          userId,
          activityTypeId: dto.activityTypeId,
          measurementType: activityType.measurementType,
          distanceKm: dto.distanceKm ?? null,
          effortLevel: dto.effortLevel ?? null,
          durationMinutes: dto.durationMinutes ?? null,
          pointsEarned,
        },
        include: {
          activityType: { select: { name: true, icon: true } },
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: pointsEarned } },
      }),
    ]);

    return log;
  }

  async findOwn(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    return this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        activityType: { select: { name: true, icon: true } },
      },
    });
  }

  async findFeed(familyId: string, limit: number) {
    return this.prisma.activityLog.findMany({
      where: { user: { familyId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true } },
        activityType: { select: { name: true, icon: true } },
      },
    });
  }

  private calculatePoints(activityType: any, dto: CreateActivityLogDto): number {
    switch (activityType.measurementType) {
      case 'DISTANCE':
        return Math.round((dto.distanceKm ?? 0) * (activityType.pointsPerUnit ?? 0));
      case 'EFFORT': {
        const effortMap: Record<string, string> = {
          LOW: 'pointsLow',
          MEDIUM: 'pointsMedium',
          HIGH: 'pointsHigh',
          EXTREME: 'pointsExtreme',
        };
        const field = effortMap[dto.effortLevel ?? 'LOW'];
        return activityType[field] ?? 0;
      }
      case 'FLAT':
        return activityType.flatPoints ?? 0;
      case 'DURATION':
        return Math.round((dto.durationMinutes ?? 0) * (activityType.pointsPerMinute ?? 0));
      default:
        return 0;
    }
  }
}
