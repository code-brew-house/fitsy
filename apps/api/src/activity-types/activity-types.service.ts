import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityTypeDto, UpdateActivityTypeDto } from '@fitsy/shared';

@Injectable()
export class ActivityTypesService {
  constructor(private prisma: PrismaService) {}

  async findAll(clubId: string, includeInactive: boolean = false) {
    const where: any = { clubId };
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.prisma.activityType.findMany({ where, orderBy: { createdAt: 'asc' } });
  }

  async create(clubId: string, dto: CreateActivityTypeDto) {
    return this.prisma.activityType.create({
      data: { ...dto, clubId },
    });
  }

  async update(clubId: string, id: string, dto: UpdateActivityTypeDto) {
    const activityType = await this.prisma.activityType.findUnique({
      where: { id },
    });
    if (!activityType || activityType.clubId !== clubId) {
      throw new NotFoundException('Activity type not found');
    }

    return this.prisma.activityType.update({
      where: { id },
      data: dto,
    });
  }

  async remove(clubId: string, id: string) {
    const activityType = await this.prisma.activityType.findUnique({
      where: { id },
    });
    if (!activityType || activityType.clubId !== clubId) {
      throw new NotFoundException('Activity type not found');
    }

    return this.prisma.activityType.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
