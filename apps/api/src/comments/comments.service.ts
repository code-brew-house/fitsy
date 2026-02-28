import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from '@fitsy/shared';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async findByActivityLog(activityLogId: string, requesterId: string) {
    await this.verifyFamilyAccess(activityLogId, requesterId);

    const comments = await this.prisma.comment.findMany({
      where: { activityLogId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return comments.map((c) => ({
      id: c.id,
      userId: c.userId,
      userName: c.user.name,
      text: c.text,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async create(activityLogId: string, userId: string, dto: CreateCommentDto) {
    await this.verifyFamilyAccess(activityLogId, userId);

    const comment = await this.prisma.comment.create({
      data: {
        activityLogId,
        userId,
        text: dto.text,
      },
      include: { user: { select: { name: true } } },
    });

    return {
      id: comment.id,
      userId: comment.userId,
      userName: comment.user.name,
      text: comment.text,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId)
      throw new ForbiddenException('Not your comment');

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { text: dto.text },
      include: { user: { select: { name: true } } },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      userName: updated.user.name,
      text: updated.text,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId)
      throw new ForbiddenException('Not your comment');

    await this.prisma.comment.delete({ where: { id: commentId } });
  }

  private async verifyFamilyAccess(activityLogId: string, userId: string) {
    const log = await this.prisma.activityLog.findUnique({
      where: { id: activityLogId },
      include: { user: { select: { familyId: true } } },
    });
    if (!log) throw new NotFoundException('Activity log not found');

    const requester = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!requester || requester.familyId !== log.user.familyId) {
      throw new ForbiddenException('Not in the same family');
    }
  }
}
