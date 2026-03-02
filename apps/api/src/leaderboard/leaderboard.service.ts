import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardEntry } from '@fitsy/shared';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getUserClubId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true },
    });
    if (!user || !user.clubId) {
      throw new ForbiddenException('User is not part of a club');
    }
    return user.clubId;
  }

  async getRankings(
    clubId: string,
    period: 'week' | 'month' | 'alltime',
  ): Promise<LeaderboardEntry[]> {
    // For all-time, use pre-computed totalPoints on User (no aggregation needed)
    if (period === 'alltime') {
      const members = await this.prisma.user.findMany({
        where: { clubId },
        select: { id: true, name: true, image: true, totalPoints: true },
        orderBy: { totalPoints: 'desc' },
      });
      return members.map((m) => ({
        userId: m.id,
        userName: m.name,
        avatarUrl: m.image,
        totalPoints: m.totalPoints,
        activityCount: 0,
      }));
    }

    const now = new Date();
    const dateFilter =
      period === 'week'
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const clubMembers = await this.prisma.user.findMany({
      where: { clubId },
      select: { id: true, name: true, image: true },
    });

    if (clubMembers.length === 0) return [];

    const memberIds = clubMembers.map((m) => m.id);

    const aggregations = await this.prisma.activityLog.groupBy({
      by: ['userId'],
      where: {
        userId: { in: memberIds },
        createdAt: { gte: dateFilter },
      },
      _sum: { pointsEarned: true },
      _count: { id: true },
    });

    const aggMap = new Map(
      aggregations.map((a) => [
        a.userId,
        {
          totalPoints: a._sum.pointsEarned || 0,
          activityCount: a._count.id,
        },
      ]),
    );

    const entries: LeaderboardEntry[] = clubMembers.map((member) => {
      const agg = aggMap.get(member.id);
      return {
        userId: member.id,
        userName: member.name,
        avatarUrl: member.image,
        totalPoints: agg?.totalPoints ?? 0,
        activityCount: agg?.activityCount ?? 0,
      };
    });

    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    return entries;
  }
}
