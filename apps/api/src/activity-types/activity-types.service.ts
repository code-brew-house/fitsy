import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityTypeDto, UpdateActivityTypeDto } from '@fitsy/shared';

@Injectable()
export class ActivityTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(familyId: string) {
    return this.prisma.activityType.findMany({
      where: { familyId, isActive: true },
    });
  }

  async create(familyId: string, dto: CreateActivityTypeDto) {
    return this.prisma.activityType.create({
      data: { ...dto, familyId },
    });
  }

  async update(familyId: string, id: string, dto: UpdateActivityTypeDto) {
    const activityType = await this.prisma.activityType.findUnique({
      where: { id },
    });
    if (!activityType || activityType.familyId !== familyId) {
      throw new NotFoundException('Activity type not found');
    }

    return this.prisma.activityType.update({
      where: { id },
      data: dto,
    });
  }

  async remove(familyId: string, id: string) {
    const activityType = await this.prisma.activityType.findUnique({
      where: { id },
    });
    if (!activityType || activityType.familyId !== familyId) {
      throw new NotFoundException('Activity type not found');
    }

    return this.prisma.activityType.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
