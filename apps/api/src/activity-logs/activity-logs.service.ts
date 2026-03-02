import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReactionsService } from '../reactions/reactions.service';
import { CreateActivityLogDto, UpdateActivityLogDto } from '@fitsy/shared';

@Injectable()
export class ActivityLogsService {
  constructor(
    private prisma: PrismaService,
    private reactionsService: ReactionsService,
  ) {}

  async create(userId: string, dto: CreateActivityLogDto) {
    const activityType = await this.prisma.activityType.findUnique({
      where: { id: dto.activityTypeId },
    });
    if (!activityType || !activityType.isActive) {
      throw new NotFoundException('Activity type not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true },
    });
    if (!user || user.clubId !== activityType.clubId) {
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
          note: dto.note ?? null,
        },
        include: {
          activityType: { select: { name: true, icon: true } },
          user: { select: { name: true } },
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: pointsEarned } },
      }),
    ]);

    return {
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
      note: log.note ?? null,
      commentCount: 0,
      reactions: [],
      createdAt: log.createdAt.toISOString(),
    };
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
          _count: { select: { comments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    const logIds = data.map((l) => l.id);
    const reactionSummaries = await this.reactionsService.getReactionSummariesForLogs(logIds, userId);

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
        note: log.note ?? null,
        commentCount: log._count.comments,
        reactions: reactionSummaries[log.id] || [],
        createdAt: log.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async findFeed(clubId: string, userId: string, limit: number = 20) {
    const logs = await this.prisma.activityLog.findMany({
      where: { user: { clubId } },
      include: {
        activityType: { select: { name: true, icon: true } },
        user: { select: { name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const logIds = logs.map((l) => l.id);
    const reactionSummaries = await this.reactionsService.getReactionSummariesForLogs(logIds, userId);

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
      note: log.note ?? null,
      commentCount: log._count.comments,
      reactions: reactionSummaries[log.id] || [],
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async update(userId: string, logId: string, dto: UpdateActivityLogDto) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: logId },
      include: { activityType: true },
    });
    if (!log) throw new NotFoundException('Activity log not found');
    if (log.userId !== userId) throw new ForbiddenException('Not your activity log');

    const oldPoints = log.pointsEarned;
    const newPoints = this.calculatePoints(log.activityType, {
      activityTypeId: log.activityTypeId,
      distanceKm: dto.distanceKm ?? log.distanceKm ?? undefined,
      effortLevel: (dto.effortLevel ?? log.effortLevel ?? undefined) as any,
      durationMinutes: dto.durationMinutes ?? log.durationMinutes ?? undefined,
    });
    const pointsDelta = newPoints - oldPoints;

    const [updated] = await this.prisma.$transaction([
      this.prisma.activityLog.update({
        where: { id: logId },
        data: {
          distanceKm: dto.distanceKm ?? log.distanceKm,
          effortLevel: dto.effortLevel ?? log.effortLevel,
          durationMinutes: dto.durationMinutes ?? log.durationMinutes,
          note: dto.note !== undefined ? dto.note : log.note,
          pointsEarned: newPoints,
        },
        include: {
          activityType: { select: { name: true, icon: true } },
          user: { select: { name: true } },
        },
      }),
      ...(pointsDelta !== 0
        ? [
            this.prisma.user.update({
              where: { id: userId },
              data: { totalPoints: { increment: pointsDelta } },
            }),
          ]
        : []),
    ]);

    return {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user.name,
      activityTypeId: updated.activityTypeId,
      activityTypeName: updated.activityType.name,
      activityTypeIcon: updated.activityType.icon,
      measurementType: updated.measurementType,
      distanceKm: updated.distanceKm,
      effortLevel: updated.effortLevel,
      durationMinutes: updated.durationMinutes,
      pointsEarned: updated.pointsEarned,
      note: updated.note ?? null,
      commentCount: 0,
      reactions: [],
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async remove(userId: string, logId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: logId },
    });
    if (!log) throw new NotFoundException('Activity log not found');
    if (log.userId !== userId) throw new ForbiddenException('Not your activity log');

    await this.prisma.$transaction([
      this.prisma.activityLog.delete({ where: { id: logId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { decrement: log.pointsEarned } },
      }),
    ]);
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
