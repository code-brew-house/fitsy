import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileResponse, type Role } from '@fitsy/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(requestingUserId: string, targetUserId: string): Promise<ProfileResponse> {
    // Fetch both users to verify same family
    const [requester, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: requestingUserId },
        select: { clubId: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, name: true, image: true, role: true, totalPoints: true, clubId: true, createdAt: true },
      }),
    ]);

    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (!requester?.clubId || !target.clubId || requester.clubId !== target.clubId) {
      throw new ForbiddenException('You can only view profiles of club members');
    }

    // Get activity count
    const activityCount = await this.prisma.activityLog.count({
      where: { userId: targetUserId },
    });

    // Calculate streak (same logic as dashboard)
    const currentStreak = await this.calculateStreak(targetUserId);

    const avgPointsPerActivity = activityCount > 0
      ? Math.round(target.totalPoints / activityCount)
      : 0;

    return {
      id: target.id,
      name: target.name,
      avatarUrl: target.image ?? null,
      role: target.role as unknown as Role,
      totalPoints: target.totalPoints,
      activityCount,
      currentStreak,
      avgPointsPerActivity,
      memberSince: target.createdAt.toISOString(),
    };
  }

  private async calculateStreak(userId: string): Promise<number> {
    const logs = await this.prisma.activityLog.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    if (logs.length === 0) return 0;

    const uniqueDates = [
      ...new Set(
        logs.map((log) => {
          const d = new Date(log.createdAt);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }),
      ),
    ];

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const current = new Date(uniqueDates[i - 1]);
      const prev = new Date(uniqueDates[i]);
      const diffDays = Math.round((current.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
