import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaderboardEntry } from '@fitsy/shared';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getUserFamilyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!user || !user.familyId) {
      throw new ForbiddenException('User is not part of a family');
    }
    return user.familyId;
  }

  async getRankings(
    familyId: string,
    period: 'week' | 'month' | 'alltime',
  ): Promise<LeaderboardEntry[]> {
    const now = new Date();
    let dateFilter: Date | undefined;

    if (period === 'week') {
      dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get all family members
    const familyMembers = await this.prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, avatarUrl: true },
    });

    if (familyMembers.length === 0) {
      return [];
    }

    const memberIds = familyMembers.map((m) => m.id);

    // Build activity log query with date filter
    const whereClause: any = {
      userId: { in: memberIds },
    };
    if (dateFilter) {
      whereClause.createdAt = { gte: dateFilter };
    }

    // Group activity logs by user
    const aggregations = await this.prisma.activityLog.groupBy({
      by: ['userId'],
      where: whereClause,
      _sum: { pointsEarned: true },
      _count: { id: true },
    });

    // Build a map of userId -> aggregation
    const aggMap = new Map(
      aggregations.map((a) => [
        a.userId,
        {
          totalPoints: a._sum.pointsEarned || 0,
          activityCount: a._count.id,
        },
      ]),
    );

    // Merge with user data
    const entries: LeaderboardEntry[] = familyMembers.map((member) => {
      const agg = aggMap.get(member.id);
      return {
        userId: member.id,
        userName: member.name,
        avatarUrl: member.avatarUrl,
        totalPoints: agg?.totalPoints ?? 0,
        activityCount: agg?.activityCount ?? 0,
      };
    });

    // Sort by totalPoints descending
    entries.sort((a, b) => b.totalPoints - a.totalPoints);

    return entries;
  }
}
