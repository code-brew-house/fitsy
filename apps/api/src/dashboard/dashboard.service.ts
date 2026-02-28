import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardResponse, MeasurementType } from '@fitsy/shared';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string): Promise<DashboardResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true, familyId: true },
    });
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Count activities and sum points this week
    const weekStats = await this.prisma.activityLog.aggregate({
      where: {
        userId,
        createdAt: { gte: weekStart },
      },
      _count: { id: true },
      _sum: { pointsEarned: true },
    });

    const activitiesThisWeek = weekStats._count.id;
    const pointsThisWeek = weekStats._sum.pointsEarned || 0;

    // Calculate current streak
    const currentStreak = await this.calculateStreak(userId);

    // Get 5 most recent activity logs with activityType info
    const recentLogs = await this.prisma.activityLog.findMany({
      where: { userId },
      include: {
        activityType: {
          select: { name: true, icon: true, measurementType: true },
        },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentActivities = recentLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userName: log.user.name,
      activityTypeId: log.activityTypeId,
      activityTypeName: log.activityType.name,
      activityTypeIcon: log.activityType.icon,
      measurementType: log.activityType.measurementType as MeasurementType,
      distanceKm: log.distanceKm,
      effortLevel: log.effortLevel as any,
      durationMinutes: log.durationMinutes,
      pointsEarned: log.pointsEarned,
      note: (log as any).note ?? null,
      commentCount: 0,
      reactions: [],
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      totalPoints: user.totalPoints,
      pointsThisWeek,
      activitiesThisWeek,
      currentStreak,
      recentActivities,
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    // Get all activity logs ordered by date descending
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) return 0;

    // Get unique dates (YYYY-MM-DD)
    const uniqueDates = [
      ...new Set(
        logs.map((log) => {
          const d = new Date(log.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }),
      ),
    ];

    // Sort descending
    uniqueDates.sort((a, b) => b.localeCompare(a));

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Yesterday string
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // Streak must include today or yesterday to be current
    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const current = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      const diffMs = current.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
