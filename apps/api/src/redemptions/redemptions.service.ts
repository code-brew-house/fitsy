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

  private async getUserFamilyId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyId: true },
    });
    if (!user || !user.familyId) {
      throw new ForbiddenException('User is not part of a family');
    }
    return user.familyId;
  }

  async create(userId: string, dto: CreateRedemptionDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, totalPoints: true, familyId: true },
      });
      if (!user) throw new NotFoundException('User not found');

      const reward = await tx.reward.findUnique({
        where: { id: dto.rewardId },
      });
      if (!reward || !reward.isActive) throw new NotFoundException('Reward not found');
      if (reward.familyId !== user.familyId) throw new NotFoundException('Reward not found');
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
        await tx.reward.update({
          where: { id: dto.rewardId },
          data: { quantity: { decrement: 1 } },
        });
      }

      return {
        ...redemption,
        rewardName: reward.name,
        userName: '',
      };
    });
  }

  async findOwn(userId: string) {
    return this.prisma.redemption.findMany({
      where: { userId },
      include: {
        reward: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(familyId: string) {
    return this.prisma.redemption.findMany({
      where: {
        reward: { familyId },
      },
      include: {
        user: { select: { name: true } },
        reward: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fulfill(familyId: string, redemptionId: string) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { familyId: true } } },
    });
    if (!redemption || redemption.reward.familyId !== familyId) {
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

  async cancel(familyId: string, redemptionId: string) {
    const redemption = await this.prisma.redemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { familyId: true } } },
    });
    if (!redemption || redemption.reward.familyId !== familyId) {
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

  async getFamilyIdForUser(userId: string): Promise<string> {
    return this.getUserFamilyId(userId);
  }
}
