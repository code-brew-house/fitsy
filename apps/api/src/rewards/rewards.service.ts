import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRewardDto, UpdateRewardDto } from '@fitsy/shared';

@Injectable()
export class RewardsService {
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

  async findAll(familyId: string) {
    return this.prisma.reward.findMany({
      where: { familyId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(familyId: string, dto: CreateRewardDto) {
    return this.prisma.reward.create({
      data: {
        familyId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        pointCost: dto.pointCost,
        quantity: dto.quantity,
      },
    });
  }

  async update(familyId: string, id: string, dto: UpdateRewardDto) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward || reward.familyId !== familyId) {
      throw new NotFoundException('Reward not found');
    }
    return this.prisma.reward.update({
      where: { id },
      data: dto,
    });
  }

  async remove(familyId: string, id: string) {
    const reward = await this.prisma.reward.findUnique({ where: { id } });
    if (!reward || reward.familyId !== familyId) {
      throw new NotFoundException('Reward not found');
    }
    return this.prisma.reward.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getFamilyIdForUser(userId: string): Promise<string> {
    return this.getUserFamilyId(userId);
  }
}
