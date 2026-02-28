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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!user || user.familyId !== activityType.familyId) {
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

  async findOwn(userId: string, page: number = 1, limit: number = 20, activityTypeId?: string) {
    const where: any = { userId };
    if (activityTypeId) {
      where.activityTypeId = activityTypeId;
    }

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        include: {
          activityType: { select: { name: true, icon: true } },
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        userId: log.userId,
        userName: log.user.name,
        activityTypeId: log.activityTypeId,
        activityTypeName: log.activityType.name,
        activityTypeIcon: log.activityType.icon,
        measurementType: log.measurementType,
        distanceKm: log.distanceKm,
        effortLevel: log.effortLevel,
        durationMinutes: log.durationMinutes,
        pointsEarned: log.pointsEarned,
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async findFeed(familyId: string, limit: number = 20) {
    const users = await this.prisma.user.findMany({
      where: { familyId },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);

    const logs = await this.prisma.activityLog.findMany({
      where: { userId: { in: userIds } },
      include: {
        activityType: { select: { name: true, icon: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      activityTypeId: log.activityTypeId,
      activityTypeName: log.activityType.name,
      activityTypeIcon: log.activityType.icon,
      measurementType: log.measurementType,
      distanceKm: log.distanceKm,
      effortLevel: log.effortLevel,
      durationMinutes: log.durationMinutes,
      pointsEarned: log.pointsEarned,
      createdAt: log.createdAt.toISOString(),
    }));
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
