import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { family: true },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.image,
      role: user.role,
      familyId: user.familyId,
      totalPoints: user.totalPoints,
      createdAt: user.createdAt.toISOString(),
      family: user.family
        ? {
            id: user.family.id,
            name: user.family.name,
            inviteCode: user.family.inviteCode,
            createdAt: user.family.createdAt.toISOString(),
          }
        : null,
    };
  }
}
