import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToggleReactionDto } from '@fitsy/shared';

@Injectable()
export class ReactionsService {
  constructor(private prisma: PrismaService) {}

  async toggle(activityLogId: string, userId: string, dto: ToggleReactionDto) {
    await this.verifyFamilyAccess(activityLogId, userId);

    const existing = await this.prisma.reaction.findUnique({
      where: {
        activityLogId_userId_emoji: {
          activityLogId,
          userId,
          emoji: dto.emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.reaction.delete({ where: { id: existing.id } });
      return { added: false };
    }

    await this.prisma.reaction.create({
      data: { activityLogId, userId, emoji: dto.emoji },
    });
    return { added: true };
  }

  async getSummary(activityLogId: string, userId: string) {
    await this.verifyFamilyAccess(activityLogId, userId);

    const reactions = await this.prisma.reaction.findMany({
      where: { activityLogId },
    });

    const emojiMap = new Map<
      string,
      { count: number; userReacted: boolean }
    >();
    for (const r of reactions) {
      const existing = emojiMap.get(r.emoji) || {
        count: 0,
        userReacted: false,
      };
      existing.count++;
      if (r.userId === userId) existing.userReacted = true;
      emojiMap.set(r.emoji, existing);
    }

    return {
      reactions: Array.from(emojiMap.entries()).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        userReacted: data.userReacted,
      })),
    };
  }

  async getReactionSummariesForLogs(logIds: string[], userId: string) {
    const reactions = await this.prisma.reaction.findMany({
      where: { activityLogId: { in: logIds } },
    });

    const map = new Map<
      string,
      Map<string, { count: number; userReacted: boolean }>
    >();
    for (const r of reactions) {
      if (!map.has(r.activityLogId))
        map.set(r.activityLogId, new Map());
      const emojiMap = map.get(r.activityLogId)!;
      const existing = emojiMap.get(r.emoji) || {
        count: 0,
        userReacted: false,
      };
      existing.count++;
      if (r.userId === userId) existing.userReacted = true;
      emojiMap.set(r.emoji, existing);
    }

    const result: Record<
      string,
      Array<{ emoji: string; count: number; userReacted: boolean }>
    > = {};
    for (const logId of logIds) {
      const emojiMap = map.get(logId);
      result[logId] = emojiMap
        ? Array.from(emojiMap.entries()).map(([emoji, data]) => ({
            emoji,
            count: data.count,
            userReacted: data.userReacted,
          }))
        : [];
    }
    return result;
  }

  private async verifyFamilyAccess(activityLogId: string, userId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: activityLogId },
      include: { user: { select: { clubId: true } } },
    });
    if (!log) throw new NotFoundException('Activity log not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true },
    });
    if (!requester || requester.clubId !== log.user.clubId) {
      throw new ForbiddenException('Not in the same club');
    }
  }
}
