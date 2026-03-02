import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRedemptionDto } from '@fitsy/shared';

@Injectable()
export class RedemptionsService {
  constructor(private prisma: PrismaService) {}

  private async getUserClubId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true },
    });
    if (!user || !user.clubId) {
      throw new ForbiddenException('User is not part of a club');
    }
    return user.clubId;
  }

  async create(userId: string, dto: CreateRedemptionDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, totalPoints: true, clubId: true },
      });
      if (!user) throw new NotFoundException('User not found');

      const reward = await tx.reward.findUnique({
        where: { id: dto.rewardId },
      });
      if (!reward || !reward.isActive) throw new NotFoundException('Reward not found');
      if (reward.clubId !== user.clubId) throw new NotFoundException('Reward not found');
      if (user.totalPoints < reward.pointCost) throw new BadRequestException('Insufficient points');
      if (reward.quantity !== null && reward.quantity <= 0) throw new BadRequestException('Reward out of stock');

      const redemption = await tx.redemption.create({
        data: {
          userId,
          rewardId: dto.rewardId,
          pointsSpent: reward.pointCost,
          status: 'PENDING',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { totalPoints: { decrement: reward.pointCost } },
      });

      if (reward.quantity !== null) {
        const updated = await tx.reward.updateMany({
          where: { id: dto.rewardId, quantity: { gt: 0 } },
          data: { quantity: { decrement: 1 } },
        });
        if (updated.count === 0) {
          throw new BadRequestException('Reward out of stock');
        }
      }

      const creator = await tx.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      return {
        ...redemption,
        rewardName: reward.name,
        userName: creator?.name ?? '',
      };
    });
  }

  async findOwn(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const redemptions = await this.prisma.redemption.findMany({
      where: { userId },
      include: {
        reward: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return redemptions.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: user?.name ?? '',
      rewardId: r.rewardId,
      rewardName: r.reward.name,
      pointsSpent: r.pointsSpent,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async findAll(clubId: string) {
    const redemptions = await this.prisma.redemption.findMany({
      where: {
        reward: { clubId },
      },
      include: {
        user: { select: { name: true } },
        reward: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return redemptions.map((r) => ({
      id: r.id,
      userId: r.userId,
      userName: r.user.name,
      rewardId: r.rewardId,
      rewardName: r.reward.name,
      pointsSpent: r.pointsSpent,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async fulfill(clubId: string, redemptionId: string) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { clubId: true } } },
    });
    if (!redemption || redemption.reward.clubId !== clubId) {
      throw new NotFoundException('Redemption not found');
    }
    if (redemption.status !== 'PENDING') {
      throw new BadRequestException('Only pending redemptions can be fulfilled');
    }

    return this.prisma.redemption.update({
      where: { id: redemptionId },
      data: { status: 'FULFILLED' },
    });
  }

  async cancel(clubId: string, redemptionId: string) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { clubId: true } } },
    });
    if (!redemption || redemption.reward.clubId !== clubId) {
      throw new NotFoundException('Redemption not found');
    }
    if (redemption.status !== 'PENDING') {
      throw new BadRequestException('Only pending redemptions can be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.redemption.update({
        where: { id: redemptionId },
        data: { status: 'CANCELLED' },
      });

      await tx.user.update({
        where: { id: redemption.userId },
        data: { totalPoints: { increment: redemption.pointsSpent } },
      });

      return updated;
    });
  }

  async getClubIdForUser(userId: string): Promise<string> {
    return this.getUserClubId(userId);
  }
}
