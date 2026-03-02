import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRewardDto, UpdateRewardDto } from '@fitsy/shared';

@Injectable()
export class RewardsService {
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

  async findAll(clubId: string, includeInactive: boolean = false) {
    const where: any = { clubId };
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.prisma.reward.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async create(clubId: string, dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        clubId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        pointCost: dto.pointCost,
        quantity: dto.quantity,
      },
    });
  }

  async update(clubId: string, id: string, dto: UpdateRewardDto) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward || reward.clubId !== clubId) {
      throw new NotFoundException('Reward not found');
    }
    return this.prisma.reward.update({
      where: { id },
      data: dto,
    });
  }

  async remove(clubId: string, id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward || reward.clubId !== clubId) {
      throw new NotFoundException('Reward not found');
    }
    return this.prisma.reward.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getClubIdForUser(userId: string): Promise<string> {
    return this.getUserClubId(userId);
  }
}
